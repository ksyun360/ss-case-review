export type ServerEnvironment = Readonly<Record<string, string | undefined>>;

export function readGeminiDevelopmentConfig(_environment: ServerEnvironment): unknown {
  return { status: 'configuration_error', code: 'unsupported_provider' };
}
