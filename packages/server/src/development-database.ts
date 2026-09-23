import type { ServerEnvironment } from '@record-review/server-config/gemini-development';

export function readDevelopmentDatabaseConfig(environment: ServerEnvironment) {
  const password = environment.DEVELOPMENT_DATABASE_PASSWORD;
  if (!password?.trim()) throw new Error('development_database_password_required');
  return {
    host: '127.0.0.1',
    port: 55432,
    database: 'record_review_development',
    user: 'record_review_development',
    password,
    ssl: false,
    max: 4,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000,
    query_timeout: 15000,
    application_name: 'record-review-synthetic-development',
  };
}
