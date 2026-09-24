import type { OriginalReference, SqlClient } from './cases.ts';

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

export async function completeOriginalUpload(
  client: SqlClient,
  reviewerId: string,
  reference: OriginalReference,
): Promise<OriginalReference | undefined> {
  const result = await client.query<OriginalReference>(
    `WITH inserted AS (
      INSERT INTO original_references (case_id, document_version_id, sha256, byte_length)
      SELECT attempts.case_id, attempts.document_version_id, $3, $4
      FROM original_upload_attempts AS attempts
      JOIN case_memberships AS members ON members.case_id = attempts.case_id
        AND members.reviewer_id = attempts.reviewer_id
      WHERE attempts.case_id = $1 AND attempts.document_version_id = $2
        AND attempts.reviewer_id = $5 AND attempts.state = 'receiving'
      RETURNING case_id, document_version_id, sha256, byte_length
    ), completed AS (
      UPDATE original_upload_attempts AS attempts
      SET state = 'registered', updated_at = now()
      FROM inserted
      WHERE attempts.case_id = inserted.case_id
        AND attempts.document_version_id = inserted.document_version_id
      RETURNING attempts.case_id, attempts.document_version_id
    )
    SELECT inserted.case_id AS "caseId", inserted.document_version_id AS "documentVersionId",
      inserted.sha256, inserted.byte_length::float8 AS "byteLength"
    FROM inserted JOIN completed USING (case_id, document_version_id)`,
    [
      reference.caseId,
      reference.documentVersionId,
      reference.sha256,
      reference.byteLength,
      reviewerId,
    ],
  );
  return result.rows[0];
}

export async function failOriginalUpload(
  client: SqlClient,
  reviewerId: string,
  caseId: string,
  documentVersionId: string,
): Promise<OriginalUploadAttempt | undefined> {
  const result = await client.query<OriginalUploadAttempt>(
    `UPDATE original_upload_attempts SET state = 'failed', updated_at = now()
    WHERE case_id = $1 AND document_version_id = $2 AND reviewer_id = $3
      AND state = 'receiving'
    RETURNING case_id AS "caseId", document_version_id AS "documentVersionId",
      reviewer_id AS "reviewerId", maximum_bytes::float8 AS "maximumBytes", state`,
    [caseId, documentVersionId, reviewerId],
  );
  return result.rows[0];
}

export async function listRecoverableOriginalUploads(
  client: SqlClient,
  olderThan: Date,
  limit: number,
): Promise<OriginalUploadAttempt[]> {
  const result = await client.query<OriginalUploadAttempt>(
    `SELECT case_id AS "caseId", document_version_id AS "documentVersionId",
      reviewer_id AS "reviewerId", maximum_bytes::float8 AS "maximumBytes", state
    FROM original_upload_attempts
    WHERE state = 'receiving' AND created_at < $1
    ORDER BY created_at, case_id, document_version_id
    LIMIT $2`,
    [olderThan, limit],
  );
  return result.rows;
}
