import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { createCase, installCaseSchema, listCasesForReviewer } from '../src/cases.ts';

let database: PGlite;
const caseId = '00000000-0000-4000-8000-000000000001';
const reviewerId = '00000000-0000-4000-8000-000000000011';
const input = { caseId, reviewerId, label: 'Synthetic case A' };

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
