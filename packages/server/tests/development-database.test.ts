import { expect, test } from 'vitest';
import { readDevelopmentDatabaseConfig } from '../src/development-database.ts';

test('rejects a blank development database password without echoing the value', () => {
  expect(() => readDevelopmentDatabaseConfig({ DEVELOPMENT_DATABASE_PASSWORD: ' \t\n ' })).toThrow(
    'development_database_password_required',
  );
});

test('requires an explicit development database password', () => {
  expect(() => readDevelopmentDatabaseConfig({})).toThrow('development_database_password_required');
});

test('fixes the synthetic database target and bounds connection resources', () => {
  expect(
    readDevelopmentDatabaseConfig({ DEVELOPMENT_DATABASE_PASSWORD: ' synthetic-only ' }),
  ).toEqual({
    host: '127.0.0.1',
    port: 55432,
    database: 'record_review_development',
    user: 'record_review_development',
    password: ' synthetic-only ',
    ssl: false,
    max: 4,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000,
    query_timeout: 15000,
    application_name: 'record-review-synthetic-development',
  });
});
