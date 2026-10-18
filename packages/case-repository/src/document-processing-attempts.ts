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
  claims?: unknown;
}>;

export type DocumentProcessingClaim = DocumentProcessingStatus &
  Readonly<{ state: 'processing'; leaseToken: string }>;

export type DocumentProcessingFailureCode =
  | 'original_unavailable'
  | 'unsupported_document_format'
  | 'byte_budget_exceeded'
  | 'page_budget_exceeded'
  | 'extraction_failed'
  | 'publication_rejected';

type ProcessingIdentity = Readonly<{
  caseId: string;
  documentVersionId: string;
  extractionVersion: string;
}>;

type ProcessingRow = DocumentProcessingStatus & Readonly<{ claims: unknown | null }>;

function withoutEmptyClaims(row: ProcessingRow): DocumentProcessingStatus {
  const { claims, ...status } = row;
  return claims === null ? status : { ...status, claims };
}

export async function reserveDocumentProcessing(
  client: SqlClient,
  input: Omit<DocumentProcessingStatus, 'state' | 'attemptCount' | 'failureCode'>,
): Promise<DocumentProcessingStatus | undefined> {
  const result = await client.query<ProcessingRow>(
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
      state, attempt_count AS "attemptCount", failure_code AS "failureCode",
      NULL::jsonb AS claims`,
    [
      input.caseId,
      input.documentVersionId,
      input.reviewerId,
      input.extractionVersion,
      input.maximumBytes,
      input.maximumPages,
    ],
  );
  return result.rows[0] ? withoutEmptyClaims(result.rows[0]) : undefined;
}

export async function claimDocumentProcessing(
  client: SqlClient,
  input: Readonly<{ now: Date; leaseExpiresAt: Date; leaseToken: string }>,
): Promise<DocumentProcessingClaim | undefined> {
  const result = await client.query<ProcessingRow & Readonly<{ leaseToken: string }>>(
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
      NULL::jsonb AS claims,
      attempts.lease_token AS "leaseToken"`,
    [input.now, input.leaseToken, input.leaseExpiresAt],
  );
  return result.rows[0]
    ? (withoutEmptyClaims(result.rows[0]) as DocumentProcessingClaim)
    : undefined;
}

export async function completeDocumentProcessing(
  client: SqlClient,
  input: ProcessingIdentity & Readonly<{ leaseToken: string; claims?: unknown }>,
): Promise<DocumentProcessingStatus | undefined> {
  const result = await client.query<ProcessingRow>(
    `UPDATE document_processing_attempts
    SET state = 'published', lease_token = NULL, lease_expires_at = NULL,
      claims_json = $5::jsonb, updated_at = now()
    WHERE case_id = $1 AND document_version_id = $2 AND extraction_version = $3
      AND state = 'processing' AND lease_token = $4
    RETURNING case_id AS "caseId", document_version_id AS "documentVersionId",
      reviewer_id AS "reviewerId", extraction_version AS "extractionVersion",
      maximum_bytes::float8 AS "maximumBytes", maximum_pages AS "maximumPages",
      state, attempt_count AS "attemptCount", failure_code AS "failureCode",
      claims_json AS claims`,
    [
      input.caseId,
      input.documentVersionId,
      input.extractionVersion,
      input.leaseToken,
      input.claims === undefined ? null : JSON.stringify(input.claims),
    ],
  );
  return result.rows[0] ? withoutEmptyClaims(result.rows[0]) : undefined;
}

export async function failDocumentProcessing(
  client: SqlClient,
  input: ProcessingIdentity &
    Readonly<{ leaseToken: string; failureCode: DocumentProcessingFailureCode }>,
): Promise<DocumentProcessingStatus | undefined> {
  const result = await client.query<ProcessingRow>(
    `UPDATE document_processing_attempts
    SET state = 'failed', failure_code = $5, lease_token = NULL,
      lease_expires_at = NULL, updated_at = now()
    WHERE case_id = $1 AND document_version_id = $2 AND extraction_version = $3
      AND state = 'processing' AND lease_token = $4
    RETURNING case_id AS "caseId", document_version_id AS "documentVersionId",
      reviewer_id AS "reviewerId", extraction_version AS "extractionVersion",
      maximum_bytes::float8 AS "maximumBytes", maximum_pages AS "maximumPages",
      state, attempt_count AS "attemptCount", failure_code AS "failureCode",
      NULL::jsonb AS claims`,
    [
      input.caseId,
      input.documentVersionId,
      input.extractionVersion,
      input.leaseToken,
      input.failureCode,
    ],
  );
  return result.rows[0] ? withoutEmptyClaims(result.rows[0]) : undefined;
}

export async function findDocumentProcessingForReviewer(
  client: SqlClient,
  reviewerId: string,
  caseId: string,
  documentVersionId: string,
  extractionVersion: string,
): Promise<DocumentProcessingStatus | undefined> {
  const result = await client.query<ProcessingRow>(
    `SELECT attempts.case_id AS "caseId",
      attempts.document_version_id AS "documentVersionId",
      attempts.reviewer_id AS "reviewerId",
      attempts.extraction_version AS "extractionVersion",
      attempts.maximum_bytes::float8 AS "maximumBytes",
      attempts.maximum_pages AS "maximumPages", attempts.state,
      attempts.attempt_count AS "attemptCount", attempts.failure_code AS "failureCode",
      attempts.claims_json AS claims
    FROM document_processing_attempts AS attempts
    JOIN case_memberships AS members ON members.case_id = attempts.case_id
      AND members.reviewer_id = $1
    JOIN original_references AS originals ON originals.case_id = attempts.case_id
      AND originals.document_version_id = attempts.document_version_id
    WHERE attempts.case_id = $2 AND attempts.document_version_id = $3
      AND attempts.extraction_version = $4`,
    [reviewerId, caseId, documentVersionId, extractionVersion],
  );
  return result.rows[0] ? withoutEmptyClaims(result.rows[0]) : undefined;
}

export async function listDocumentProcessingForReviewer(
  client: SqlClient,
  reviewerId: string,
  caseId: string,
  extractionVersion = 'pdfjs-native-v1',
): Promise<DocumentProcessingStatus[]> {
  const result = await client.query<ProcessingRow>(
    `SELECT attempts.case_id AS "caseId",
      attempts.document_version_id AS "documentVersionId",
      attempts.reviewer_id AS "reviewerId",
      attempts.extraction_version AS "extractionVersion",
      attempts.maximum_bytes::float8 AS "maximumBytes",
      attempts.maximum_pages AS "maximumPages", attempts.state,
      attempts.attempt_count AS "attemptCount", attempts.failure_code AS "failureCode",
      attempts.claims_json AS claims
    FROM document_processing_attempts AS attempts
    JOIN case_memberships AS members ON members.case_id = attempts.case_id
      AND members.reviewer_id = attempts.reviewer_id
    WHERE members.reviewer_id = $1 AND attempts.case_id = $2
      AND attempts.extraction_version = $3
    ORDER BY attempts.document_version_id`,
    [reviewerId, caseId, extractionVersion],
  );
  return result.rows.map(withoutEmptyClaims);
}
