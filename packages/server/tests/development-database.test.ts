import { expect, test } from 'vitest';
import { readDevelopmentDatabaseConfig } from '../src/development-database.ts';

test('requires an explicit development database password', () => {
  expect(() => readDevelopmentDatabaseConfig({})).toThrow('development_database_password_required');
});
