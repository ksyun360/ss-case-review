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

export type TextSourceReference = Omit<TextSourceUnit, 'rawText'>;

export async function listTextSourcesForReviewer(
  client: SqlClient,
  reviewerId: string,
  caseId: string,
): Promise<TextSourceReference[]> {
  const result = await client.query<TextSourceReference>(
    `SELECT sources.source_unit_id AS "sourceUnitId", sources.case_id AS "caseId",
      sources.document_version_id AS "documentVersionId", sources.record_revision AS "recordRevision",
      sources.document_sha256 AS "documentSha256", sources.extraction_version AS "extractionVersion",
      sources.page_number AS "pageNumber"
    FROM text_source_units sources
    JOIN case_memberships members ON members.case_id = sources.case_id
    JOIN original_references originals ON originals.case_id = sources.case_id
      AND originals.document_version_id = sources.document_version_id
    JOIN cases ON cases.case_id = sources.case_id
    WHERE sources.case_id = $1 AND members.reviewer_id = $2
      AND originals.sha256 = sources.document_sha256
      AND cases.record_revision = sources.record_revision
    ORDER BY sources.document_version_id, sources.page_number,
      sources.extraction_version, sources.source_unit_id`,
    [caseId, reviewerId],
  );
  return result.rows;
}

export async function findTextSourceForReviewer(
  client: SqlClient,
  reviewerId: string,
  caseId: string,
  sourceUnitId: string,
): Promise<TextSourceUnit | undefined> {
  const result = await client.query<TextSourceUnit>(
    `SELECT sources.source_unit_id AS "sourceUnitId", sources.case_id AS "caseId",
      sources.document_version_id AS "documentVersionId", sources.record_revision AS "recordRevision",
      sources.document_sha256 AS "documentSha256", sources.extraction_version AS "extractionVersion",
      sources.page_number AS "pageNumber", sources.raw_text AS "rawText"
    FROM text_source_units sources
    JOIN case_memberships members ON members.case_id = sources.case_id
    JOIN original_references originals ON originals.case_id = sources.case_id
      AND originals.document_version_id = sources.document_version_id
    WHERE sources.case_id = $1 AND sources.source_unit_id = $2 AND members.reviewer_id = $3
      AND originals.sha256 = sources.document_sha256`,
    [caseId, sourceUnitId, reviewerId],
  );
  return result.rows[0];
}

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
