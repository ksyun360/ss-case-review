import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { createCase } from '../src/cases.ts';
import { reserveOriginalUpload } from '../src/upload-attempts.ts';

let database: PGlite;
const caseId = '00000000-0000-4000-8000-000000000001';
const reviewerId = '00000000-0000-4000-8000-000000000011';
const documentVersionId = '00000000-0000-4000-8000-000000000021';

beforeAll(async () => {
  database = await PGlite.create();
});

beforeEach(async () => {
  await database.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await database.exec(
    await readFile(
      new URL('../migrations/202609230001_initial_case_metadata.sql', import.meta.url),
      'utf8',
    ),
  );
  await database.exec(
    await readFile(
      new URL('../migrations/202609230002_original_upload_attempts.sql', import.meta.url),
      'utf8',
    ),
  );
});

afterAll(async () => {
  await database.close();
});

test('reserves a recoverable original attempt for a case member before file receipt', async () => {
  await createCase(database, { caseId, reviewerId, label: 'Synthetic upload case' });
  expect(
    await reserveOriginalUpload(database, {
      caseId,
      reviewerId,
      documentVersionId,
      maximumBytes: 16,
    }),
  ).toEqual({ caseId, documentVersionId, reviewerId, maximumBytes: 16, state: 'receiving' });
  expect(
    (
      await database.query(
        'SELECT case_id, document_version_id, reviewer_id, maximum_bytes::float8, state FROM original_upload_attempts',
      )
    ).rows,
  ).toEqual([
    {
      case_id: caseId,
      document_version_id: documentVersionId,
      reviewer_id: reviewerId,
      maximum_bytes: 16,
      state: 'receiving',
    },
  ]);
});
