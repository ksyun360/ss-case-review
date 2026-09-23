import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createCase } from '@record-review/case-repository/cases';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { createDevelopmentApi } from '../src/case-api.ts';

const environment = {
  APP_ENV: 'development',
  DATA_CLASSIFICATION: 'synthetic',
  AUTH_MODE: 'development',
  BIND_ADDRESS: '127.0.0.1',
};
const reviewerId = '00000000-0000-4000-8000-000000000011';
const otherReviewerId = '00000000-0000-4000-8000-000000000012';
let database: PGlite;
let api: ReturnType<typeof createDevelopmentApi>;

beforeAll(async () => {
  database = await PGlite.create();
});
beforeEach(async () => {
  await database.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await database.exec(
    await readFile(
      new URL(
        '../../case-repository/migrations/202609230001_initial_case_metadata.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  api = createDevelopmentApi(environment, database);
});
afterEach(async () => {
  await api.close();
});
afterAll(async () => {
  await database.close();
});

test('lists only server-selected reviewer cases despite request identity claims', async () => {
  const visible = {
    caseId: '00000000-0000-4000-8000-000000000001',
    label: 'Synthetic visible case',
    reviewerId,
  };
  await createCase(database, visible);
  await createCase(database, {
    caseId: '00000000-0000-4000-8000-000000000002',
    label: 'Synthetic other reviewer case',
    reviewerId: otherReviewerId,
  });
  const response = await api.inject({
    method: 'GET',
    url: `/api/v1/cases?reviewerId=${otherReviewerId}`,
    headers: { 'x-reviewer-id': otherReviewerId },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({
    cases: [{ caseId: visible.caseId, label: visible.label, recordRevision: 1 }],
  });
});

test('creates a synthetic draft with a server-generated identity and creator membership', async () => {
  const response = await api.inject({
    method: 'POST',
    url: '/api/v1/cases',
    payload: { label: '  Synthetic draft  ' },
  });
  expect(response.statusCode).toBe(201);
  const body = response.json<{ case: { caseId: string; label: string; recordRevision: number } }>();
  expect(body).toEqual({
    case: {
      caseId: expect.stringMatching(
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
      ),
      label: 'Synthetic draft',
      recordRevision: 1,
    },
  });
  expect((await database.query('SELECT case_id, reviewer_id FROM case_memberships')).rows).toEqual([
    { case_id: body.case.caseId, reviewer_id: reviewerId },
  ]);
  expect((await api.inject('/api/v1/cases')).json()).toEqual({ cases: [body.case] });
});

test('returns a safe failure when case creation rolls back in the database', async () => {
  await database.exec(
    'ALTER TABLE case_memberships ADD CONSTRAINT synthetic_private_failure CHECK (false)',
  );
  const response = await api.inject({
    method: 'POST',
    url: '/api/v1/cases',
    payload: { label: 'Synthetic rejected draft' },
  });
  expect(response.statusCode).toBe(503);
  expect(response.json()).toEqual({ code: 'case_service_unavailable' });
  expect((await database.query('SELECT * FROM cases')).rows).toEqual([]);
  expect((await database.query('SELECT * FROM case_memberships')).rows).toEqual([]);
});

test('rejects a numeric case label without coercion or database writes', async () => {
  const response = await api.inject({
    method: 'POST',
    url: '/api/v1/cases',
    payload: { label: 123 },
  });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ code: 'invalid_request' });
  expect((await database.query('SELECT * FROM cases')).rows).toEqual([]);
});

test('rejects case creation without a label', async () => {
  const response = await api.inject({ method: 'POST', url: '/api/v1/cases', payload: {} });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ code: 'invalid_request' });
  expect((await database.query('SELECT * FROM cases')).rows).toEqual([]);
});
