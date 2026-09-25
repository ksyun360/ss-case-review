import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { chromium, expect as browserExpect, type Browser } from '@playwright/test';
import { PG_MIGRATE_LOCK_ID } from 'node-pg-migrate';
import { Client, type ClientConfig } from 'pg';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import {
  createCase,
  findOriginalReference,
  listCasesForReviewer,
  registerOriginalReference,
} from '../../packages/case-repository/src/cases.ts';
import { migrateCaseSchema } from '../../packages/case-repository/src/migrations.ts';
import {
  completeOriginalUpload,
  reserveOriginalUpload,
} from '../../packages/case-repository/src/upload-attempts.ts';
import { createDevelopmentApi } from '../../packages/server/src/case-api.ts';
import { readOriginal } from '../../packages/record-storage/src/originals.ts';

test('registers browser-selected synthetic bytes in native PostgreSQL and private storage', async () => {
  await migrateCaseSchema(client);
  const root = await mkdtemp(join(tmpdir(), 'record-review-browser-original-'));
  const api = createDevelopmentApi(
    {
      APP_ENV: 'development',
      DATA_CLASSIFICATION: 'synthetic',
      AUTH_MODE: 'development',
      BIND_ADDRESS: '127.0.0.1',
    },
    client,
    { root, maximumBytes: 1024 },
  );
  let vite: ViteDevServer | undefined;
  let browser: Browser | undefined;
  try {
    await api.listen({ host: '127.0.0.1', port: 5176 });
    vite = await createServer({
      configFile: false,
      root: fileURLToPath(new URL('../../packages/web/', import.meta.url)),
      plugins: [react()],
      server: {
        host: '127.0.0.1',
        port: 5175,
        strictPort: true,
        proxy: { '/api/v1': { target: 'http://127.0.0.1:5176', changeOrigin: true } },
      },
    });
    await vite.listen();
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:5175/upload');
    await browserExpect(page.getByText('Synthetic original transfer is available.')).toBeVisible();
    const bytes = Buffer.from('synthetic original contents');
    await page.getByLabel('Choose case documents').setInputFiles({
      name: 'synthetic.pdf',
      mimeType: 'application/pdf',
      buffer: bytes,
    });
    await page.getByRole('textbox', { name: 'Synthetic case label' }).fill('Native browser draft');
    await page.getByRole('button', { name: 'Register synthetic originals' }).click();
    await browserExpect(page.getByText('1 of 1 originals registered')).toBeVisible();
    const href = await page.getByRole('link', { name: 'Open synthetic case' }).getAttribute('href');
    const caseId = href?.split('/').at(-1);
    assert.ok(caseId);
    assert.match(caseId, /^[a-f0-9-]{36}$/);
    const rows = await client.query<{ document_version_id: string }>(
      'SELECT document_version_id FROM original_references WHERE case_id = $1',
      [caseId],
    );
    expect(rows.rows).toHaveLength(1);
    const row = rows.rows[0];
    assert.ok(row);
    const reference = await findOriginalReference(
      client,
      '00000000-0000-4000-8000-000000000011',
      caseId,
      row.document_version_id,
    );
    assert.ok(reference);
    expect(reference).toMatchObject({ caseId, byteLength: bytes.length });
    expect(await readOriginal(root, caseId, reference)).toEqual(bytes);
  } finally {
    await browser?.close();
    await vite?.close();
    await api.close();
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

test('persists API-created cases in native PostgreSQL and rechecks membership on each request', async () => {
  await migrateCaseSchema(client);
  const api = createDevelopmentApi(
    {
      APP_ENV: 'development',
      DATA_CLASSIFICATION: 'synthetic',
      AUTH_MODE: 'development',
      BIND_ADDRESS: '127.0.0.1',
    },
    client,
  );
  const headers = { host: '127.0.0.1:5176', 'x-record-review-client': 'synthetic-workspace' };
  try {
    const created = await api.inject({
      method: 'POST',
      url: '/api/v1/cases',
      headers,
      payload: { label: 'Synthetic native API case' },
    });
    expect(created.statusCode).toBe(201);
    const body = created.json<{
      case: { caseId: string; label: string; recordRevision: number };
    }>();
    expect(body.case).toEqual({
      caseId: expect.any(String),
      label: 'Synthetic native API case',
      recordRevision: 1,
    });
    await createCase(client, {
      caseId: '00000000-0000-4000-8000-000000000099',
      label: 'Synthetic private case',
      reviewerId: '00000000-0000-4000-8000-000000000012',
    });
    const listed = await api.inject({ url: '/api/v1/cases', headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual({ cases: [body.case] });
    await client.query('DELETE FROM case_memberships WHERE case_id = $1', [body.case.caseId]);
    const revoked = await api.inject({ url: '/api/v1/cases', headers });
    expect(revoked.statusCode).toBe(200);
    expect(revoked.json()).toEqual({ cases: [] });
    expect(
      (await client.query('SELECT label FROM cases WHERE case_id = $1', [body.case.caseId])).rows,
    ).toEqual([{ label: body.case.label }]);
  } finally {
    await api.close();
  }
});

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
  ).toEqual([
    { name: '202609230001_initial_case_metadata' },
    { name: '202609230002_original_upload_attempts' },
  ]);
  expect((await client.query('SHOW server_version_num')).rows).toEqual([
    { server_version_num: '180006' },
  ]);
});

test('registers a journaled original atomically in native PostgreSQL', async () => {
  await migrateCaseSchema(client);
  const caseId = '00000000-0000-4000-8000-000000000001';
  const reviewerId = '00000000-0000-4000-8000-000000000011';
  const documentVersionId = '00000000-0000-4000-8000-000000000021';
  await createCase(client, { caseId, reviewerId, label: 'Synthetic journaled case' });
  expect(
    await reserveOriginalUpload(client, { caseId, reviewerId, documentVersionId, maximumBytes: 3 }),
  ).toEqual({ caseId, reviewerId, documentVersionId, maximumBytes: 3, state: 'receiving' });
  const reference = { caseId, documentVersionId, sha256: 'a'.repeat(64), byteLength: 3 };
  expect(await completeOriginalUpload(client, reviewerId, reference)).toEqual(reference);
  expect(
    (
      await client.query(
        'SELECT state FROM original_upload_attempts WHERE case_id = $1 AND document_version_id = $2',
        [caseId, documentVersionId],
      )
    ).rows,
  ).toEqual([{ state: 'registered' }]);
  expect(await findOriginalReference(client, reviewerId, caseId, documentVersionId)).toEqual(
    reference,
  );
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
  expect(await migrateCaseSchema(client)).toHaveLength(2);
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
  expect(await migrateCaseSchema(client)).toHaveLength(2);
});

test('rejects migration history that does not match the repository plan', async () => {
  await migrateCaseSchema(client);
  const input = {
    caseId: '00000000-0000-4000-8000-000000000001',
    reviewerId: '00000000-0000-4000-8000-000000000011',
    label: 'Synthetic case with mismatched history',
  };
  await createCase(client, input);
  await client.query(`UPDATE record_review_migrations SET name = '209901010001_unknown'
    WHERE name = '202609230001_initial_case_metadata'`);
  await expect(migrateCaseSchema(client)).rejects.toThrow(
    'already run migration 209901010001_unknown',
  );
  expect(
    (await client.query('SELECT name FROM record_review_migrations ORDER BY id')).rows,
  ).toEqual([{ name: '209901010001_unknown' }, { name: '202609230002_original_upload_attempts' }]);
  expect(await listCasesForReviewer(client, input.reviewerId)).toEqual([
    { caseId: input.caseId, label: input.label, recordRevision: 1 },
  ]);
});

test('refuses automatic adoption of an existing unversioned case schema', async () => {
  await client.query(
    await readFile(
      new URL(
        '../../packages/case-repository/migrations/202609230001_initial_case_metadata.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const input = {
    caseId: '00000000-0000-4000-8000-000000000001',
    reviewerId: '00000000-0000-4000-8000-000000000011',
    label: 'Synthetic unversioned case',
  };
  await createCase(client, input);
  await expect(migrateCaseSchema(client)).rejects.toMatchObject({ code: '42P07' });
  expect((await client.query('SELECT name FROM record_review_migrations')).rows).toEqual([]);
  expect(await listCasesForReviewer(client, input.reviewerId)).toEqual([
    { caseId: input.caseId, label: input.label, recordRevision: 1 },
  ]);
});

test('loads the migration SQL from the compiled package layout', async () => {
  const compiled = (await import(
    new URL('../../packages/case-repository/dist/migrations.js', import.meta.url).href
  )) as typeof import('../../packages/case-repository/src/migrations.ts');
  expect(await compiled.migrateCaseSchema(client)).toHaveLength(2);
  expect(
    (
      await client.query(`SELECT to_regclass('public.cases') AS cases,
      to_regclass('public.case_memberships') AS memberships,
      to_regclass('public.original_references') AS originals`)
    ).rows,
  ).toEqual([
    { cases: 'cases', memberships: 'case_memberships', originals: 'original_references' },
  ]);
  expect((await client.query('SELECT name FROM record_review_migrations')).rows).toEqual([
    { name: '202609230001_initial_case_metadata' },
    { name: '202609230002_original_upload_attempts' },
  ]);
});
