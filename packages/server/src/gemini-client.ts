type GeminiConfig = Readonly<{ modelId: string; getApiKey: () => string }>;
type GeminiRequest = Readonly<{ prompt: string; maxOutputTokens: number }>;
type GeminiResponse = Readonly<{
  promptFeedback?: Readonly<{ blockReason?: unknown }>;
  candidates?: ReadonlyArray<
    Readonly<{ content?: Readonly<{ parts?: ReadonlyArray<Readonly<{ text?: unknown }>> }> }>
  >;
}>;
type LocalConfig = Readonly<{ endpoint: string; modelId: string }>;
type LocalResponse = Readonly<{
  choices?: ReadonlyArray<
    Readonly<{
      finish_reason?: unknown;
      message?: Readonly<{ content?: unknown; refusal?: unknown }>;
    }>
  >;
}>;

export type GeminiTextResult =
  | Readonly<{ status: 'generated'; text: string }>
  | Readonly<{
      status: 'refused';
      code: 'provider_error' | 'empty_response' | 'safety_refusal';
    }>;

export type GeminiGeneratorResult =
  | Readonly<{
      status: 'configured';
      generate: (request: GeminiRequest) => Promise<GeminiTextResult>;
    }>
  | Readonly<{ status: 'configuration_error'; code: string }>;

export function createGeminiTextGenerator(
  environment: ServerEnvironment,
  fetchImplementation: typeof fetch = fetch,
): GeminiGeneratorResult {
  const configuration = readGeminiDevelopmentConfig(environment);
  if (configuration.status === 'configuration_error') return configuration;
  return {
    status: 'configured',
    generate: (request) => generateGeminiText(configuration.config, request, fetchImplementation),
  };
}

export async function generateGeminiText(
  config: GeminiConfig,
  request: GeminiRequest,
  fetchImplementation: typeof fetch = fetch,
): Promise<GeminiTextResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.modelId)}:generateContent?key=${encodeURIComponent(config.getApiKey())}`;
  const response = await fetchImplementation(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig: { maxOutputTokens: request.maxOutputTokens },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return { status: 'refused', code: 'provider_error' };
  const payload = (await response.json()) as GeminiResponse;
  if (payload.promptFeedback?.blockReason === 'SAFETY')
    return { status: 'refused', code: 'safety_refusal' };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text as string;
  if (typeof text !== 'string' || text.trim() === '')
    return { status: 'refused', code: 'empty_response' };
  return { status: 'generated', text };
}

export async function generateLocalText(
  config: LocalConfig,
  request: GeminiRequest,
  fetchImplementation: typeof fetch = fetch,
): Promise<GeminiTextResult> {
  const response = await fetchImplementation(config.endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: config.modelId,
      messages: [{ role: 'user', content: request.prompt }],
      max_tokens: request.maxOutputTokens,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return { status: 'refused', code: 'provider_error' };
  const payload = (await response.json()) as LocalResponse | null;
  const choice = payload?.choices?.[0];
  if (choice?.finish_reason === 'safety' || typeof choice?.message?.refusal === 'string')
    return { status: 'refused', code: 'safety_refusal' };
  const text = choice?.message?.content;
  if (typeof text !== 'string' || text.trim() === '')
    return { status: 'refused', code: 'empty_response' };
  return { status: 'generated', text };
}
import {
  readGeminiDevelopmentConfig,
  type ServerEnvironment,
} from '@record-review/server-config/gemini-development';
