import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { createCase, registerOriginalReference } from '../src/cases.ts';
import {
  findOriginalDocumentMetadata,
  listOriginalDocumentMetadataForReviewer,
  registerOriginalDocumentMetadata,
} from '../src/original-document-metadata.ts';

let database: PGlite;
const caseId = '00000000-0000-0000-0000-000000000301';
const reviewerId = '00000000-0000-0000-0000-000000000311';
const otherReviewerId = '00000000-0000-0000-0000-000000000312';
const documentVersionId = '00000000-0000-0000-0000-000000000321';

beforeAll(async () => {
  database = await PGlite.create();
});

beforeEach(async () => {
  await database.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  for (const migration of [
    '202609230001_initial_case_metadata.sql',
    '202611010001_original_document_metadata.sql',
  ]) {
    const sql = await readFile(new URL(`../migrations/${migration}`, import.meta.url), 'utf8');
    await database.exec(sql.replace(/-- Down Migration[\s\S]*$/, ''));
  }
});

afterAll(async () => {
  await database.close();
});

test('stores bounded filename and media metadata only for the member original', async () => {
  await createCase(database, { caseId, reviewerId, label: 'Metadata case' });
  await registerOriginalReference(database, reviewerId, {
    caseId,
    documentVersionId,
    sha256: 'a'.repeat(64),
    byteLength: 3,
  });

  await expect(
    registerOriginalDocumentMetadata(database, reviewerId, {
      caseId,
      documentVersionId,
      fileName: '7-brief.pdf',
      mediaType: 'application/pdf',
    }),
  ).resolves.toEqual({
    caseId,
    documentVersionId,
    fileName: '7-brief.pdf',
    mediaType: 'application/pdf',
  });
  await expect(
    findOriginalDocumentMetadata(database, reviewerId, caseId, documentVersionId),
  ).resolves.toEqual({
    caseId,
    documentVersionId,
    fileName: '7-brief.pdf',
    mediaType: 'application/pdf',
  });
  await expect(
    findOriginalDocumentMetadata(database, otherReviewerId, caseId, documentVersionId),
  ).resolves.toBeUndefined();
});

test('lists metadata in document order only for the member case', async () => {
  const secondDocumentVersionId = '00000000-0000-0000-0000-000000000322';
  await createCase(database, { caseId, reviewerId, label: 'Metadata case' });
  await registerOriginalReference(database, reviewerId, {
    caseId,
    documentVersionId,
    sha256: 'a'.repeat(64),
    byteLength: 3,
  });
  await registerOriginalReference(database, reviewerId, {
    caseId,
    documentVersionId: secondDocumentVersionId,
    sha256: 'b'.repeat(64),
    byteLength: 4,
  });
  await registerOriginalDocumentMetadata(database, reviewerId, {
    caseId,
    documentVersionId: secondDocumentVersionId,
    fileName: '8-medical.pdf',
    mediaType: 'application/pdf',
  });
  await registerOriginalDocumentMetadata(database, reviewerId, {
    caseId,
    documentVersionId,
    fileName: '7-brief.pdf',
    mediaType: 'application/pdf',
  });

  await expect(
    listOriginalDocumentMetadataForReviewer(database, reviewerId, caseId),
  ).resolves.toEqual([
    {
      caseId,
      documentVersionId,
      fileName: '7-brief.pdf',
      mediaType: 'application/pdf',
    },
    {
      caseId,
      documentVersionId: secondDocumentVersionId,
      fileName: '8-medical.pdf',
      mediaType: 'application/pdf',
    },
  ]);
  await expect(
    listOriginalDocumentMetadataForReviewer(database, otherReviewerId, caseId),
  ).resolves.toEqual([]);
});
