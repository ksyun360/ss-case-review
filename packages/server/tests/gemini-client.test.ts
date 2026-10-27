import { expect, test, vi } from 'vitest';
import {
  createDevelopmentTextGenerator,
  createGeminiTextGenerator,
  generateGeminiText,
  generateLocalText,
} from '../src/gemini-client.ts';

test('constructs a configured local generator from the explicit local provider', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: 'Local answer.' } }] }),
  });
  const result = createDevelopmentTextGenerator(
    {
      APP_ENV: 'development',
      DATA_CLASSIFICATION: 'synthetic',
      MODEL_PROVIDER: 'local',
      LOCAL_MODEL_ENDPOINT: 'http://127.0.0.1:8080/v1/chat/completions',
      LOCAL_MODEL_ID: 'record-review-local',
    },
    fetch,
  );
  expect(result.status).toBe('configured');
  if (result.status === 'configured')
    await expect(
      result.generate({ prompt: 'Bounded prompt.', maxOutputTokens: 64 }),
    ).resolves.toEqual({ status: 'generated', text: 'Local answer.' });
});

test('keeps provider selection and local configuration failures explicit', () => {
  expect(createDevelopmentTextGenerator({ MODEL_PROVIDER: 'unsupported' })).toEqual({
    status: 'configuration_error',
    code: 'unsupported_provider',
  });
  expect(
    createDevelopmentTextGenerator({
      APP_ENV: 'development',
      DATA_CLASSIFICATION: 'synthetic',
      MODEL_PROVIDER: 'local',
    }),
  ).toEqual({ status: 'configuration_error', code: 'missing_local_endpoint' });
});

test('sends a bounded synthetic prompt to the configured local model endpoint', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: 'A local source-grounded answer.' } }] }),
  });
  const config = {
    endpoint: 'http://127.0.0.1:8080/v1/chat/completions',
    modelId: 'record-review-local',
  };

  await expect(
    generateLocalText(
      config,
      { prompt: 'Use only the supplied record.', maxOutputTokens: 128 },
      fetch,
    ),
  ).resolves.toEqual({ status: 'generated', text: 'A local source-grounded answer.' });
  expect(fetch).toHaveBeenCalledExactlyOnceWith(config.endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: config.modelId,
      messages: [{ role: 'user', content: 'Use only the supplied record.' }],
      max_tokens: 128,
    }),
    signal: expect.any(AbortSignal),
  });
});

test('normalizes local model failures, refusals, and empty responses', async () => {
  const config = {
    endpoint: 'http://127.0.0.1:8080/v1/chat/completions',
    modelId: 'record-review-local',
  };
  const request = { prompt: 'Use only the supplied record.', maxOutputTokens: 128 };
  const failedFetch = vi.fn().mockResolvedValue({ ok: false, status: 503, json: vi.fn() });
  await expect(generateLocalText(config, request, failedFetch)).resolves.toEqual({
    status: 'refused',
    code: 'provider_error',
  });

  const safetyFetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ finish_reason: 'safety', message: { content: '' } }] }),
  });
  await expect(generateLocalText(config, request, safetyFetch)).resolves.toEqual({
    status: 'refused',
    code: 'safety_refusal',
  });

  const explicitRefusalFetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { refusal: 'blocked' } }] }),
  });
  await expect(generateLocalText(config, request, explicitRefusalFetch)).resolves.toEqual({
    status: 'refused',
    code: 'safety_refusal',
  });

  const emptyFetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: '  ' } }] }),
  });
  await expect(generateLocalText(config, request, emptyFetch)).resolves.toEqual({
    status: 'refused',
    code: 'empty_response',
  });

  for (const payload of [
    null,
    {},
    { choices: [] },
    { choices: [{}] },
    { choices: [{ message: {} }] },
  ]) {
    const malformedFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    });
    await expect(generateLocalText(config, request, malformedFetch)).resolves.toEqual({
      status: 'refused',
      code: 'empty_response',
    });
  }
});

test('sends a bounded synthetic prompt to the configured Gemini model', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: 'A source-grounded answer.' }] } }],
    }),
  });
  const config = {
    modelId: 'gemini-2.5-flash',
    getApiKey: () => 'synthetic-key',
  };

  await expect(
    generateGeminiText(
      config,
      { prompt: 'Use only the supplied record.', maxOutputTokens: 128 },
      fetch,
    ),
  ).resolves.toEqual({ status: 'generated', text: 'A source-grounded answer.' });
  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=synthetic-key',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Use only the supplied record.' }] }],
        generationConfig: { maxOutputTokens: 128 },
      }),
      signal: expect.any(AbortSignal),
    },
  );
});

test('constructs a Gemini generator only from validated synthetic development settings', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text: 'Configured answer.' }] } }] }),
  });
  const result = createGeminiTextGenerator(
    {
      APP_ENV: 'development',
      DATA_CLASSIFICATION: 'synthetic',
      MODEL_PROVIDER: 'gemini',
      GEMINI_TRANSPORT: 'developer-api',
      GEMINI_MODEL_ID: 'gemini-2.5-flash',
      GEMINI_API_KEY: 'synthetic-key',
    },
    fetch,
  );

  expect(result.status).toBe('configured');
  if (result.status === 'configured')
    await expect(
      result.generate({ prompt: 'Bounded prompt.', maxOutputTokens: 64 }),
    ).resolves.toEqual({ status: 'generated', text: 'Configured answer.' });
});

test('rejects a generator when the configured provider is not Gemini', () => {
  expect(
    createGeminiTextGenerator({
      APP_ENV: 'development',
      DATA_CLASSIFICATION: 'synthetic',
      MODEL_PROVIDER: 'unsupported',
      GEMINI_TRANSPORT: 'developer-api',
      GEMINI_MODEL_ID: 'gemini-2.5-flash',
      GEMINI_API_KEY: 'synthetic-key',
    }),
  ).toEqual({ status: 'configuration_error', code: 'unsupported_provider' });
});

test('normalizes a Gemini provider failure without exposing its response body', async () => {
  const json = vi.fn();
  const fetch = vi.fn().mockResolvedValue({ ok: false, status: 429, json });
  const config = { modelId: 'gemini-2.5-flash', getApiKey: () => 'synthetic-key' };

  await expect(
    generateGeminiText(
      config,
      { prompt: 'Use only the supplied record.', maxOutputTokens: 128 },
      fetch,
    ),
  ).resolves.toEqual({ status: 'refused', code: 'provider_error' });
  expect(json).not.toHaveBeenCalled();
});

test('normalizes an empty Gemini candidate into a safe refusal', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text: '   ' }] } }] }),
  });
  const config = { modelId: 'gemini-2.5-flash', getApiKey: () => 'synthetic-key' };

  await expect(
    generateGeminiText(
      config,
      { prompt: 'Use only the supplied record.', maxOutputTokens: 128 },
      fetch,
    ),
  ).resolves.toEqual({ status: 'refused', code: 'empty_response' });
});

test('normalizes a malformed Gemini text part into a safe refusal', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text: null }] } }] }),
  });
  const config = { modelId: 'gemini-2.5-flash', getApiKey: () => 'synthetic-key' };

  await expect(
    generateGeminiText(
      config,
      { prompt: 'Use only the supplied record.', maxOutputTokens: 128 },
      fetch,
    ),
  ).resolves.toEqual({ status: 'refused', code: 'empty_response' });
});

test('normalizes a Gemini safety block into a fixed refusal', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }),
  });
  const config = { modelId: 'gemini-2.5-flash', getApiKey: () => 'synthetic-key' };

  await expect(
    generateGeminiText(
      config,
      { prompt: 'Use only the supplied record.', maxOutputTokens: 128 },
      fetch,
    ),
  ).resolves.toEqual({ status: 'refused', code: 'safety_refusal' });
});
