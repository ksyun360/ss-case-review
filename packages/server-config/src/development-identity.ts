import type { ServerEnvironment } from './gemini-development.ts';

export function readDevelopmentIdentity(_environment: ServerEnvironment) {
  throw new Error('development_identity_disabled');
}
