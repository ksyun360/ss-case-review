import type { ServerEnvironment } from '@record-review/server-config/gemini-development';
import { Pool } from 'pg';
import { migrateCaseSchema } from '@record-review/case-repository/migrations';
import { createDevelopmentApi } from './case-api.ts';
import { readDevelopmentDatabaseConfig } from './development-database.ts';

export async function startDevelopmentServer(environment: ServerEnvironment) {
  const database = new Pool(readDevelopmentDatabaseConfig(environment));
  const api = createDevelopmentApi(environment, database);
  api.addHook('onClose', async () => {
    await database.end();
  });
  const client = await database.connect();
  await migrateCaseSchema(client);
  client.release();
  await api.listen({ host: '127.0.0.1', port: 5176 });
  return api;
}
