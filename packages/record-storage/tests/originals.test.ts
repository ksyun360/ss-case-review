import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { writeOriginal } from '../src/originals.ts';

let temporaryRoot: string;
let storageRoot: string;
const identity = { caseId: 'synthetic-case-a', documentVersionId: 'synthetic-document-v1' };
const bytes = Buffer.from('abc');
const sha256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

function caseDirectory(caseId = identity.caseId) {
  return join(storageRoot, createHash('sha256').update(caseId).digest('hex'));
}

function originalPath(documentVersionId = identity.documentVersionId, caseId = identity.caseId) {
  return join(caseDirectory(caseId), createHash('sha256').update(documentVersionId).digest('hex'));
}

beforeEach(async () => {
  temporaryRoot = await fs.mkdtemp(join(tmpdir(), 'record-review-storage-test-'));
  storageRoot = join(temporaryRoot, 'private', 'originals');
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(temporaryRoot, { recursive: true, force: true });
});

test('rejects replacement bytes for an existing document version without changing the original', async () => {
  await writeOriginal(storageRoot, identity, bytes);
  await expect(
    writeOriginal(storageRoot, identity, Buffer.from('replacement')),
  ).rejects.toMatchObject({
    code: 'EEXIST',
  });
  expect(await fs.readFile(originalPath())).toEqual(bytes);
});

test('stores exact original bytes privately and returns their SHA-256 metadata', async () => {
  expect(await writeOriginal(storageRoot, identity, bytes)).toEqual({
    ...identity,
    sha256,
    byteLength: 3,
  });
  expect(await fs.readFile(originalPath())).toEqual(bytes);
  expect((await fs.stat(originalPath())).mode & 0o777).toBe(0o600);
  expect((await fs.stat(caseDirectory())).mode & 0o777).toBe(0o700);
});
