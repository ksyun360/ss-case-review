import { expect, test } from 'vitest';
import { readGeminiDevelopmentConfig } from '../src/gemini-development.ts';

const environment = {
  APP_ENV: 'development',
  DATA_CLASSIFICATION: 'synthetic',
  MODEL_PROVIDER: 'gemini',
  GEMINI_TRANSPORT: 'developer-api',
  GEMINI_MODEL_ID: 'synthetic-model-v1',
  GEMINI_API_KEY: 'synthetic-credential',
};

test('accepts explicit Gemini development settings with server-only credential access', () => {
  const result = readGeminiDevelopmentConfig(environment);
  expect(result).toEqual({
    status: 'configured',
    config: {
      provider: 'gemini',
      transport: 'developer-api',
      modelId: 'synthetic-model-v1',
      getApiKey: expect.any(Function),
    },
  });
  if (result.status !== 'configured') throw new Error('Expected configured settings');
  expect(result.config.getApiKey()).toBe('synthetic-credential');
});

test('rejects production use of the synthetic development configuration', () => {
  expect(readGeminiDevelopmentConfig({ ...environment, APP_ENV: 'production' })).toEqual({
    status: 'configuration_error',
    code: 'development_only',
  });
});

test('rejects court-record data in the Gemini development configuration', () => {
  expect(
    readGeminiDevelopmentConfig({ ...environment, DATA_CLASSIFICATION: 'court-record' }),
  ).toEqual({ status: 'configuration_error', code: 'synthetic_data_only' });
});

test('rejects a transport that requires a different credential contract', () => {
  expect(readGeminiDevelopmentConfig({ ...environment, GEMINI_TRANSPORT: 'vertex' })).toEqual({
    status: 'configuration_error',
    code: 'unsupported_transport',
  });
});

test('rejects a missing Gemini model instead of choosing an implicit model', () => {
  expect(readGeminiDevelopmentConfig({ ...environment, GEMINI_MODEL_ID: undefined })).toEqual({
    status: 'configuration_error',
    code: 'missing_model',
  });
});

test('rejects an environment without an explicitly selected provider', () => {
  expect(readGeminiDevelopmentConfig({})).toEqual({
    status: 'configuration_error',
    code: 'unsupported_provider',
  });
});
