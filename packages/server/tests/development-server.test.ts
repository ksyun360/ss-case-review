import { EventEmitter } from 'node:events';
import Fastify from 'fastify';
import { Pool } from 'pg';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { migrateCaseSchema } from '@record-review/case-repository/migrations';
import { createDevelopmentApi } from '../src/case-api.ts';
import { readDevelopmentDatabaseConfig } from '../src/development-database.ts';
import { startDevelopmentServer } from '../src/development-server.ts';

vi.mock('pg', () => ({ Pool: vi.fn() }));
vi.mock('@record-review/case-repository/migrations', () => ({ migrateCaseSchema: vi.fn() }));
vi.mock('../src/case-api.ts', () => ({ createDevelopmentApi: vi.fn() }));

test('closes the pool after the requested loopback listener cannot start', async () => {
  vi.mocked(api.listen).mockImplementation(async () => {
    throw new Error('synthetic private listener details');
  });
  await expect(startDevelopmentServer(environment)).rejects.toThrow(
    'development_server_start_failed',
  );
  expect(migrateCaseSchema).toHaveBeenCalledExactlyOnceWith(client);
  expect(client.release).toHaveBeenCalledExactlyOnceWith();
  expect(database.end).toHaveBeenCalledExactlyOnceWith();
});

test('closes the pool without migrating or listening after a connection failure', async () => {
  database.connect.mockRejectedValue(new Error('synthetic private connection details'));
  await expect(startDevelopmentServer(environment)).rejects.toThrow(
    'development_server_start_failed',
  );
  expect(database.end).toHaveBeenCalledExactlyOnceWith();
  expect(migrateCaseSchema).not.toHaveBeenCalled();
  expect(client.release).not.toHaveBeenCalled();
  expect(api.listen).not.toHaveBeenCalled();
});

test('releases migration resources and refuses to listen after a schema failure', async () => {
  vi.mocked(migrateCaseSchema).mockRejectedValue(new Error('synthetic private schema details'));
  await expect(startDevelopmentServer(environment)).rejects.toThrow(
    'development_server_start_failed',
  );
  expect(client.release).toHaveBeenCalledExactlyOnceWith();
  expect(database.end).toHaveBeenCalledExactlyOnceWith();
  expect(api.listen).not.toHaveBeenCalled();
});

test('rejects nondevelopment identity before constructing database resources', async () => {
  await expect(startDevelopmentServer({ ...environment, APP_ENV: 'production' })).rejects.toThrow(
    'development_identity_disabled',
  );
  expect(Pool).not.toHaveBeenCalled();
  expect(createDevelopmentApi).not.toHaveBeenCalled();
  expect(api.listen).not.toHaveBeenCalled();
});

const environment = {
  APP_ENV: 'development',
  DATA_CLASSIFICATION: 'synthetic',
  AUTH_MODE: 'development',
  BIND_ADDRESS: '127.0.0.1',
  DEVELOPMENT_DATABASE_PASSWORD: 'synthetic-only',
};
const client = { release: vi.fn() };
const database = Object.assign(new EventEmitter(), {
  connect: vi.fn(),
  end: vi.fn(),
});
let api: ReturnType<typeof createDevelopmentApi>;

beforeEach(() => {
  vi.resetAllMocks();
  database.removeAllListeners();
  database.connect.mockResolvedValue(client);
  database.end.mockResolvedValue(undefined);
  vi.mocked(Pool).mockImplementation(function () {
    return database as unknown as Pool;
  });
  api = Fastify();
  vi.spyOn(api, 'listen').mockImplementation(async () => 'http://127.0.0.1:5176');
  vi.mocked(createDevelopmentApi).mockReturnValue(api);
  vi.mocked(migrateCaseSchema).mockResolvedValue([]);
});

afterEach(async () => {
  await api.close();
});

test('migrates before listening and closes the pool with the development API', async () => {
  const events: string[] = [];
  database.connect.mockImplementation(async () => {
    events.push('connect');
    return client;
  });
  vi.mocked(migrateCaseSchema).mockImplementation(async () => {
    events.push('migrate');
    return [];
  });
  client.release.mockImplementation(() => events.push('release'));
  vi.mocked(api.listen).mockImplementation(async () => {
    events.push('listen');
    return 'http://127.0.0.1:5176';
  });
  const started = await startDevelopmentServer(environment);
  expect(started === api).toBe(true);
  expect(Pool).toHaveBeenCalledExactlyOnceWith(readDevelopmentDatabaseConfig(environment));
  expect(createDevelopmentApi).toHaveBeenCalledExactlyOnceWith(environment, database);
  expect(migrateCaseSchema).toHaveBeenCalledExactlyOnceWith(client);
  expect(api.listen).toHaveBeenCalledExactlyOnceWith({ host: '127.0.0.1', port: 5176 });
  expect(events).toEqual(['connect', 'migrate', 'release', 'listen']);
  expect(database.end).not.toHaveBeenCalled();
  await api.close();
  expect(database.end).toHaveBeenCalledExactlyOnceWith();
});
