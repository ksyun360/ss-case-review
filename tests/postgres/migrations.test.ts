import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { PG_MIGRATE_LOCK_ID } from 'node-pg-migrate';
import { Client, type ClientConfig } from 'pg';
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import {
  createCase,
  findOriginalReference,
  listCasesForReviewer,
  registerOriginalReference,
} from '../../packages/case-repository/src/cases.ts';
import { migrateCaseSchema } from '../../packages/case-repository/src/migrations.ts';

const postgresImage =
  'postgres:18.6-alpine3.24@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873';
const docker = (...args: string[]) =>
  execFileSync('docker', args, {
    encoding: 'utf8',
    timeout: 10_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
let containerId: string | undefined;
let client: Client;
let connectionConfig: ClientConfig;

beforeAll(async () => {
  const password = randomBytes(32).toString('hex');
  const createdId = docker(
    'run',
    '--detach',
    '--rm',
    '--pull=never',
    '--label',
    'record-review.test=postgres-migrations',
    '--publish',
    '127.0.0.1::5432',
    '--tmpfs',
    '/var/lib/postgresql:rw,nosuid,noexec,size=256m',
    '--memory',
    '512m',
    '--cpus',
    '1',
    '--env',
    `POSTGRES_PASSWORD=${password}`,
    '--env',
    'POSTGRES_DB=record_review_test',
    postgresImage,
  );
  assert.match(createdId, /^[a-f0-9]{64}$/);
  containerId = createdId;
  await vi.waitFor(
    () => {
      docker('exec', createdId, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres');
    },
    { timeout: 30_000, interval: 250 },
  );
  const binding = docker('port', createdId, '5432/tcp');
  const portMatch = /^127\.0\.0\.1:(\d+)$/.exec(binding);
  assert.ok(portMatch);
  connectionConfig = {
    host: '127.0.0.1',
    port: Number(portMatch[1]),
    user: 'postgres',
    password,
    database: 'record_review_test',
    ssl: false,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 5_000,
    application_name: 'record-review-native-tests',
  };
  client = new Client(connectionConfig);
  await client.connect();
});

beforeEach(async () => {
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
});

afterAll(async () => {
  try {
    await client?.end();
  } finally {
    if (containerId) docker('stop', '--time', '2', containerId);
  }
});

test('migrates a native PostgreSQL database and round-trips case and original metadata', async () => {
  await migrateCaseSchema(client);
  const caseId = '00000000-0000-4000-8000-000000000001';
  const reviewerId = '00000000-0000-4000-8000-000000000011';
  const expectedCase = { caseId, label: 'Synthetic native case', recordRevision: 1 };
  expect(await createCase(client, { caseId, reviewerId, label: expectedCase.label })).toEqual(
    expectedCase,
  );
  expect(await listCasesForReviewer(client, reviewerId)).toEqual([expectedCase]);
  const original = {
    caseId,
    documentVersionId: '00000000-0000-4000-8000-000000000021',
    sha256: 'a'.repeat(64),
    byteLength: 2_147_483_648,
  };
  expect(await registerOriginalReference(client, reviewerId, original)).toEqual(original);
  expect(
    await findOriginalReference(client, reviewerId, caseId, original.documentVersionId),
  ).toEqual(original);
  expect(
    (await client.query('SELECT name FROM record_review_migrations ORDER BY id')).rows,
  ).toEqual([{ name: '202609230001_initial_case_metadata' }]);
  expect((await client.query('SHOW server_version_num')).rows).toEqual([
    { server_version_num: '180006' },
  ]);
});

test('does not replay an applied migration or change existing case data', async () => {
  await migrateCaseSchema(client);
  const input = {
    caseId: '00000000-0000-4000-8000-000000000001',
    reviewerId: '00000000-0000-4000-8000-000000000011',
    label: 'Synthetic retained case',
  };
  await createCase(client, input);
  const history = (await client.query('SELECT * FROM record_review_migrations ORDER BY id')).rows;
  expect(await migrateCaseSchema(client)).toEqual([]);
  expect((await client.query('SELECT * FROM record_review_migrations ORDER BY id')).rows).toEqual(
    history,
  );
  expect(await listCasesForReviewer(client, input.reviewerId)).toEqual([
    { caseId: input.caseId, label: input.label, recordRevision: 1 },
  ]);
});

test('rolls back partial schema changes and leaves a failed migration unapplied', async () => {
  await client.query(`CREATE TABLE original_references (marker text);
    INSERT INTO original_references VALUES ('synthetic existing data')`);
  await expect(migrateCaseSchema(client)).rejects.toMatchObject({ code: '42P07' });
  expect(
    (
      await client.query(`SELECT to_regclass('public.cases') AS cases,
      to_regclass('public.case_memberships') AS memberships`)
    ).rows,
  ).toEqual([{ cases: null, memberships: null }]);
  expect((await client.query('SELECT marker FROM original_references')).rows).toEqual([
    { marker: 'synthetic existing data' },
  ]);
  expect((await client.query('SELECT name FROM record_review_migrations')).rows).toEqual([]);
  await client.query('DROP TABLE original_references');
  expect(await migrateCaseSchema(client)).toHaveLength(1);
});

test('refuses a competing migration until the other connection releases the lock', async () => {
  const blocker = new Client(connectionConfig);
  try {
    await blocker.connect();
    await blocker.query('SELECT pg_advisory_lock($1)', [PG_MIGRATE_LOCK_ID]);
    await expect(migrateCaseSchema(client)).rejects.toThrow('Another migration is already running');
    expect(
      (await client.query(`SELECT to_regclass('public.record_review_migrations') AS history`)).rows,
    ).toEqual([{ history: null }]);
  } finally {
    await blocker.end();
  }
  expect(await migrateCaseSchema(client)).toHaveLength(1);
});

test('rejects migration history that does not match the repository plan', async () => {
  await migrateCaseSchema(client);
  const input = {
    caseId: '00000000-0000-4000-8000-000000000001',
    reviewerId: '00000000-0000-4000-8000-000000000011',
    label: 'Synthetic case with mismatched history',
  };
  await createCase(client, input);
  await client.query(`UPDATE record_review_migrations SET name = '209901010001_unknown'`);
  await expect(migrateCaseSchema(client)).rejects.toThrow(
    'already run migration 209901010001_unknown',
  );
  expect((await client.query('SELECT name FROM record_review_migrations')).rows).toEqual([
    { name: '209901010001_unknown' },
  ]);
  expect(await listCasesForReviewer(client, input.reviewerId)).toEqual([
    { caseId: input.caseId, label: input.label, recordRevision: 1 },
  ]);
});
