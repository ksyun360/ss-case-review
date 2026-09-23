import type { SqlClient } from './cases.ts';

export type OriginalUploadAttempt = Readonly<{
  caseId: string;
  documentVersionId: string;
  reviewerId: string;
  maximumBytes: number;
  state: 'receiving' | 'registered' | 'failed';
}>;

export async function reserveOriginalUpload(
  client: SqlClient,
  input: Omit<OriginalUploadAttempt, 'state'>,
): Promise<OriginalUploadAttempt | undefined> {
  const result = await client.query<OriginalUploadAttempt>(
    `INSERT INTO original_upload_attempts
      (case_id, document_version_id, reviewer_id, maximum_bytes)
    SELECT case_id, $2::uuid, $3::uuid, $4::bigint FROM case_memberships
    WHERE case_id = $1::uuid AND reviewer_id = $3::uuid
    RETURNING case_id AS "caseId", document_version_id AS "documentVersionId",
      reviewer_id AS "reviewerId", maximum_bytes::float8 AS "maximumBytes", state`,
    [input.caseId, input.documentVersionId, input.reviewerId, input.maximumBytes],
  );
  return result.rows[0];
}
