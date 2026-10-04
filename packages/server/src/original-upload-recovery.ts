import type { SqlClient } from '@record-review/case-repository/cases';
import {
  failOriginalUpload,
  listRecoverableOriginalUploads,
} from '@record-review/case-repository/upload-attempts';
import { discardOriginal } from '@record-review/record-storage/originals';

type OriginalUploadRecoveryInput = Readonly<{
  database: SqlClient;
  root: string;
  olderThan: Date;
  limit: number;
}>;

function isMissingOriginal(error: unknown): boolean {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

export async function recoverStaleOriginalUploads(
  input: OriginalUploadRecoveryInput,
): Promise<number> {
  const attempts = await listRecoverableOriginalUploads(
    input.database,
    input.olderThan,
    input.limit,
  );
  let recovered = 0;
  for (const attempt of attempts) {
    const claimed = await failOriginalUpload(
      input.database,
      attempt.reviewerId,
      attempt.caseId,
      attempt.documentVersionId,
    );
    if (!claimed) continue;
    try {
      await discardOriginal(input.root, attempt);
    } catch (error) {
      if (!isMissingOriginal(error))
        throw new Error('original_upload_recovery_failed', { cause: error });
    }
    recovered += 1;
  }
  return recovered;
}
