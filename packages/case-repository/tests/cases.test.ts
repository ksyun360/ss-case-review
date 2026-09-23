import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import {
  createCase,
  findOriginalReference,
  installCaseSchema,
  listCasesForReviewer,
  registerOriginalReference,
} from '../src/cases.ts';

let database: PGlite;
const caseId = '00000000-0000-4000-8000-000000000001';
const reviewerId = '00000000-0000-4000-8000-000000000011';
const input = { caseId, reviewerId, label: 'Synthetic case A' };
const original = {
  caseId,
  documentVersionId: '00000000-0000-4000-8000-000000000021',
  sha256: 'a'.repeat(64),
  byteLength: 2_147_483_648,
};

beforeAll(async () => {
  database = await PGlite.create();
});

beforeEach(async () => {
  await database.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await installCaseSchema(database);
});

afterAll(async () => {
  await database.close();
});

test('creates a case with its initial revision and creator membership', async () => {
  expect(await createCase(database, input)).toEqual({
    caseId,
    label: 'Synthetic case A',
    recordRevision: 1,
  });
  const membership = await database.query('SELECT case_id, reviewer_id FROM case_memberships');
  expect(membership.rows).toEqual([{ case_id: caseId, reviewer_id: reviewerId }]);
});

test('rejects a duplicate case identity without changing the original case or membership', async () => {
  await createCase(database, input);
  await expect(
    createCase(database, {
      ...input,
      label: 'Replacement case',
      reviewerId: '00000000-0000-4000-8000-000000000012',
    }),
  ).rejects.toMatchObject({ code: '23505' });
  expect((await database.query('SELECT * FROM cases')).rows).toEqual([
    { case_id: caseId, label: input.label, record_revision: 1 },
  ]);
  expect((await database.query('SELECT * FROM case_memberships')).rows).toEqual([
    { case_id: caseId, reviewer_id: reviewerId },
  ]);
});

test('rejects membership in a nonexistent case', async () => {
  await expect(
    database.query('INSERT INTO case_memberships (case_id, reviewer_id) VALUES ($1, $2)', [
      caseId,
      reviewerId,
    ]),
  ).rejects.toMatchObject({ code: '23503' });
  expect((await database.query('SELECT * FROM case_memberships')).rows).toEqual([]);
});

test('rejects duplicate membership for the same case and reviewer', async () => {
  await createCase(database, input);
  await expect(
    database.query('INSERT INTO case_memberships (case_id, reviewer_id) VALUES ($1, $2)', [
      caseId,
      reviewerId,
    ]),
  ).rejects.toMatchObject({ code: '23505' });
  expect((await database.query('SELECT * FROM case_memberships')).rows).toEqual([
    { case_id: caseId, reviewer_id: reviewerId },
  ]);
});

test('rolls back case creation when the creator membership cannot be inserted', async () => {
  await database.exec(
    'ALTER TABLE case_memberships ADD CONSTRAINT synthetic_membership_failure CHECK (false)',
  );
  await expect(createCase(database, input)).rejects.toMatchObject({ code: '23514' });
  expect((await database.query('SELECT * FROM cases')).rows).toEqual([]);
  expect((await database.query('SELECT * FROM case_memberships')).rows).toEqual([]);
});

test('lists only the reviewer cases in stable case identity order', async () => {
  const secondCase = '00000000-0000-4000-8000-000000000002';
  const otherReviewer = '00000000-0000-4000-8000-000000000012';
  await createCase(database, { ...input, caseId: secondCase, label: 'Synthetic case B' });
  await createCase(database, input);
  await createCase(database, {
    caseId: '00000000-0000-4000-8000-000000000003',
    reviewerId: otherReviewer,
    label: 'Other reviewer case',
  });
  await database.query('INSERT INTO case_memberships (case_id, reviewer_id) VALUES ($1, $2)', [
    caseId,
    otherReviewer,
  ]);
  expect(await listCasesForReviewer(database, reviewerId)).toEqual([
    { caseId, label: input.label, recordRevision: 1 },
    { caseId: secondCase, label: 'Synthetic case B', recordRevision: 1 },
  ]);
});

test('returns no cases for a reviewer without case membership', async () => {
  await createCase(database, input);
  expect(await listCasesForReviewer(database, '00000000-0000-4000-8000-000000000012')).toEqual([]);
});

test('registers original metadata for a case member without truncating the byte length', async () => {
  await createCase(database, input);
  expect(await registerOriginalReference(database, reviewerId, original)).toEqual(original);
  expect(
    (
      await database.query(`SELECT case_id, document_version_id, sha256,
        byte_length::text AS byte_length FROM original_references`)
    ).rows,
  ).toEqual([
    {
      case_id: caseId,
      document_version_id: original.documentVersionId,
      sha256: original.sha256,
      byte_length: '2147483648',
    },
  ]);
});

test('does not register original metadata when the reviewer belongs only to another case', async () => {
  await createCase(database, input);
  const otherReviewer = '00000000-0000-4000-8000-000000000012';
  await createCase(database, {
    ...input,
    caseId: '00000000-0000-4000-8000-000000000002',
    reviewerId: otherReviewer,
  });
  expect(await registerOriginalReference(database, otherReviewer, original)).toBeUndefined();
  expect((await database.query('SELECT * FROM original_references')).rows).toEqual([]);
});

test('rejects replacement metadata for an existing case document version', async () => {
  await createCase(database, input);
  await registerOriginalReference(database, reviewerId, original);
  await expect(
    registerOriginalReference(database, reviewerId, {
      ...original,
      sha256: 'b'.repeat(64),
      byteLength: 12,
    }),
  ).rejects.toMatchObject({ code: '23505' });
  expect(
    (await database.query('SELECT sha256, byte_length::text AS size FROM original_references'))
      .rows,
  ).toEqual([{ sha256: original.sha256, size: '2147483648' }]);
});

test('rejects an original reference without a parent case', async () => {
  await expect(
    database.query(
      `INSERT INTO original_references (case_id, document_version_id, sha256, byte_length)
      VALUES ($1, $2, $3, $4)`,
      [caseId, original.documentVersionId, original.sha256, original.byteLength],
    ),
  ).rejects.toMatchObject({ code: '23503' });
  expect((await database.query('SELECT * FROM original_references')).rows).toEqual([]);
});

test('finds the exact original reference within the requested member case and version', async () => {
  await createCase(database, input);
  await registerOriginalReference(database, reviewerId, original);
  const secondCaseId = '00000000-0000-4000-8000-000000000002';
  await createCase(database, { ...input, caseId: secondCaseId });
  await registerOriginalReference(database, reviewerId, {
    ...original,
    caseId: secondCaseId,
    documentVersionId: '00000000-0000-4000-8000-000000000022',
    sha256: 'c'.repeat(64),
    byteLength: 12,
  });
  const target = { ...original, caseId: secondCaseId, sha256: 'b'.repeat(64), byteLength: 22 };
  await registerOriginalReference(database, reviewerId, target);
  expect(
    await findOriginalReference(database, reviewerId, secondCaseId, original.documentVersionId),
  ).toEqual(target);
});

test('does not disclose original metadata through membership in a different case', async () => {
  await createCase(database, input);
  await registerOriginalReference(database, reviewerId, original);
  const otherReviewer = '00000000-0000-4000-8000-000000000012';
  const otherCase = '00000000-0000-4000-8000-000000000002';
  await createCase(database, { ...input, caseId: otherCase, reviewerId: otherReviewer });
  await registerOriginalReference(database, otherReviewer, {
    ...original,
    caseId: otherCase,
    sha256: 'b'.repeat(64),
  });
  expect(
    await findOriginalReference(database, otherReviewer, caseId, original.documentVersionId),
  ).toBeUndefined();
});

test('rejects original byte lengths outside the JavaScript safe integer range', async () => {
  await createCase(database, input);
  await expect(
    registerOriginalReference(database, reviewerId, {
      ...original,
      byteLength: Number.MAX_SAFE_INTEGER + 1,
    }),
  ).rejects.toMatchObject({ code: '23514' });
  expect((await database.query('SELECT * FROM original_references')).rows).toEqual([]);
});

test('rejects negative original byte lengths', async () => {
  await createCase(database, input);
  await expect(
    registerOriginalReference(database, reviewerId, { ...original, byteLength: -1 }),
  ).rejects.toMatchObject({ code: '23514' });
  expect((await database.query('SELECT * FROM original_references')).rows).toEqual([]);
});
