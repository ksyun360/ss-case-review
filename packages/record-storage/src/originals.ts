export type OriginalIdentity = Readonly<{ caseId: string; documentVersionId: string }>;

export type StoredOriginal = OriginalIdentity & Readonly<{ sha256: string; byteLength: number }>;

export async function writeOriginal(
  root: string,
  identity: OriginalIdentity,
  bytes: Uint8Array,
): Promise<StoredOriginal> {
  const directory = join(root, createHash('sha256').update(identity.caseId).digest('hex'));
  const filename = createHash('sha256').update(identity.documentVersionId).digest('hex');
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const staging = await fs.mkdtemp(join(directory, '.pending-'));
  try {
    const stagedPath = join(staging, filename);
    await fs.writeFile(stagedPath, bytes, { mode: 0o600 });
    await fs.link(stagedPath, join(directory, filename));
  } finally {
    await fs.rm(staging, { recursive: true });
  }
  return {
    ...identity,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    byteLength: bytes.byteLength,
  };
}
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { join } from 'node:path';
