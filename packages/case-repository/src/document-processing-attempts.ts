import type { SqlClient } from './cases.ts';

export type DocumentProcessingStatus = Readonly<{
  caseId: string;
  documentVersionId: string;
  reviewerId: string;
  extractionVersion: string;
  maximumBytes: number;
  maximumPages: number;
  state: 'queued' | 'processing' | 'published' | 'failed';
  attemptCount: number;
  failureCode: string | null;
}>;

export type DocumentProcessingClaim = DocumentProcessingStatus &
  Readonly<{ state: 'processing'; leaseToken: string }>;

type ProcessingIdentity = Readonly<{
  caseId: string;
  documentVersionId: string;
  extractionVersion: string;
}>;

export async function reserveDocumentProcessing(
  client: SqlClient,
  input: Omit<DocumentProcessingStatus, 'state' | 'attemptCount' | 'failureCode'>,
): Promise<DocumentProcessingStatus | undefined> {
  const result = await client.query<DocumentProcessingStatus>(
    `INSERT INTO document_processing_attempts (
      case_id, document_version_id, reviewer_id, extraction_version,
      maximum_bytes, maximum_pages
    )
    SELECT originals.case_id, originals.document_version_id, $3::uuid, $4, $5::bigint, $6
    FROM original_references AS originals
    JOIN case_memberships AS members ON members.case_id = originals.case_id
      AND members.reviewer_id = $3::uuid
    WHERE originals.case_id = $1::uuid AND originals.document_version_id = $2::uuid
    ON CONFLICT DO NOTHING
    RETURNING case_id AS "caseId", document_version_id AS "documentVersionId",
      reviewer_id AS "reviewerId", extraction_version AS "extractionVersion",
      maximum_bytes::float8 AS "maximumBytes", maximum_pages AS "maximumPages",
      state, attempt_count AS "attemptCount", failure_code AS "failureCode"`,
    [
      input.caseId,
      input.documentVersionId,
      input.reviewerId,
      input.extractionVersion,
      input.maximumBytes,
      input.maximumPages,
    ],
  );
  return result.rows[0];
}

export async function claimDocumentProcessing(
  client: SqlClient,
  input: Readonly<{ now: Date; leaseExpiresAt: Date; leaseToken: string }>,
): Promise<DocumentProcessingClaim | undefined> {
  const result = await client.query<DocumentProcessingClaim>(
    `WITH candidate AS (
      SELECT attempts.case_id, attempts.document_version_id, attempts.extraction_version
      FROM document_processing_attempts AS attempts
      JOIN case_memberships AS members ON members.case_id = attempts.case_id
        AND members.reviewer_id = attempts.reviewer_id
      JOIN original_references AS originals ON originals.case_id = attempts.case_id
        AND originals.document_version_id = attempts.document_version_id
      WHERE attempts.state = 'queued'
        OR (attempts.state = 'processing' AND attempts.lease_expires_at < $1)
      ORDER BY attempts.created_at, attempts.case_id,
        attempts.document_version_id, attempts.extraction_version
      LIMIT 1
      FOR UPDATE OF attempts SKIP LOCKED
    )
    UPDATE document_processing_attempts AS attempts
    SET state = 'processing', attempt_count = attempts.attempt_count + 1,
      failure_code = NULL, lease_token = $2::uuid, lease_expires_at = $3, updated_at = $1
    FROM candidate
    WHERE attempts.case_id = candidate.case_id
      AND attempts.document_version_id = candidate.document_version_id
      AND attempts.extraction_version = candidate.extraction_version
    RETURNING attempts.case_id AS "caseId",
      attempts.document_version_id AS "documentVersionId",
      attempts.reviewer_id AS "reviewerId",
      attempts.extraction_version AS "extractionVersion",
      attempts.maximum_bytes::float8 AS "maximumBytes",
      attempts.maximum_pages AS "maximumPages", attempts.state,
      attempts.attempt_count AS "attemptCount", attempts.failure_code AS "failureCode",
      attempts.lease_token AS "leaseToken"`,
    [input.now, input.leaseToken, input.leaseExpiresAt],
  );
  return result.rows[0];
}

export async function completeDocumentProcessing(
  client: SqlClient,
  input: ProcessingIdentity & Readonly<{ leaseToken: string }>,
): Promise<DocumentProcessingStatus | undefined> {
  const result = await client.query<DocumentProcessingStatus>(
    `UPDATE document_processing_attempts
    SET state = 'published', lease_token = NULL, lease_expires_at = NULL, updated_at = now()
    WHERE case_id = $1 AND document_version_id = $2 AND extraction_version = $3
      AND state = 'processing' AND lease_token = $4
    RETURNING case_id AS "caseId", document_version_id AS "documentVersionId",
      reviewer_id AS "reviewerId", extraction_version AS "extractionVersion",
      maximum_bytes::float8 AS "maximumBytes", maximum_pages AS "maximumPages",
      state, attempt_count AS "attemptCount", failure_code AS "failureCode"`,
    [input.caseId, input.documentVersionId, input.extractionVersion, input.leaseToken],
  );
  return result.rows[0];
}

export async function findDocumentProcessingForReviewer(
  client: SqlClient,
  reviewerId: string,
  caseId: string,
  documentVersionId: string,
  extractionVersion: string,
): Promise<DocumentProcessingStatus | undefined> {
  const result = await client.query<DocumentProcessingStatus>(
    `SELECT attempts.case_id AS "caseId",
      attempts.document_version_id AS "documentVersionId",
      attempts.reviewer_id AS "reviewerId",
      attempts.extraction_version AS "extractionVersion",
      attempts.maximum_bytes::float8 AS "maximumBytes",
      attempts.maximum_pages AS "maximumPages", attempts.state,
      attempts.attempt_count AS "attemptCount", attempts.failure_code AS "failureCode"
    FROM document_processing_attempts AS attempts
    JOIN case_memberships AS members ON members.case_id = attempts.case_id
      AND members.reviewer_id = $1
    JOIN original_references AS originals ON originals.case_id = attempts.case_id
      AND originals.document_version_id = attempts.document_version_id
    WHERE attempts.case_id = $2 AND attempts.document_version_id = $3
      AND attempts.extraction_version = $4`,
    [reviewerId, caseId, documentVersionId, extractionVersion],
  );
  return result.rows[0];
}
