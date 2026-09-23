import { randomUUID } from 'node:crypto';
import {
  findCaseForReviewer,
  registerOriginalReference,
  type OriginalReference,
  type SqlClient,
} from '@record-review/case-repository/cases';
import { discardOriginal, writeOriginalStream } from '@record-review/record-storage/originals';

export async function storeOriginalForReviewer(
  database: SqlClient,
  reviewerId: string,
  caseId: string,
  root: string,
  chunks: AsyncIterable<Uint8Array>,
  maximumBytes: number,
): Promise<OriginalReference | undefined> {
  const found = await findCaseForReviewer(database, reviewerId, caseId);
  if (!found) return undefined;
  const reference = await writeOriginalStream(
    root,
    { caseId, documentVersionId: randomUUID() },
    chunks,
    maximumBytes,
  );
  let registered: OriginalReference | undefined;
  try {
    registered = await registerOriginalReference(database, reviewerId, reference);
  } catch (error) {
    await discardOriginal(root, reference);
    throw error;
  }
  if (!registered) await discardOriginal(root, reference);
  return registered;
}
