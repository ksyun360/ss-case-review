import { createHash } from 'node:crypto';
import { readFile, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createCase, findOriginalReference } from '@record-review/case-repository/cases';
import { readOriginal } from '@record-review/record-storage/originals';
import { expect, test } from 'vitest';
import { storeOriginalForReviewer } from '../src/original-ingestion.ts';

async function migrateForTest(database: PGlite) {
  for (const migration of [
    '202609230001_initial_case_metadata.sql',
    '202609230002_original_upload_attempts.sql',
  ]) {
    await database.exec(
      await readFile(
        new URL(`../../case-repository/migrations/${migration}`, import.meta.url),
        'utf8',
      ),
    );
  }
}

test('stores a synthetic original under a server-generated version and member-scoped reference', async () => {
  const database = await PGlite.create();
  const root = await mkdtemp(join(tmpdir(), 'record-review-ingestion-test-'));
  const caseId = '00000000-0000-4000-8000-000000000001';
  const reviewerId = '00000000-0000-4000-8000-000000000011';
  try {
    await migrateForTest(database);
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
}, 15_000);

test('rejects a non-member before consuming or publishing original bytes', async () => {
  const database = await PGlite.create();
  const root = await mkdtemp(join(tmpdir(), 'record-review-ingestion-test-'));
  const caseId = '00000000-0000-4000-8000-000000000002';
  const reviewerId = '00000000-0000-4000-8000-000000000011';
  const otherReviewerId = '00000000-0000-4000-8000-000000000012';
  let consumed = false;
  try {
    await migrateForTest(database);
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
}, 15_000);

test('removes an unpublished original when membership ends during its stream', async () => {
  const database = await PGlite.create();
  const root = await mkdtemp(join(tmpdir(), 'record-review-ingestion-test-'));
  const caseId = '00000000-0000-4000-8000-000000000003';
  const reviewerId = '00000000-0000-4000-8000-000000000011';
  try {
    await migrateForTest(database);
    await createCase(database, { caseId, label: 'Revoked case', reviewerId });
    async function* chunks() {
      await database.query('DELETE FROM case_memberships WHERE case_id = $1 AND reviewer_id = $2', [
        caseId,
        reviewerId,
      ]);
      yield Buffer.from('private');
    }
    expect(
      await storeOriginalForReviewer(database, reviewerId, caseId, root, chunks(), 100),
    ).toBeUndefined();
    const caseDirectory = join(root, createHash('sha256').update(caseId).digest('hex'));
    expect(await readdir(caseDirectory)).toEqual([]);
    expect((await database.query('SELECT * FROM original_references')).rows).toEqual([]);
  } finally {
    await database.close();
    await rm(root, { recursive: true, force: true });
  }
}, 15_000);

test('removes a published original when reference registration fails', async () => {
  const database = await PGlite.create();
  const root = await mkdtemp(join(tmpdir(), 'record-review-ingestion-test-'));
  const caseId = '00000000-0000-4000-8000-000000000004';
  const reviewerId = '00000000-0000-4000-8000-000000000011';
  try {
    await migrateForTest(database);
    await createCase(database, { caseId, label: 'Failed registration case', reviewerId });
    async function* chunks() {
      await database.exec(
        'ALTER TABLE original_references ADD CONSTRAINT synthetic_registration_failure CHECK (false)',
      );
      yield Buffer.from('private');
    }
    await expect(
      storeOriginalForReviewer(database, reviewerId, caseId, root, chunks(), 100),
    ).rejects.toMatchObject({ code: '23514' });
    const caseDirectory = join(root, createHash('sha256').update(caseId).digest('hex'));
    expect(await readdir(caseDirectory)).toEqual([]);
    expect((await database.query('SELECT * FROM original_references')).rows).toEqual([]);
  } finally {
    await database.close();
    await rm(root, { recursive: true, force: true });
  }
}, 15_000);

test('reserves an upload attempt before consuming original bytes', async () => {
  const database = await PGlite.create();
  const root = await mkdtemp(join(tmpdir(), 'record-review-ingestion-test-'));
  const caseId = '00000000-0000-4000-8000-000000000005';
  const reviewerId = '00000000-0000-4000-8000-000000000011';
  let observedVersionId: string | undefined;
  try {
    await migrateForTest(database);
    await createCase(database, { caseId, reviewerId, label: 'Journaled upload case' });
    async function* chunks() {
      const result = await database.query<{
        document_version_id: string;
        maximum_bytes: number;
        state: string;
      }>(
        'SELECT document_version_id, maximum_bytes::float8 AS maximum_bytes, state FROM original_upload_attempts',
      );
      expect(result.rows).toEqual([
        { document_version_id: expect.any(String), maximum_bytes: 3, state: 'receiving' },
      ]);
      observedVersionId = result.rows[0]?.document_version_id;
      yield Buffer.from('abc');
    }
    const reference = await storeOriginalForReviewer(
      database,
      reviewerId,
      caseId,
      root,
      chunks(),
      3,
    );
    expect(reference?.documentVersionId).toBe(observedVersionId);
  } finally {
    await database.close();
    await rm(root, { recursive: true, force: true });
  }
}, 15_000);

test('registers a received original and closes its journal attempt', async () => {
  const database = await PGlite.create();
  const root = await mkdtemp(join(tmpdir(), 'record-review-ingestion-test-'));
  const caseId = '00000000-0000-4000-8000-000000000006';
  const reviewerId = '00000000-0000-4000-8000-000000000011';
  try {
    await migrateForTest(database);
    await createCase(database, { caseId, reviewerId, label: 'Completed upload case' });
    async function* chunks() {
      yield Buffer.from('abc');
    }
    const reference = await storeOriginalForReviewer(
      database,
      reviewerId,
      caseId,
      root,
      chunks(),
      3,
    );
    expect(reference).toBeDefined();
    expect(
      (
        await database.query(
          'SELECT state FROM original_upload_attempts WHERE case_id = $1 AND document_version_id = $2',
          [caseId, reference?.documentVersionId],
        )
      ).rows,
    ).toEqual([{ state: 'registered' }]);
    expect(
      (await database.query('SELECT count(*)::int AS count FROM original_references')).rows,
    ).toEqual([{ count: 1 }]);
  } finally {
    await database.close();
    await rm(root, { recursive: true, force: true });
  }
}, 15_000);

test('marks an interrupted original stream failed without publishing partial bytes', async () => {
  const database = await PGlite.create();
  const root = await mkdtemp(join(tmpdir(), 'record-review-ingestion-test-'));
  const caseId = '00000000-0000-4000-8000-000000000007';
  const reviewerId = '00000000-0000-4000-8000-000000000011';
  const failure = new Error('Synthetic interrupted source');
  try {
    await migrateForTest(database);
    await createCase(database, { caseId, reviewerId, label: 'Interrupted stream case' });
    async function* chunks() {
      yield Buffer.from('a');
      throw failure;
    }
    await expect(
      storeOriginalForReviewer(database, reviewerId, caseId, root, chunks(), 3),
    ).rejects.toBe(failure);
    expect((await database.query('SELECT state FROM original_upload_attempts')).rows).toEqual([
      { state: 'failed' },
    ]);
    expect((await database.query('SELECT * FROM original_references')).rows).toEqual([]);
    const caseDirectory = join(root, createHash('sha256').update(caseId).digest('hex'));
    expect(await readdir(caseDirectory)).toEqual([]);
  } finally {
    await database.close();
    await rm(root, { recursive: true, force: true });
  }
}, 15_000);

test('marks a revoked upload failed after discarding its published bytes', async () => {
  const database = await PGlite.create();
  const root = await mkdtemp(join(tmpdir(), 'record-review-ingestion-test-'));
  const caseId = '00000000-0000-4000-8000-000000000008';
  const reviewerId = '00000000-0000-4000-8000-000000000011';
  try {
    await migrateForTest(database);
    await createCase(database, { caseId, reviewerId, label: 'Revoked upload case' });
    async function* chunks() {
      await database.query('DELETE FROM case_memberships WHERE case_id = $1 AND reviewer_id = $2', [
        caseId,
        reviewerId,
      ]);
      yield Buffer.from('private');
    }
    expect(
      await storeOriginalForReviewer(database, reviewerId, caseId, root, chunks(), 100),
    ).toBeUndefined();
    expect((await database.query('SELECT state FROM original_upload_attempts')).rows).toEqual([
      { state: 'failed' },
    ]);
    const caseDirectory = join(root, createHash('sha256').update(caseId).digest('hex'));
    expect(await readdir(caseDirectory)).toEqual([]);
    expect((await database.query('SELECT * FROM original_references')).rows).toEqual([]);
  } finally {
    await database.close();
    await rm(root, { recursive: true, force: true });
  }
}, 15_000);

test('marks a registration-error attempt failed after discarding its bytes', async () => {
  const database = await PGlite.create();
  const root = await mkdtemp(join(tmpdir(), 'record-review-ingestion-test-'));
  const caseId = '00000000-0000-4000-8000-000000000009';
  const reviewerId = '00000000-0000-4000-8000-000000000011';
  try {
    await migrateForTest(database);
    await createCase(database, { caseId, reviewerId, label: 'Failed completion case' });
    async function* chunks() {
      await database.exec(
        'ALTER TABLE original_references ADD CONSTRAINT synthetic_completion_failure CHECK (false)',
      );
      yield Buffer.from('private');
    }
    await expect(
      storeOriginalForReviewer(database, reviewerId, caseId, root, chunks(), 100),
    ).rejects.toMatchObject({ code: '23514' });
    expect((await database.query('SELECT state FROM original_upload_attempts')).rows).toEqual([
      { state: 'failed' },
    ]);
    const caseDirectory = join(root, createHash('sha256').update(caseId).digest('hex'));
    expect(await readdir(caseDirectory)).toEqual([]);
    expect((await database.query('SELECT * FROM original_references')).rows).toEqual([]);
  } finally {
    await database.close();
    await rm(root, { recursive: true, force: true });
  }
}, 15_000);
