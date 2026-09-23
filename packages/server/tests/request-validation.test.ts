import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createDevelopmentApi } from '../src/case-api.ts';

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
  });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ code: 'invalid_request' });
  expect(database.query).not.toHaveBeenCalled();
});

test('rejects case creation without a label', async () => {
  const response = await api.inject({ method: 'POST', url: '/api/v1/cases', payload: {} });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ code: 'invalid_request' });
  expect(database.query).not.toHaveBeenCalled();
});

test('rejects whitespace-only case labels before calling the repository', async () => {
  const response = await api.inject({
    method: 'POST',
    url: '/api/v1/cases',
    payload: { label: ' \t\n ' },
  });
  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ code: 'invalid_request' });
  expect(database.query).not.toHaveBeenCalled();
});
