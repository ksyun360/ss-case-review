import { expect, test } from 'vitest';
import { readDevelopmentIdentity } from '../src/development-identity.ts';

test('rejects missing development identity authorization without echoing settings', () => {
  expect(() => readDevelopmentIdentity({})).toThrow('development_identity_disabled');
});
