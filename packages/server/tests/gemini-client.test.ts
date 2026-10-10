import { expect, test, vi } from 'vitest';
import { generateGeminiText } from '../src/gemini-client.ts';

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
