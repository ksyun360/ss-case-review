import type { SqlClient } from './cases.ts';

export type TextSourceUnit = Readonly<{
  sourceUnitId: string;
  caseId: string;
  documentVersionId: string;
  recordRevision: number;
  documentSha256: string;
  extractionVersion: string;
  pageNumber: number;
  rawText: string;
}>;

export async function insertTextSourceForReviewer(
  client: SqlClient,
  reviewerId: string,
  source: TextSourceUnit,
): Promise<TextSourceUnit | undefined> {
  const result = await client.query<TextSourceUnit>(
    `INSERT INTO text_source_units (
      source_unit_id, case_id, document_version_id, record_revision,
      document_sha256, extraction_version, page_number, raw_text
    )
    SELECT $1, case_id, $3, $4, $5, $6, $7, $8
    FROM case_memberships JOIN original_references USING (case_id)
      JOIN cases USING (case_id)
    WHERE case_id = $2 AND reviewer_id = $9 AND document_version_id = $3
      AND sha256 = $5 AND cases.record_revision = $4
    RETURNING source_unit_id AS "sourceUnitId", case_id AS "caseId",
      document_version_id AS "documentVersionId", record_revision AS "recordRevision",
      document_sha256 AS "documentSha256", extraction_version AS "extractionVersion",
      page_number AS "pageNumber", raw_text AS "rawText"`,
    [
      source.sourceUnitId,
      source.caseId,
      source.documentVersionId,
      source.recordRevision,
      source.documentSha256,
      source.extractionVersion,
      source.pageNumber,
      source.rawText,
      reviewerId,
    ],
  );
  return result.rows[0];
}
