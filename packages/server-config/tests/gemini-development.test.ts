import { expect, test } from 'vitest';
import { readGeminiDevelopmentConfig } from '../src/gemini-development.ts';

test('rejects an environment without an explicitly selected provider', () => {
  expect(readGeminiDevelopmentConfig({})).toEqual({
    status: 'configuration_error',
    code: 'unsupported_provider',
  });
});
