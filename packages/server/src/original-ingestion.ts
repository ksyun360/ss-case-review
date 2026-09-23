import { randomUUID } from 'node:crypto';
import {
  findCaseForReviewer,
  registerOriginalReference,
  type OriginalReference,
  type SqlClient,
} from '@record-review/case-repository/cases';
import { writeOriginalStream } from '@record-review/record-storage/originals';

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
  return registerOriginalReference(database, reviewerId, reference);
}
