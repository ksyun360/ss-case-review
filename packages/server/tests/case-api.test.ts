import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import {
  createCase,
  findOriginalReference,
  registerOriginalReference,
} from '@record-review/case-repository/cases';
import * as originalStorage from '@record-review/record-storage/originals';
import {
  findTextSourceForReviewer,
  insertTextSourceForReviewer,
} from '@record-review/case-repository/source-units';
import { readOriginal, writeOriginalStream } from '@record-review/record-storage/originals';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { createDevelopmentApi } from '../src/case-api.ts';
import { requestHeaders } from './fixtures.ts';

const environment = {
  APP_ENV: 'development',
  DATA_CLASSIFICATION: 'synthetic',
  AUTH_MODE: 'development',
  BIND_ADDRESS: '127.0.0.1',
};
const reviewerId = '00000000-0000-4000-8000-000000000011';
const otherReviewerId = '00000000-0000-4000-8000-000000000012';
let database: PGlite;
let api: ReturnType<typeof createDevelopmentApi>;

beforeAll(async () => {
  database = await PGlite.create();
});
beforeEach(async () => {
  await database.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await database.exec(
    await readFile(
      new URL(
        '../../case-repository/migrations/202609230001_initial_case_metadata.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  await database.exec(
    await readFile(
      new URL(
        '../../case-repository/migrations/202609230002_original_upload_attempts.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  api = createDevelopmentApi(environment, database);
});
afterEach(async () => {
  await api.close();
});
afterAll(async () => {
  await database.close();
});

test('lists current text source metadata through a guarded member-scoped route', async () => {
  const migration = await readFile(
    new URL('../../case-repository/migrations/202609280001_text_source_units.sql', import.meta.url),
    'utf8',
  );
  await database.exec(migration.replace(/-- Down Migration[\s\S]*$/, ''));
  const source = {
    sourceUnitId: '00000000-0000-4000-8000-000000000031',
    caseId: '00000000-0000-4000-8000-000000000001',
    documentVersionId: '00000000-0000-4000-8000-000000000021',
    recordRevision: 1,
    documentSha256: 'a'.repeat(64),
    extractionVersion: 'synthetic-native-v1',
    pageNumber: 1,
    rawText: 'Synthetic source text excluded from inventory',
  };
  await createCase(database, {
    caseId: source.caseId,
    reviewerId,
    label: 'Synthetic source inventory case',
  });
  await registerOriginalReference(database, reviewerId, {
    caseId: source.caseId,
    documentVersionId: source.documentVersionId,
    sha256: source.documentSha256,
    byteLength: 100,
  });
  await insertTextSourceForReviewer(database, reviewerId, source);

  const response = await api.inject({
    method: 'GET',
    url: `/api/v1/cases/${source.caseId}/text-sources`,
    headers: requestHeaders,
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({
    sources: [
      {
        sourceUnitId: source.sourceUnitId,
        caseId: source.caseId,
        documentVersionId: source.documentVersionId,
        recordRevision: source.recordRevision,
        documentSha256: source.documentSha256,
        extractionVersion: source.extractionVersion,
        pageNumber: source.pageNumber,
      },
    ],
  });
  expect(response.headers['cache-control']).toBe('no-store');

  const emptyCaseId = '00000000-0000-4000-8000-000000000003';
  await createCase(database, {
    caseId: emptyCaseId,
    reviewerId,
    label: 'Synthetic empty source case',
  });
  const empty = await api.inject({
    method: 'GET',
    url: `/api/v1/cases/${emptyCaseId}/text-sources`,
    headers: requestHeaders,
  });
  expect(empty.statusCode).toBe(200);
  expect(empty.json()).toEqual({ sources: [] });

  const hiddenCaseId = '00000000-0000-4000-8000-000000000004';
  await createCase(database, {
    caseId: hiddenCaseId,
    reviewerId: otherReviewerId,
    label: 'Synthetic hidden source case',
  });
  const hidden = await api.inject({
    method: 'GET',
    url: `/api/v1/cases/${hiddenCaseId}/text-sources`,
    headers: requestHeaders,
  });
  expect(hidden.statusCode).toBe(404);
  expect(hidden.json()).toEqual({ code: 'case_not_found' });

  const query = vi.spyOn(database, 'query');
  try {
    const invalid = await api.inject({
      method: 'GET',
      url: '/api/v1/cases/invalid/text-sources',
      headers: requestHeaders,
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toEqual({ code: 'invalid_request' });
    expect(query).not.toHaveBeenCalled();
    query.mockRejectedValueOnce(new Error('Synthetic private inventory diagnostic'));
    const unavailable = await api.inject({
      method: 'GET',
      url: `/api/v1/cases/${source.caseId}/text-sources`,
      headers: requestHeaders,
    });
    expect(unavailable.statusCode).toBe(503);
    expect(unavailable.json()).toEqual({ code: 'case_service_unavailable' });
  } finally {
    query.mockRestore();
  }
});

test('opens stored page text through a guarded member-scoped source route', async () => {
  const migration = await readFile(
    new URL('../../case-repository/migrations/202609280001_text_source_units.sql', import.meta.url),
    'utf8',
  );
  await database.exec(migration.replace(/-- Down Migration[\s\S]*$/, ''));
  const source = {
    sourceUnitId: '00000000-0000-4000-8000-000000000031',
    caseId: '00000000-0000-4000-8000-000000000001',
    documentVersionId: '00000000-0000-4000-8000-000000000021',
    recordRevision: 1,
    documentSha256: 'a'.repeat(64),
    extractionVersion: 'synthetic-native-v1',
    pageNumber: 1,
    rawText: 'Synthetic source A😀B\nLiteral quotation',
  };
  await createCase(database, {
    caseId: source.caseId,
    reviewerId,
    label: 'Synthetic source API case',
  });
  await registerOriginalReference(database, reviewerId, {
    caseId: source.caseId,
    documentVersionId: source.documentVersionId,
    sha256: source.documentSha256,
    byteLength: 100,
  });
  await insertTextSourceForReviewer(database, reviewerId, source);
  const url = `/api/v1/cases/${source.caseId}/text-sources/${source.sourceUnitId}`;
  const response = await api.inject({ method: 'GET', url, headers: requestHeaders });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ source });
  expect(response.headers['cache-control']).toBe('no-store');
  const absent = await api.inject({
    method: 'GET',
    url: `/api/v1/cases/${source.caseId}/text-sources/00000000-0000-4000-8000-000000000032`,
    headers: requestHeaders,
  });
  expect(absent.statusCode).toBe(404);
  expect(absent.json()).toEqual({ code: 'source_not_found' });
  const query = vi.spyOn(database, 'query');
  try {
    for (const invalidUrl of [
      `/api/v1/cases/invalid/text-sources/${source.sourceUnitId}`,
      `/api/v1/cases/${source.caseId}/text-sources/invalid`,
    ]) {
      const invalid = await api.inject({ method: 'GET', url: invalidUrl, headers: requestHeaders });
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json()).toEqual({ code: 'invalid_request' });
    }
    expect(query).not.toHaveBeenCalled();
    query.mockRejectedValueOnce(new Error('Synthetic private source diagnostic'));
    const unavailable = await api.inject({ method: 'GET', url, headers: requestHeaders });
    expect(unavailable.statusCode).toBe(503);
    expect(unavailable.json()).toEqual({ code: 'case_service_unavailable' });
  } finally {
    query.mockRestore();
  }
});

test('hides another reviewer text source through the guarded source route', async () => {
  const migration = await readFile(
    new URL('../../case-repository/migrations/202609280001_text_source_units.sql', import.meta.url),
    'utf8',
  );
  await database.exec(migration.replace(/-- Down Migration[\s\S]*$/, ''));
  const source = {
    sourceUnitId: '00000000-0000-4000-8000-000000000031',
    caseId: '00000000-0000-4000-8000-000000000002',
    documentVersionId: '00000000-0000-4000-8000-000000000022',
    recordRevision: 1,
    documentSha256: 'b'.repeat(64),
    extractionVersion: 'synthetic-native-v1',
    pageNumber: 1,
    rawText: 'Synthetic private source text',
  };
  await createCase(database, {
    caseId: source.caseId,
    reviewerId: otherReviewerId,
    label: 'Synthetic private source API case',
  });
  await registerOriginalReference(database, otherReviewerId, {
    caseId: source.caseId,
    documentVersionId: source.documentVersionId,
    sha256: source.documentSha256,
    byteLength: 100,
  });
  await insertTextSourceForReviewer(database, otherReviewerId, source);
  expect(
    await findTextSourceForReviewer(database, otherReviewerId, source.caseId, source.sourceUnitId),
  ).toEqual(source);

  const response = await api.inject({
    method: 'GET',
    url: `/api/v1/cases/${source.caseId}/text-sources/${source.sourceUnitId}`,
    headers: requestHeaders,
  });
  expect(response.statusCode).toBe(404);
  expect(response.json()).toEqual({ code: 'source_not_found' });
  expect(response.headers['cache-control']).toBe('no-store');
});

test('lists only server-selected reviewer cases despite request identity claims', async () => {
  const visible = {
    caseId: '00000000-0000-4000-8000-000000000001',
    label: 'Synthetic visible case',
    reviewerId,
  };
  await createCase(database, visible);
  await createCase(database, {
    caseId: '00000000-0000-4000-8000-000000000002',
    label: 'Synthetic other reviewer case',
    reviewerId: otherReviewerId,
  });
  const response = await api.inject({
    method: 'GET',
    url: `/api/v1/cases?reviewerId=${otherReviewerId}`,
    headers: { ...requestHeaders, 'x-reviewer-id': otherReviewerId },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({
    cases: [{ caseId: visible.caseId, label: visible.label, recordRevision: 1 }],
  });
});

test('reports synthetic upload availability without disclosing storage configuration', async () => {
  const disabled = await api.inject({ url: '/api/v1/capabilities', headers: requestHeaders });
  expect(disabled.statusCode).toBe(200);
  expect(disabled.json()).toEqual({ syntheticOriginalUpload: false });
  await api.close();
  api = createDevelopmentApi(environment, database, {
    root: '/synthetic-private-root',
    maximumBytes: 3,
  });
  const enabled = await api.inject({ url: '/api/v1/capabilities', headers: requestHeaders });
  expect(enabled.statusCode).toBe(200);
  expect(enabled.json()).toEqual({ syntheticOriginalUpload: true });
  expect(enabled.body).not.toContain('synthetic-private-root');
});

test('opens only a case assigned to the configured development reviewer', async () => {
  const visibleId = '00000000-0000-4000-8000-000000000001';
  const hiddenId = '00000000-0000-4000-8000-000000000002';
  await createCase(database, { caseId: visibleId, label: 'Synthetic visible case', reviewerId });
  await createCase(database, {
    caseId: hiddenId,
    label: 'Synthetic hidden case',
    reviewerId: otherReviewerId,
  });
  const visible = await api.inject({ url: `/api/v1/cases/${visibleId}`, headers: requestHeaders });
  expect(visible.statusCode).toBe(200);
  expect(visible.json()).toEqual({
    case: { caseId: visibleId, label: 'Synthetic visible case', recordRevision: 1 },
  });
  const hidden = await api.inject({ url: `/api/v1/cases/${hiddenId}`, headers: requestHeaders });
  expect(hidden.statusCode).toBe(404);
  expect(hidden.json()).toEqual({ code: 'case_not_found' });
  const malformed = await api.inject({ url: '/api/v1/cases/not-a-uuid', headers: requestHeaders });
  expect(malformed.statusCode).toBe(400);
  expect(malformed.json()).toEqual({ code: 'invalid_request' });
});

test('lists original metadata for a member case without exposing another case', async () => {
  const caseId = '00000000-0000-4000-8000-000000000031';
  const emptyCaseId = '00000000-0000-4000-8000-000000000032';
  const otherCaseId = '00000000-0000-4000-8000-000000000033';
  const memberOriginal = {
    caseId,
    documentVersionId: '00000000-0000-4000-8000-000000000041',
    sha256: 'a'.repeat(64),
    byteLength: 12,
  };
  await createCase(database, { caseId, reviewerId, label: 'Synthetic inventory' });
  await createCase(database, { caseId: emptyCaseId, reviewerId, label: 'Empty inventory' });
  await createCase(database, {
    caseId: otherCaseId,
    reviewerId: otherReviewerId,
    label: 'Private inventory',
  });
  await registerOriginalReference(database, reviewerId, memberOriginal);
  await registerOriginalReference(database, otherReviewerId, {
    ...memberOriginal,
    caseId: otherCaseId,
    sha256: 'b'.repeat(64),
  });
  const listed = await api.inject({
    url: `/api/v1/cases/${caseId}/synthetic-originals`,
    headers: requestHeaders,
  });
  expect(listed.statusCode).toBe(200);
  expect(listed.json()).toEqual({ originals: [memberOriginal] });
  const empty = await api.inject({
    url: `/api/v1/cases/${emptyCaseId}/synthetic-originals`,
    headers: requestHeaders,
  });
  expect(empty.statusCode).toBe(200);
  expect(empty.json()).toEqual({ originals: [] });
  for (const hiddenCaseId of [otherCaseId, '00000000-0000-4000-8000-000000000099']) {
    const hidden = await api.inject({
      url: `/api/v1/cases/${hiddenCaseId}/synthetic-originals`,
      headers: requestHeaders,
    });
    expect(hidden.statusCode).toBe(404);
    expect(hidden.json()).toEqual({ code: 'case_not_found' });
  }
  const malformed = await api.inject({
    url: '/api/v1/cases/not-a-uuid/synthetic-originals',
    headers: requestHeaders,
  });
  expect(malformed.statusCode).toBe(400);
  expect(malformed.json()).toEqual({ code: 'invalid_request' });
});

test('creates a synthetic draft with a server-generated identity and creator membership', async () => {
  const response = await api.inject({
    method: 'POST',
    url: '/api/v1/cases',
    payload: { label: '  Synthetic draft  ' },
    headers: { ...requestHeaders, origin: 'http://127.0.0.1:5175' },
  });
  expect(response.statusCode).toBe(201);
  const body = response.json<{ case: { caseId: string; label: string; recordRevision: number } }>();
  expect(body).toEqual({
    case: {
      caseId: expect.stringMatching(
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
      ),
      label: 'Synthetic draft',
      recordRevision: 1,
    },
  });
  expect((await database.query('SELECT case_id, reviewer_id FROM case_memberships')).rows).toEqual([
    { case_id: body.case.caseId, reviewer_id: reviewerId },
  ]);
  expect((await api.inject({ url: '/api/v1/cases', headers: requestHeaders })).json()).toEqual({
    cases: [body.case],
  });
});

test('returns a safe failure when case creation rolls back in the database', async () => {
  await database.exec(
    'ALTER TABLE case_memberships ADD CONSTRAINT synthetic_private_failure CHECK (false)',
  );
  const response = await api.inject({
    method: 'POST',
    url: '/api/v1/cases',
    payload: { label: 'Synthetic rejected draft' },
    headers: requestHeaders,
  });
  expect(response.statusCode).toBe(503);
  expect(response.json()).toEqual({ code: 'case_service_unavailable' });
  expect((await database.query('SELECT * FROM cases')).rows).toEqual([]);
  expect((await database.query('SELECT * FROM case_memberships')).rows).toEqual([]);
});

test('accepts one synthetic original as streamed bytes for a member case', async () => {
  const root = await mkdtemp(join(tmpdir(), 'record-review-api-original-test-'));
  const caseId = '00000000-0000-4000-8000-000000000003';
  try {
    const disabled = await api.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/synthetic-originals`,
      headers: { ...requestHeaders, 'content-type': 'application/octet-stream' },
      payload: Buffer.from('abc'),
    });
    expect(disabled.statusCode).toBe(404);
    await api.close();
    api = createDevelopmentApi(environment, database, { root, maximumBytes: 3 });
    await createCase(database, { caseId, reviewerId, label: 'Synthetic original case' });
    const response = await api.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/synthetic-originals`,
      headers: { ...requestHeaders, 'content-type': 'application/octet-stream' },
      payload: Buffer.from('abc'),
    });
    expect(response.statusCode).toBe(201);
    const reference = response.json<{
      original: {
        caseId: string;
        documentVersionId: string;
        sha256: string;
        byteLength: number;
      };
    }>().original;
    expect(reference).toEqual({
      caseId,
      documentVersionId: expect.stringMatching(/^[a-f0-9-]{36}$/),
      sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      byteLength: 3,
    });
    expect(await readOriginal(root, caseId, reference)).toEqual(Buffer.from('abc'));
    expect(
      await findOriginalReference(database, reviewerId, caseId, reference.documentVersionId),
    ).toEqual(reference);
    expect((await database.query('SELECT state FROM original_upload_attempts')).rows).toEqual([
      { state: 'registered' },
    ]);
    const malformed = await api.inject({
      method: 'POST',
      url: '/api/v1/cases/not-a-uuid/synthetic-originals',
      headers: { ...requestHeaders, 'content-type': 'application/octet-stream' },
      payload: Buffer.from('abc'),
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toEqual({ code: 'invalid_request' });
    expect(
      (await database.query('SELECT count(*)::int AS count FROM original_upload_attempts')).rows,
    ).toEqual([{ count: 1 }]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('downloads a member original as non-inline bytes after verifying its stored reference', async () => {
  const root = await mkdtemp(join(tmpdir(), 'record-review-api-download-test-'));
  const caseId = '00000000-0000-4000-8000-000000000013';
  try {
    await api.close();
    api = createDevelopmentApi(environment, database, { root, maximumBytes: 3 });
    await createCase(database, { caseId, reviewerId, label: 'Synthetic download case' });
    const uploaded = await api.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/synthetic-originals`,
      headers: { ...requestHeaders, 'content-type': 'application/octet-stream' },
      payload: Buffer.from('abc'),
    });
    expect(uploaded.statusCode).toBe(201);
    const versionId = uploaded.json<{ original: { documentVersionId: string } }>().original
      .documentVersionId;
    const downloaded = await api.inject({
      method: 'GET',
      url: `/api/v1/cases/${caseId}/synthetic-originals/${versionId}`,
      headers: requestHeaders,
    });
    expect(downloaded.statusCode).toBe(200);
    expect(downloaded.headers['content-type']).toMatch(/^application\/octet-stream/);
    expect(downloaded.headers['content-disposition']).toBe('attachment');
    expect(downloaded.headers['x-content-type-options']).toBe('nosniff');
    expect(downloaded.headers['cache-control']).toBe('no-store');
    expect(downloaded.rawPayload).toEqual(Buffer.from('abc'));
    const missing = await api.inject({
      method: 'GET',
      url: `/api/v1/cases/${caseId}/synthetic-originals/00000000-0000-4000-8000-000000000099`,
      headers: requestHeaders,
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ code: 'original_not_found' });
    for (const url of [
      `/api/v1/cases/not-a-uuid/synthetic-originals/${versionId}`,
      `/api/v1/cases/${caseId}/synthetic-originals/not-a-uuid`,
    ]) {
      const malformed = await api.inject({ method: 'GET', url, headers: requestHeaders });
      expect(malformed.statusCode).toBe(400);
      expect(malformed.json()).toEqual({ code: 'invalid_request' });
    }
    const read = vi.spyOn(originalStorage, 'readOriginal').mockResolvedValueOnce(undefined);
    try {
      const inconsistent = await api.inject({
        method: 'GET',
        url: `/api/v1/cases/${caseId}/synthetic-originals/${versionId}`,
        headers: requestHeaders,
      });
      expect(inconsistent.statusCode).toBe(404);
      expect(inconsistent.json()).toEqual({ code: 'original_not_found' });
    } finally {
      read.mockRestore();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('hides another reviewer original even when its reference and bytes exist', async () => {
  const root = await mkdtemp(join(tmpdir(), 'record-review-api-private-download-test-'));
  const caseId = '00000000-0000-4000-8000-000000000014';
  const documentVersionId = '00000000-0000-4000-8000-000000000024';
  try {
    await api.close();
    api = createDevelopmentApi(environment, database, { root, maximumBytes: 3 });
    await createCase(database, { caseId, reviewerId: otherReviewerId, label: 'Other reviewer' });
    const stored = await writeOriginalStream(
      root,
      { caseId, documentVersionId },
      (async function* () {
        yield Buffer.from('xyz');
      })(),
      3,
    );
    expect(await registerOriginalReference(database, otherReviewerId, stored)).toEqual(stored);
    const read = vi.spyOn(originalStorage, 'readOriginal');
    try {
      for (const requestedCaseId of [caseId, '00000000-0000-4000-8000-000000000099']) {
        const hidden = await api.inject({
          method: 'GET',
          url: `/api/v1/cases/${requestedCaseId}/synthetic-originals/${documentVersionId}`,
          headers: requestHeaders,
        });
        expect(hidden.statusCode).toBe(404);
        expect(hidden.json()).toEqual({ code: 'original_not_found' });
        expect(hidden.rawPayload).not.toEqual(Buffer.from('xyz'));
      }
      expect(read).not.toHaveBeenCalled();
    } finally {
      read.mockRestore();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('refuses a nonmember synthetic original without storing bytes or an attempt', async () => {
  const root = await mkdtemp(join(tmpdir(), 'record-review-api-original-test-'));
  const caseId = '00000000-0000-4000-8000-000000000004';
  try {
    await api.close();
    api = createDevelopmentApi(environment, database, { root, maximumBytes: 3 });
    await createCase(database, {
      caseId,
      reviewerId: otherReviewerId,
      label: 'Other reviewer case',
    });
    const response = await api.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/synthetic-originals`,
      headers: { ...requestHeaders, 'content-type': 'application/octet-stream' },
      payload: Buffer.from('abc'),
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ code: 'case_not_found' });
    expect(await readdir(root)).toEqual([]);
    expect((await database.query('SELECT * FROM original_upload_attempts')).rows).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects an oversized synthetic original with a safe response and no stored bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'record-review-api-original-test-'));
  const caseId = '00000000-0000-4000-8000-000000000005';
  try {
    await api.close();
    api = createDevelopmentApi(environment, database, { root, maximumBytes: 3 });
    await createCase(database, { caseId, reviewerId, label: 'Oversized original case' });
    const response = await api.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/synthetic-originals`,
      headers: { ...requestHeaders, 'content-type': 'application/octet-stream' },
      payload: Buffer.from('abcd'),
    });
    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({ code: 'request_too_large' });
    expect((await database.query('SELECT state FROM original_upload_attempts')).rows).toEqual([
      { state: 'failed' },
    ]);
    expect((await database.query('SELECT * FROM original_references')).rows).toEqual([]);
    const caseDirectories = await readdir(root);
    expect(caseDirectories).toHaveLength(1);
    const [directory] = caseDirectories;
    if (!directory) throw new Error('Expected a case storage directory');
    expect(await readdir(join(root, directory))).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects an unsupported synthetic original media type without an upload attempt', async () => {
  const root = await mkdtemp(join(tmpdir(), 'record-review-api-original-test-'));
  const caseId = '00000000-0000-4000-8000-000000000006';
  try {
    await api.close();
    api = createDevelopmentApi(environment, database, { root, maximumBytes: 3 });
    await createCase(database, { caseId, reviewerId, label: 'Unsupported media case' });
    const response = await api.inject({
      method: 'POST',
      url: `/api/v1/cases/${caseId}/synthetic-originals`,
      headers: { ...requestHeaders, 'content-type': 'application/octet-stream; charset=utf-8' },
      payload: 'abc',
    });
    expect(response.statusCode).toBe(415);
    expect(response.json()).toEqual({ code: 'unsupported_media_type' });
    expect((await database.query('SELECT * FROM original_upload_attempts')).rows).toEqual([]);
    expect(await readdir(root)).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
