import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createDevelopmentApi } from '../src/case-api.ts';
import { requestHeaders } from './fixtures.ts';

test('disables HTTP caching for case metadata responses', async () => {
  const response = await api.inject({ url: '/api/v1/cases', headers: requestHeaders });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ cases: [] });
  expect(response.headers['cache-control']).toBe('no-store');
});

test('rejects malformed JSON without returning submitted text or parser details', async () => {
  const response = await api.inject({
    method: 'POST',
    url: '/api/v1/cases',
    headers: { ...requestHeaders, 'content-type': 'application/json' },
    payload: '{"label":"synthetic-private-parser-input"',
  });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ code: 'invalid_request' });
  expect(database.query).not.toHaveBeenCalled();
});

test('rejects oversized case metadata before validation or database access', async () => {
  const response = await api.inject({
    method: 'POST',
    url: '/api/v1/cases',
    headers: requestHeaders,
    payload: { label: 'S'.repeat(4097) },
  });
  expect(response.statusCode).toBe(413);
  expect(response.json()).toEqual({ code: 'request_too_large' });
  expect(database.query).not.toHaveBeenCalled();
});

test('rejects a foreign browser origin without granting cross-origin access', async () => {
  const response = await api.inject({
    url: '/api/v1/cases',
    headers: { ...requestHeaders, origin: 'https://foreign.invalid' },
  });
  expect(response.statusCode).toBe(403);
  expect(response.json()).toEqual({ code: 'development_request_forbidden' });
  expect(response.headers['access-control-allow-origin']).toBeUndefined();
  expect(database.query).not.toHaveBeenCalled();
});

test('rejects a foreign Host header even when a forwarded header claims loopback', async () => {
  const response = await api.inject({
    url: '/api/v1/cases',
    headers: {
      ...requestHeaders,
      host: 'foreign.invalid',
      'x-forwarded-host': '127.0.0.1:5176',
    },
  });
  expect(response.statusCode).toBe(403);
  expect(response.json()).toEqual({ code: 'development_request_forbidden' });
  expect(database.query).not.toHaveBeenCalled();
});

const environment = {
  APP_ENV: 'development',
  DATA_CLASSIFICATION: 'synthetic',
  AUTH_MODE: 'development',
  BIND_ADDRESS: '127.0.0.1',
};
const database = { query: vi.fn(async () => ({ rows: [] })) };
let api: ReturnType<typeof createDevelopmentApi>;
beforeEach(() => {
  database.query.mockClear();
  api = createDevelopmentApi(environment, database);
});
afterEach(async () => {
  await api.close();
});

test('rejects a numeric case label without coercion or database writes', async () => {
  const response = await api.inject({
    method: 'POST',
    url: '/api/v1/cases',
    payload: { label: 123 },
    headers: requestHeaders,
  });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ code: 'invalid_request' });
  expect(database.query).not.toHaveBeenCalled();
});

test('rejects case creation without a label', async () => {
  const response = await api.inject({
    method: 'POST',
    url: '/api/v1/cases',
    payload: {},
    headers: requestHeaders,
  });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ code: 'invalid_request' });
  expect(database.query).not.toHaveBeenCalled();
});

test('rejects whitespace-only case labels before calling the repository', async () => {
  const response = await api.inject({
    method: 'POST',
    url: '/api/v1/cases',
    payload: { label: ' \t\n ' },
    headers: requestHeaders,
  });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ code: 'invalid_request' });
  expect(database.query).not.toHaveBeenCalled();
});

test('rejects case labels longer than 120 characters', async () => {
  const response = await api.inject({
    method: 'POST',
    url: '/api/v1/cases',
    payload: { label: 'S'.repeat(121) },
    headers: requestHeaders,
  });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ code: 'invalid_request' });
  expect(database.query).not.toHaveBeenCalled();
});

test('rejects caller-supplied case identity and ownership fields', async () => {
  const response = await api.inject({
    method: 'POST',
    url: '/api/v1/cases',
    payload: {
      label: 'Synthetic draft',
      caseId: '00000000-0000-4000-8000-000000000099',
      reviewerId: '00000000-0000-4000-8000-000000000012',
      recordRevision: 99,
    },
    headers: requestHeaders,
  });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ code: 'invalid_request' });
  expect(database.query).not.toHaveBeenCalled();
});

test('rejects requests without the development browser marker before database access', async () => {
  const response = await api.inject({ url: '/api/v1/cases', headers: { host: '127.0.0.1:5176' } });
  expect(response.statusCode).toBe(403);
  expect(response.json()).toEqual({ code: 'development_request_forbidden' });
  expect(database.query).not.toHaveBeenCalled();
});
