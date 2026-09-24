import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { createCase } from '../src/cases.ts';
import {
  completeOriginalUpload,
  failOriginalUpload,
  listRecoverableOriginalUploads,
  reserveOriginalUpload,
} from '../src/upload-attempts.ts';

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
  const reference = {
    caseId,
    documentVersionId,
    sha256: 'a'.repeat(64),
    byteLength: 3,
  };
  expect(await completeOriginalUpload(database, reviewerId, reference)).toEqual(reference);
  expect((await database.query('SELECT state FROM original_upload_attempts')).rows).toEqual([
    { state: 'registered' },
  ]);
});

test('does not reserve an upload attempt for a reviewer outside the case', async () => {
  await createCase(database, {
    caseId,
    reviewerId: '00000000-0000-4000-8000-000000000012',
    label: 'Other reviewer case',
  });
  expect(
    await reserveOriginalUpload(database, {
      caseId,
      reviewerId,
      documentVersionId,
      maximumBytes: 16,
    }),
  ).toBeUndefined();
  expect((await database.query('SELECT * FROM original_upload_attempts')).rows).toEqual([]);
});

test('marks an interrupted reserved attempt failed without inventing an original reference', async () => {
  await createCase(database, { caseId, reviewerId, label: 'Interrupted upload case' });
  await reserveOriginalUpload(database, {
    caseId,
    reviewerId,
    documentVersionId,
    maximumBytes: 16,
  });
  expect(await failOriginalUpload(database, reviewerId, caseId, documentVersionId)).toEqual({
    caseId,
    documentVersionId,
    reviewerId,
    maximumBytes: 16,
    state: 'failed',
  });
  expect((await database.query('SELECT state FROM original_upload_attempts')).rows).toEqual([
    { state: 'failed' },
  ]);
  expect((await database.query('SELECT * FROM original_references')).rows).toEqual([]);
});

test('lists only stale receiving attempts in bounded recovery order', async () => {
  await createCase(database, { caseId, reviewerId, label: 'Recovery scan case' });
  const versions = [
    '00000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000022',
    '00000000-0000-4000-8000-000000000023',
    '00000000-0000-4000-8000-000000000024',
    '00000000-0000-4000-8000-000000000025',
  ] as const;
  for (const version of versions) {
    await reserveOriginalUpload(database, {
      caseId,
      reviewerId,
      documentVersionId: version,
      maximumBytes: 16,
    });
  }
  for (const [version, createdAt] of [
    [versions[0], '2026-08-01T00:00:00Z'],
    [versions[1], '2026-09-02T00:00:00Z'],
    [versions[2], '2026-07-01T00:00:00Z'],
    [versions[3], '2026-07-02T00:00:00Z'],
    [versions[4], '2026-08-02T00:00:00Z'],
  ]) {
    await database.query(
      'UPDATE original_upload_attempts SET created_at = $1 WHERE document_version_id = $2',
      [createdAt, version],
    );
  }
  await failOriginalUpload(database, reviewerId, caseId, versions[2]);
  await completeOriginalUpload(database, reviewerId, {
    caseId,
    documentVersionId: versions[3],
    sha256: 'a'.repeat(64),
    byteLength: 3,
  });
  expect(
    await listRecoverableOriginalUploads(database, new Date('2026-09-01T00:00:00Z'), 2),
  ).toEqual([
    { caseId, documentVersionId: versions[0], reviewerId, maximumBytes: 16, state: 'receiving' },
    { caseId, documentVersionId: versions[4], reviewerId, maximumBytes: 16, state: 'receiving' },
  ]);
});
