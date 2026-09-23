import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { join } from 'node:path';

export type OriginalIdentity = Readonly<{ caseId: string; documentVersionId: string }>;

export type StoredOriginal = OriginalIdentity & Readonly<{ sha256: string; byteLength: number }>;

export async function writeOriginalStream(
  root: string,
  identity: OriginalIdentity,
  chunks: AsyncIterable<Uint8Array>,
): Promise<StoredOriginal> {
  const { caseId, documentVersionId } = identity;
  const directory = join(root, createHash('sha256').update(caseId).digest('hex'));
  const filename = createHash('sha256').update(documentVersionId).digest('hex');
  const hash = createHash('sha256');
  let byteLength = 0;
  async function* preparedChunks() {
    for await (const chunk of chunks) {
      const content = Buffer.from(chunk);
      hash.update(content);
      byteLength += content.byteLength;
      yield content;
    }
  }
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const staging = await fs.mkdtemp(join(directory, '.pending-'));
  try {
    const handle = await fs.open(join(staging, filename), 'wx', 0o600);
    try {
      await handle.writeFile(preparedChunks());
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.link(join(staging, filename), join(directory, filename));
  } finally {
    await fs.rm(staging, { recursive: true });
  }
  return { caseId, documentVersionId, sha256: hash.digest('hex'), byteLength };
}

export async function readOriginal(
  root: string,
  caseId: string,
  reference: StoredOriginal,
): Promise<Buffer | undefined> {
  if (reference.caseId !== caseId) {
    return undefined;
  }

  const directory = join(root, createHash('sha256').update(reference.caseId).digest('hex'));
  const filename = createHash('sha256').update(reference.documentVersionId).digest('hex');
  const { sha256, byteLength } = reference;
  const bytes = await fs.readFile(join(directory, filename));
  if (
    bytes.byteLength !== byteLength ||
    createHash('sha256').update(bytes).digest('hex') !== sha256
  ) {
    throw new Error('Stored original failed its integrity check');
  }
  return bytes;
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
