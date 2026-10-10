type GeminiConfig = Readonly<{ modelId: string; getApiKey: () => string }>;
type GeminiRequest = Readonly<{ prompt: string; maxOutputTokens: number }>;
type GeminiResponse = Readonly<{
  candidates?: ReadonlyArray<
    Readonly<{ content?: Readonly<{ parts?: ReadonlyArray<Readonly<{ text?: unknown }>> }> }>
  >;
}>;

export type GeminiTextResult = Readonly<{ status: 'generated'; text: string }>;

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
  const payload = (await response.json()) as GeminiResponse;
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text as string;
  return { status: 'generated', text };
}
