export type ServerEnvironment = Readonly<Record<string, string | undefined>>;

export function readGeminiDevelopmentConfig(environment: ServerEnvironment) {
  if (environment.MODEL_PROVIDER !== 'gemini') {
    return { status: 'configuration_error', code: 'unsupported_provider' } as const;
  }

  if (environment.APP_ENV !== 'development') {
    return { status: 'configuration_error', code: 'development_only' } as const;
  }

  if (environment.DATA_CLASSIFICATION !== 'synthetic') {
    return { status: 'configuration_error', code: 'synthetic_data_only' } as const;
  }

  if (environment.GEMINI_TRANSPORT !== 'developer-api') {
    return { status: 'configuration_error', code: 'unsupported_transport' } as const;
  }

  const modelId = environment.GEMINI_MODEL_ID?.trim();
  if (!modelId) {
    return { status: 'configuration_error', code: 'missing_model' } as const;
  }

  const apiKey = environment.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    return { status: 'configuration_error', code: 'missing_api_key' } as const;
  }

  return {
    status: 'configured',
    config: {
      provider: 'gemini',
      transport: 'developer-api',
      modelId,
      getApiKey: () => apiKey,
    },
  } as const;
}
