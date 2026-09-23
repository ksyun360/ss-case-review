import { randomUUID } from 'node:crypto';
import { type OriginalReference, type SqlClient } from '@record-review/case-repository/cases';
import {
  completeOriginalUpload,
  reserveOriginalUpload,
} from '@record-review/case-repository/upload-attempts';
import { discardOriginal, writeOriginalStream } from '@record-review/record-storage/originals';

export async function storeOriginalForReviewer(
  database: SqlClient,
  reviewerId: string,
  caseId: string,
  root: string,
  chunks: AsyncIterable<Uint8Array>,
  maximumBytes: number,
): Promise<OriginalReference | undefined> {
  const documentVersionId = randomUUID();
  const reserved = await reserveOriginalUpload(database, {
    caseId,
    documentVersionId,
    reviewerId,
    maximumBytes,
  });
  if (!reserved) return undefined;
  const reference = await writeOriginalStream(
    root,
    { caseId, documentVersionId },
    chunks,
    maximumBytes,
  );
  let registered: OriginalReference | undefined;
  try {
    registered = await completeOriginalUpload(database, reviewerId, reference);
  } catch (error) {
    await discardOriginal(root, reference);
    throw error;
  }
  if (!registered) await discardOriginal(root, reference);
  return registered;
}
