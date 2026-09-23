import { readFile, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createCase, findOriginalReference } from '@record-review/case-repository/cases';
import { readOriginal } from '@record-review/record-storage/originals';
import { expect, test } from 'vitest';
import { storeOriginalForReviewer } from '../src/original-ingestion.ts';

test('stores a synthetic original under a server-generated version and member-scoped reference', async () => {
  const database = await PGlite.create();
  const root = await mkdtemp(join(tmpdir(), 'record-review-ingestion-test-'));
  const caseId = '00000000-0000-4000-8000-000000000001';
  const reviewerId = '00000000-0000-4000-8000-000000000011';
  try {
    await database.exec(
      await readFile(
        new URL(
          '../../case-repository/migrations/202609230001_initial_case_metadata.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    await createCase(database, { caseId, label: 'Synthetic case', reviewerId });
    async function* chunks() {
      yield Buffer.from('ab');
      yield Buffer.from('c');
    }
    const reference = await storeOriginalForReviewer(
      database,
      reviewerId,
      caseId,
      root,
      chunks(),
      3,
    );
    if (!reference) throw new Error('Expected a registered original');
    expect(reference).toEqual({
      caseId,
      documentVersionId: expect.stringMatching(/^[a-f0-9-]{36}$/),
      sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      byteLength: 3,
    });
    expect(
      await findOriginalReference(database, reviewerId, caseId, reference.documentVersionId),
    ).toEqual(reference);
    expect(await readOriginal(root, caseId, reference)).toEqual(Buffer.from('abc'));
  } finally {
    await database.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects a non-member before consuming or publishing original bytes', async () => {
  const database = await PGlite.create();
  const root = await mkdtemp(join(tmpdir(), 'record-review-ingestion-test-'));
  const caseId = '00000000-0000-4000-8000-000000000002';
  const reviewerId = '00000000-0000-4000-8000-000000000011';
  const otherReviewerId = '00000000-0000-4000-8000-000000000012';
  let consumed = false;
  try {
    await database.exec(
      await readFile(
        new URL(
          '../../case-repository/migrations/202609230001_initial_case_metadata.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    await createCase(database, {
      caseId,
      label: 'Other reviewer case',
      reviewerId: otherReviewerId,
    });
    async function* chunks() {
      consumed = true;
      yield Buffer.from('private');
    }
    expect(
      await storeOriginalForReviewer(database, reviewerId, caseId, root, chunks(), 100),
    ).toBeUndefined();
    expect(consumed).toBe(false);
    expect(await readdir(root)).toEqual([]);
    expect((await database.query('SELECT * FROM original_references')).rows).toEqual([]);
  } finally {
    await database.close();
    await rm(root, { recursive: true, force: true });
  }
});
