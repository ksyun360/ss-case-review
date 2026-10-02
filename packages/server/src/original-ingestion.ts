import { randomUUID } from 'node:crypto';
import { type OriginalReference, type SqlClient } from '@record-review/case-repository/cases';
import { reserveDocumentProcessing } from '@record-review/case-repository/document-processing-attempts';
import {
  completeOriginalUpload,
  failOriginalUpload,
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
  let reference: OriginalReference;
  try {
    reference = await writeOriginalStream(
      root,
      { caseId, documentVersionId },
      chunks,
      maximumBytes,
    );
  } catch (error) {
    await failOriginalUpload(database, reviewerId, caseId, documentVersionId);
    throw error;
  }
  let registered: OriginalReference | undefined;
  try {
    registered = await completeOriginalUpload(database, reviewerId, reference);
  } catch (error) {
    await discardOriginal(root, reference);
    await failOriginalUpload(database, reviewerId, caseId, documentVersionId);
    throw error;
  }
  if (!registered) {
    await discardOriginal(root, reference);
    await failOriginalUpload(database, reviewerId, caseId, documentVersionId);
  }
  return registered;
}

type QueuedOriginalInput = Readonly<{
  database: SqlClient;
  reviewerId: string;
  caseId: string;
  root: string;
  chunks: AsyncIterable<Uint8Array>;
  maximumBytes: number;
  maximumPages: number;
  extractionVersion: string;
  reserveProcessing?: typeof reserveDocumentProcessing;
}>;

export async function storeOriginalAndQueueForReviewer(
  input: QueuedOriginalInput,
): Promise<OriginalReference | undefined> {
  const original = await storeOriginalForReviewer(
    input.database,
    input.reviewerId,
    input.caseId,
    input.root,
    input.chunks,
    input.maximumBytes,
  );
  if (!original) return undefined;
  const processing = await (input.reserveProcessing ?? reserveDocumentProcessing)(input.database, {
    caseId: input.caseId,
    documentVersionId: original.documentVersionId,
    reviewerId: input.reviewerId,
    extractionVersion: input.extractionVersion,
    maximumBytes: input.maximumBytes,
    maximumPages: input.maximumPages,
  });
  if (!processing) throw new Error('processing_reservation_failed');
  return original;
}
