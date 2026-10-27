import type { SqlClient } from './cases.ts';

export type OriginalDocumentMetadata = Readonly<{
  caseId: string;
  documentVersionId: string;
  fileName: string;
  mediaType: string;
}>;

export async function registerOriginalDocumentMetadata(
  client: SqlClient,
  reviewerId: string,
  metadata: OriginalDocumentMetadata,
): Promise<OriginalDocumentMetadata | undefined> {
  const result = await client.query<OriginalDocumentMetadata>(
    `INSERT INTO original_document_metadata (
      case_id, document_version_id, file_name, media_type
    )
    SELECT originals.case_id, originals.document_version_id, $3, $4
    FROM original_references AS originals
    JOIN case_memberships AS members ON members.case_id = originals.case_id
      AND members.reviewer_id = $5
    WHERE originals.case_id = $1 AND originals.document_version_id = $2
    ON CONFLICT DO NOTHING
    RETURNING case_id AS "caseId", document_version_id AS "documentVersionId",
      file_name AS "fileName", media_type AS "mediaType"`,
    [
      metadata.caseId,
      metadata.documentVersionId,
      metadata.fileName,
      metadata.mediaType,
      reviewerId,
    ],
  );
  return result.rows[0];
}

export async function findOriginalDocumentMetadata(
  client: SqlClient,
  reviewerId: string,
  caseId: string,
  documentVersionId: string,
): Promise<OriginalDocumentMetadata | undefined> {
  const result = await client.query<OriginalDocumentMetadata>(
    `SELECT metadata.case_id AS "caseId",
      metadata.document_version_id AS "documentVersionId",
      metadata.file_name AS "fileName", metadata.media_type AS "mediaType"
    FROM original_document_metadata AS metadata
    JOIN case_memberships AS members ON members.case_id = metadata.case_id
      AND members.reviewer_id = $1
    WHERE metadata.case_id = $2 AND metadata.document_version_id = $3`,
    [reviewerId, caseId, documentVersionId],
  );
  return result.rows[0];
}

export async function listOriginalDocumentMetadataForReviewer(
  client: SqlClient,
  reviewerId: string,
  caseId: string,
): Promise<OriginalDocumentMetadata[]> {
  const result = await client.query<OriginalDocumentMetadata>(
    `SELECT metadata.case_id AS "caseId",
      metadata.document_version_id AS "documentVersionId",
      metadata.file_name AS "fileName", metadata.media_type AS "mediaType"
    FROM original_document_metadata AS metadata
    JOIN case_memberships AS members ON members.case_id = metadata.case_id
      AND members.reviewer_id = $1
    WHERE metadata.case_id = $2
    ORDER BY metadata.document_version_id`,
    [reviewerId, caseId],
  );
  return result.rows;
}
