import type { ServerEnvironment } from '@record-review/server-config/gemini-development';

export function readDevelopmentDatabaseConfig(_environment: ServerEnvironment) {
  throw new Error('development_database_password_required');
}
