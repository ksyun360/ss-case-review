import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';
import type { ClientBase } from 'pg';

export function migrateCaseSchema(client: ClientBase): ReturnType<typeof runner> {
  return runner({
    dbClient: client,
    dir: fileURLToPath(new URL('../migrations/', import.meta.url)),
    migrationsTable: 'record_review_migrations',
    schema: 'public',
    direction: 'up',
    singleTransaction: true,
    log: () => undefined,
  });
}
