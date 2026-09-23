export type OriginalIdentity = Readonly<{ caseId: string; documentVersionId: string }>;

export type StoredOriginal = OriginalIdentity & Readonly<{ sha256: string; byteLength: number }>;

export async function readOriginal(
  root: string,
  _caseId: string,
  reference: StoredOriginal,
): Promise<Buffer | undefined> {
  const directory = join(root, createHash('sha256').update(reference.caseId).digest('hex'));
  const filename = createHash('sha256').update(reference.documentVersionId).digest('hex');
  return fs.readFile(join(directory, filename));
}

export async function writeOriginal(
  root: string,
  identity: OriginalIdentity,
  bytes: Uint8Array,
): Promise<StoredOriginal> {
  const content = Buffer.from(bytes);
  const { caseId, documentVersionId } = identity;
  const directory = join(root, createHash('sha256').update(caseId).digest('hex'));
  const filename = createHash('sha256').update(documentVersionId).digest('hex');
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const staging = await fs.mkdtemp(join(directory, '.pending-'));
  try {
    const stagedPath = join(staging, filename);
    await fs.writeFile(stagedPath, content, { mode: 0o600, flush: true });
    await fs.link(stagedPath, join(directory, filename));
  } finally {
    await fs.rm(staging, { recursive: true });
  }
  return {
    caseId,
    documentVersionId,
    sha256: createHash('sha256').update(content).digest('hex'),
    byteLength: content.byteLength,
  };
}
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { join } from 'node:path';
