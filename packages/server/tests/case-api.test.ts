import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createCase, findOriginalReference } from '@record-review/case-repository/cases';
import { readOriginal } from '@record-review/record-storage/originals';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { createDevelopmentApi } from '../src/case-api.ts';
import { requestHeaders } from './fixtures.ts';

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
  await database.exec(
    await readFile(
      new URL(
        '../../case-repository/migrations/202609230002_original_upload_attempts.sql',
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
    headers: { ...requestHeaders, 'x-reviewer-id': otherReviewerId },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({
    cases: [{ caseId: visible.caseId, label: visible.label, recordRevision: 1 }],
  });
});

test('opens only a case assigned to the configured development reviewer', async () => {
  const visibleId = '00000000-0000-4000-8000-000000000001';
  const hiddenId = '00000000-0000-4000-8000-000000000002';
  await createCase(database, { caseId: visibleId, label: 'Synthetic visible case', reviewerId });
  await createCase(database, {
    caseId: hiddenId,
    label: 'Synthetic hidden case',
    reviewerId: otherReviewerId,
  });
  const visible = await api.inject({ url: `/api/v1/cases/${visibleId}`, headers: requestHeaders });
  expect(visible.statusCode).toBe(200);
  expect(visible.json()).toEqual({
    case: { caseId: visibleId, label: 'Synthetic visible case', recordRevision: 1 },
  });
  const hidden = await api.inject({ url: `/api/v1/cases/${hiddenId}`, headers: requestHeaders });
  expect(hidden.statusCode).toBe(404);
  expect(hidden.json()).toEqual({ code: 'case_not_found' });
  const malformed = await api.inject({ url: '/api/v1/cases/not-a-uuid', headers: requestHeaders });
  expect(malformed.statusCode).toBe(400);
  expect(malformed.json()).toEqual({ code: 'invalid_request' });
});

test('creates a synthetic draft with a server-generated identity and creator membership', async () => {
  const response = await api.inject({
    method: 'POST',
    url: '/api/v1/cases',
    payload: { label: '  Synthetic draft  ' },
    headers: { ...requestHeaders, origin: 'http://127.0.0.1:5175' },
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
  expect((await api.inject({ url: '/api/v1/cases', headers: requestHeaders })).json()).toEqual({
    cases: [body.case],
  });
});

test('returns a safe failure when case creation rolls back in the database', async () => {
  await database.exec(
    'ALTER TABLE case_memberships ADD CONSTRAINT synthetic_private_failure CHECK (false)',
  );
  const response = await api.inject({
    method: 'POST',
    url: '/api/v1/cases',
    payload: { label: 'Synthetic rejected draft' },
    headers: requestHeaders,
  });
  expect(response.statusCode).toBe(503);
  expect(response.json()).toEqual({ code: 'case_service_unavailable' });
  expect((await database.query('SELECT * FROM cases')).rows).toEqual([]);
  expect((await database.query('SELECT * FROM case_memberships')).rows).toEqual([]);
});

test('accepts one synthetic original as streamed bytes for a member case', async () => {
  const root = await mkdtemp(join(tmpdir(), 'record-review-api-original-test-'));
  const caseId = '00000000-0000-4000-8000-000000000003';
  try {
    const disabled = await api.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/synthetic-originals`,
      headers: { ...requestHeaders, 'content-type': 'application/octet-stream' },
      payload: Buffer.from('abc'),
    });
    expect(disabled.statusCode).toBe(404);
    await api.close();
    api = createDevelopmentApi(environment, database, { root, maximumBytes: 3 });
    await createCase(database, { caseId, reviewerId, label: 'Synthetic original case' });
    const response = await api.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/synthetic-originals`,
      headers: { ...requestHeaders, 'content-type': 'application/octet-stream' },
      payload: Buffer.from('abc'),
    });
    expect(response.statusCode).toBe(201);
    const reference = response.json<{
      original: {
        caseId: string;
        documentVersionId: string;
        sha256: string;
        byteLength: number;
      };
    }>().original;
    expect(reference).toEqual({
      caseId,
      documentVersionId: expect.stringMatching(/^[a-f0-9-]{36}$/),
      sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      byteLength: 3,
    });
    expect(await readOriginal(root, caseId, reference)).toEqual(Buffer.from('abc'));
    expect(
      await findOriginalReference(database, reviewerId, caseId, reference.documentVersionId),
    ).toEqual(reference);
    expect((await database.query('SELECT state FROM original_upload_attempts')).rows).toEqual([
      { state: 'registered' },
    ]);
    const malformed = await api.inject({
      method: 'POST',
      url: '/api/v1/cases/not-a-uuid/synthetic-originals',
      headers: { ...requestHeaders, 'content-type': 'application/octet-stream' },
      payload: Buffer.from('abc'),
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toEqual({ code: 'invalid_request' });
    expect(
      (await database.query('SELECT count(*)::int AS count FROM original_upload_attempts')).rows,
    ).toEqual([{ count: 1 }]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('refuses a nonmember synthetic original without storing bytes or an attempt', async () => {
  const root = await mkdtemp(join(tmpdir(), 'record-review-api-original-test-'));
  const caseId = '00000000-0000-4000-8000-000000000004';
  try {
    await api.close();
    api = createDevelopmentApi(environment, database, { root, maximumBytes: 3 });
    await createCase(database, {
      caseId,
      reviewerId: otherReviewerId,
      label: 'Other reviewer case',
    });
    const response = await api.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/synthetic-originals`,
      headers: { ...requestHeaders, 'content-type': 'application/octet-stream' },
      payload: Buffer.from('abc'),
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: 'case_not_found' });
    expect(await readdir(root)).toEqual([]);
    expect((await database.query('SELECT * FROM original_upload_attempts')).rows).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
