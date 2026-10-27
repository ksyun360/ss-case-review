import { expect, test } from 'vitest';
import { readLocalModelDevelopmentConfig } from '../src/local-model-development.ts';

test('accepts an explicit local model endpoint for synthetic development', () => {
  expect(
    readLocalModelDevelopmentConfig({
      APP_ENV: 'development',
      DATA_CLASSIFICATION: 'synthetic',
      LOCAL_MODEL_ENDPOINT: 'http://127.0.0.1:8080/v1/chat/completions',
      LOCAL_MODEL_ID: 'record-review-local',
    }),
  ).toMatchObject({
    status: 'configured',
    config: {
      provider: 'local',
      endpoint: 'http://127.0.0.1:8080/v1/chat/completions',
      modelId: 'record-review-local',
    },
  });
});

test('normalizes surrounding whitespace without changing the local endpoint or model identity', () => {
  const result = readLocalModelDevelopmentConfig({
    APP_ENV: 'development',
    DATA_CLASSIFICATION: 'synthetic',
    LOCAL_MODEL_ENDPOINT: '  http://127.0.0.1:8080/v1/chat/completions  ',
    LOCAL_MODEL_ID: '  record-review-local  ',
  });
  expect(result).toMatchObject({
    status: 'configured',
    config: {
      endpoint: 'http://127.0.0.1:8080/v1/chat/completions',
      modelId: 'record-review-local',
    },
  });
});

test('accepts an HTTPS local endpoint for a secured local inference gateway', () => {
  expect(
    readLocalModelDevelopmentConfig({
      APP_ENV: 'development',
      DATA_CLASSIFICATION: 'synthetic',
      LOCAL_MODEL_ENDPOINT: 'https://model.internal/v1/chat/completions',
      LOCAL_MODEL_ID: 'record-review-local',
    }),
  ).toMatchObject({ status: 'configured' });
});

test('rejects local model settings outside synthetic development', () => {
  const valid = {
    APP_ENV: 'development',
    DATA_CLASSIFICATION: 'synthetic',
    LOCAL_MODEL_ENDPOINT: 'http://127.0.0.1:8080/v1/chat/completions',
    LOCAL_MODEL_ID: 'record-review-local',
  };
  expect(readLocalModelDevelopmentConfig({ ...valid, APP_ENV: 'production' })).toEqual({
    status: 'configuration_error',
    code: 'development_only',
  });
  expect(
    readLocalModelDevelopmentConfig({ ...valid, DATA_CLASSIFICATION: 'court-record' }),
  ).toEqual({ status: 'configuration_error', code: 'synthetic_data_only' });
  expect(readLocalModelDevelopmentConfig({ ...valid, LOCAL_MODEL_ENDPOINT: undefined })).toEqual({
    status: 'configuration_error',
    code: 'missing_local_endpoint',
  });
  expect(readLocalModelDevelopmentConfig({ ...valid, LOCAL_MODEL_ENDPOINT: 'not-a-url' })).toEqual({
    status: 'configuration_error',
    code: 'invalid_local_endpoint',
  });
  expect(
    readLocalModelDevelopmentConfig({ ...valid, LOCAL_MODEL_ENDPOINT: 'file:///tmp/model' }),
  ).toEqual({ status: 'configuration_error', code: 'invalid_local_endpoint' });
  expect(readLocalModelDevelopmentConfig({ ...valid, LOCAL_MODEL_ID: ' 	 ' })).toEqual({
    status: 'configuration_error',
    code: 'missing_local_model',
  });
  expect(readLocalModelDevelopmentConfig({ ...valid, LOCAL_MODEL_ID: undefined })).toEqual({
    status: 'configuration_error',
    code: 'missing_local_model',
  });
});
