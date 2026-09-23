import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';
import { Client } from 'pg';
import { expect, test, vi } from 'vitest';
import { migrateCaseSchema } from '../src/migrations.ts';

vi.mock('node-pg-migrate', () => ({ runner: vi.fn() }));

test('runs the fixed upward migration plan transactionally on the supplied client', async () => {
  const client = new Client({
    host: '127.0.0.1',
    port: 1,
    user: 'synthetic',
    database: 'synthetic',
    password: 'synthetic',
    ssl: false,
  });
  const applied = [{ path: 'synthetic.sql', name: 'synthetic', timestamp: 1 }];
  vi.mocked(runner).mockImplementation(async (options) => {
    options.log?.('Synthetic migration event');
    return applied;
  });
  expect(await migrateCaseSchema(client)).toBe(applied);
  expect(runner).toHaveBeenCalledExactlyOnceWith({
    dbClient: client,
    dir: fileURLToPath(new URL('../migrations/', import.meta.url)),
    migrationsTable: 'record_review_migrations',
    schema: 'public',
    direction: 'up',
    singleTransaction: true,
    log: expect.any(Function),
  });
});
