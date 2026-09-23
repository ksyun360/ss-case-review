import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { createCase, installCaseSchema } from '../src/cases.ts';

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
