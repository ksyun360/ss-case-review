import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createCase, registerOriginalReference } from '@record-review/case-repository/cases';
import { listTextSourcesForReviewer } from '@record-review/case-repository/source-units';
import { writeOriginal } from '@record-review/record-storage/originals';
import { expect, test, vi } from 'vitest';
import { processPdfOriginalForReviewer } from '../src/original-processing.ts';

test('publishes extracted PDF pages from verified original bytes and reports page gaps', async () => {
  const database = await PGlite.create();
  const root = await mkdtemp(join(tmpdir(), 'record-review-processing-test-'));
  const caseId = '00000000-0000-4000-8000-000000000001';
  const reviewerId = '00000000-0000-4000-8000-000000000011';
  const documentVersionId = '00000000-0000-4000-8000-000000000021';
  const sourceIds = [
    '00000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000032',
  ];
  const bytes = new TextEncoder().encode('%PDF-synthetic processing fixture');
  const unavailableInput = {
    database,
    reviewerId,
    caseId,
    documentVersionId,
    root,
    maximumBytes: bytes.byteLength,
    maximumPages: 3,
    extractionVersion: 'synthetic-native-v1',
    extractPages: vi.fn(),
    createSourceUnitId: vi.fn(),
  };
  try {
    for (const migration of [
      '202609230001_initial_case_metadata.sql',
      '202609280001_text_source_units.sql',
    ]) {
      const sql = await readFile(
        new URL(`../../case-repository/migrations/${migration}`, import.meta.url),
        'utf8',
      );
      await database.exec(sql.replace(/-- Down Migration[\s\S]*$/, ''));
    }
    const unavailableQueries = vi.spyOn(database, 'query');
    await expect(processPdfOriginalForReviewer(unavailableInput)).resolves.toEqual({
      status: 'original_unavailable',
    });
    expect(unavailableQueries).toHaveBeenCalledOnce();
    expect(unavailableQueries.mock.calls[0]?.[0]).toContain('FROM cases');
    unavailableQueries.mockRestore();
    await createCase(database, { caseId, reviewerId, label: 'Synthetic processing case' });
    await expect(processPdfOriginalForReviewer(unavailableInput)).resolves.toEqual({
      status: 'original_unavailable',
    });
    const reference = await writeOriginal(root, { caseId, documentVersionId }, bytes);
    await registerOriginalReference(database, reviewerId, reference);
    const extractPages = vi.fn(async (received: Uint8Array, maximumPages: number) => {
      expect([...received]).toEqual([...bytes]);
      expect(maximumPages).toBe(3);
      return [
        { status: 'extracted' as const, pageNumber: 1, rawText: 'First exact page' },
        {
          status: 'unavailable' as const,
          pageNumber: 2,
          reason: 'page_extraction_failed' as const,
        },
        { status: 'extracted' as const, pageNumber: 3, rawText: 'Third exact page' },
      ];
    });
    const createSourceUnitId = vi
      .fn<() => string>()
      .mockReturnValueOnce(sourceIds[0] as string)
      .mockReturnValueOnce(sourceIds[1] as string);

    await expect(
      processPdfOriginalForReviewer({
        ...unavailableInput,
        maximumBytes: bytes.byteLength - 1,
      }),
    ).rejects.toThrow('original_byte_budget_exceeded');

    const unsupportedVersionId = '00000000-0000-4000-8000-000000000022';
    const unsupported = await writeOriginal(
      root,
      { caseId, documentVersionId: unsupportedVersionId },
      new TextEncoder().encode('synthetic unsupported original'),
    );
    await registerOriginalReference(database, reviewerId, unsupported);
    await expect(
      processPdfOriginalForReviewer({
        ...unavailableInput,
        documentVersionId: unsupportedVersionId,
        maximumBytes: unsupported.byteLength,
      }),
    ).rejects.toThrow('unsupported_document_format');

    const rejectedExtraction = vi.fn(async () => {
      await database.query('DELETE FROM case_memberships WHERE case_id = $1 AND reviewer_id = $2', [
        caseId,
        reviewerId,
      ]);
      return [{ status: 'extracted' as const, pageNumber: 1, rawText: 'Revoked page' }];
    });
    await expect(
      processPdfOriginalForReviewer({
        ...unavailableInput,
        extractPages: rejectedExtraction,
        createSourceUnitId: () => '00000000-0000-4000-8000-000000000039',
      }),
    ).resolves.toEqual({ status: 'publication_rejected' });
    await database.query('INSERT INTO case_memberships (case_id, reviewer_id) VALUES ($1, $2)', [
      caseId,
      reviewerId,
    ]);

    await expect(
      processPdfOriginalForReviewer({
        ...unavailableInput,
        extractPages,
        createSourceUnitId,
      }),
    ).resolves.toEqual({
      status: 'published',
      sourceUnitIds: sourceIds,
      gaps: [{ pageNumber: 2, reason: 'page_extraction_failed' }],
    });
    expect(extractPages).toHaveBeenCalledOnce();
    expect(unavailableInput.extractPages).not.toHaveBeenCalled();
    expect(rejectedExtraction).toHaveBeenCalledOnce();
    expect(createSourceUnitId).toHaveBeenCalledTimes(2);
    expect(await listTextSourcesForReviewer(database, reviewerId, caseId)).toEqual([
      {
        sourceUnitId: sourceIds[0],
        caseId,
        documentVersionId,
        recordRevision: 1,
        documentSha256: reference.sha256,
        extractionVersion: 'synthetic-native-v1',
        pageNumber: 1,
      },
      {
        sourceUnitId: sourceIds[1],
        caseId,
        documentVersionId,
        recordRevision: 1,
        documentSha256: reference.sha256,
        extractionVersion: 'synthetic-native-v1',
        pageNumber: 3,
      },
    ]);
  } finally {
    await database.close();
    await rm(root, { recursive: true, force: true });
  }
}, 15_000);
