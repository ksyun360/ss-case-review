import { expect, test } from 'vitest';
import { readDevelopmentIdentity } from '../src/development-identity.ts';

test('rejects a nondevelopment identity mode in the synthetic configuration', () => {
  expect(() => readDevelopmentIdentity({ ...environment, AUTH_MODE: 'court-identity' })).toThrow(
    'development_identity_disabled',
  );
});

test('rejects court-record classification for the synthetic development identity', () => {
  expect(() =>
    readDevelopmentIdentity({ ...environment, DATA_CLASSIFICATION: 'court-record' }),
  ).toThrow('development_identity_disabled');
});

test('rejects court-test use of the synthetic development identity', () => {
  expect(() => readDevelopmentIdentity({ ...environment, APP_ENV: 'court-test' })).toThrow(
    'development_identity_disabled',
  );
});

test('rejects production use of the synthetic development identity', () => {
  expect(() => readDevelopmentIdentity({ ...environment, APP_ENV: 'production' })).toThrow(
    'development_identity_disabled',
  );
});

const environment = {
  APP_ENV: 'development',
  DATA_CLASSIFICATION: 'synthetic',
  AUTH_MODE: 'development',
  BIND_ADDRESS: '127.0.0.1',
};

test('rejects missing development identity authorization without echoing settings', () => {
  expect(() => readDevelopmentIdentity({})).toThrow('development_identity_disabled');
  expect(() => readDevelopmentIdentity({ ...environment, AUTH_MODE: undefined })).toThrow(
    'development_identity_disabled',
  );
});

test('selects a fixed synthetic reviewer only for explicit loopback development settings', () => {
  expect(readDevelopmentIdentity(environment)).toEqual({
    host: '127.0.0.1',
    reviewerId: '00000000-0000-4000-8000-000000000011',
  });
});
