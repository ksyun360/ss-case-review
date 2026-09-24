import type { ServerEnvironment } from '@record-review/server-config/gemini-development';
import { readDevelopmentIdentity } from '@record-review/server-config/development-identity';
import { Pool } from 'pg';
import process from 'node:process';
import { isAbsolute, parse, resolve } from 'node:path';
import { migrateCaseSchema } from '@record-review/case-repository/migrations';
import { createDevelopmentApi } from './case-api.ts';
import { readDevelopmentDatabaseConfig } from './development-database.ts';

export async function startDevelopmentServer(environment: ServerEnvironment) {
  readDevelopmentIdentity(environment);
  const configuredRoot = environment.DEVELOPMENT_ORIGINAL_STORAGE_ROOT;
  let originalStorage;
  if (configuredRoot !== undefined) {
    const root = resolve(configuredRoot);
    if (!isAbsolute(configuredRoot) || root === parse(root).root)
      throw new Error('development_original_root_invalid');
    originalStorage = { root, maximumBytes: 512 * 1024 * 1024 };
  }
  const database = new Pool(readDevelopmentDatabaseConfig(environment));
  database.on('error', () => {
    process.stderr.write('development_database_connection_lost\n');
  });
  const api = originalStorage
    ? createDevelopmentApi(environment, database, originalStorage)
    : createDevelopmentApi(environment, database);
  api.addHook('onClose', async () => {
    await database.end();
  });
  try {
    const client = await database.connect();
    try {
      await migrateCaseSchema(client);
    } finally {
      client.release();
    }
    await api.listen({ host: '127.0.0.1', port: 5176 });
    return api;
  } catch {
    await api.close();
    throw new Error('development_server_start_failed');
  }
}
