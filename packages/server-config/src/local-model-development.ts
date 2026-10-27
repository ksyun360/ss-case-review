import type { ServerEnvironment } from './gemini-development.ts';

export function readLocalModelDevelopmentConfig(environment: ServerEnvironment) {
  if (environment.APP_ENV !== 'development')
    return { status: 'configuration_error', code: 'development_only' } as const;
  if (environment.DATA_CLASSIFICATION !== 'synthetic')
    return { status: 'configuration_error', code: 'synthetic_data_only' } as const;

  const endpoint = environment.LOCAL_MODEL_ENDPOINT?.trim();
  if (!endpoint) return { status: 'configuration_error', code: 'missing_local_endpoint' } as const;
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    return { status: 'configuration_error', code: 'invalid_local_endpoint' } as const;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
    return { status: 'configuration_error', code: 'invalid_local_endpoint' } as const;

  const modelId = environment.LOCAL_MODEL_ID?.trim();
  if (!modelId) return { status: 'configuration_error', code: 'missing_local_model' } as const;

  return {
    status: 'configured',
    config: { provider: 'local', endpoint, modelId },
  } as const;
}
