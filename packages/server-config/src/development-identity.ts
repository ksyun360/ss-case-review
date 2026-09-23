import type { ServerEnvironment } from './gemini-development.ts';

export function readDevelopmentIdentity(environment: ServerEnvironment) {
  const required = {
    APP_ENV: 'development',
    DATA_CLASSIFICATION: 'synthetic',
    AUTH_MODE: 'development',
    BIND_ADDRESS: '127.0.0.1',
  };
  if (!Object.entries(required).every(([key, value]) => environment[key] === value)) {
    throw new Error('development_identity_disabled');
  }
  return {
    host: '127.0.0.1',
    reviewerId: '00000000-0000-4000-8000-000000000011',
  } as const;
}
