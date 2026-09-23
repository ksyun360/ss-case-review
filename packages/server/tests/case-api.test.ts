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
