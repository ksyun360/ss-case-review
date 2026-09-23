import type { QueryResultRow } from 'pg';

export type SqlClient = {
  query<Row extends QueryResultRow>(
    statement: string,
    parameters?: unknown[],
  ): Promise<{ rows: Row[] }>;
};

export type CaseRecord = Readonly<{ caseId: string; label: string; recordRevision: number }>;
export type NewCase = Readonly<{ caseId: string; label: string; reviewerId: string }>;

export type OriginalReference = Readonly<{
  caseId: string;
  documentVersionId: string;
  sha256: string;
  byteLength: number;
}>;

export async function findOriginalReference(
  client: SqlClient,
  reviewerId: string,
  caseId: string,
  documentVersionId: string,
): Promise<OriginalReference | undefined> {
  const result = await client.query<OriginalReference>(
    `SELECT original_references.case_id AS "caseId",
      document_version_id AS "documentVersionId", sha256,
      byte_length::float8 AS "byteLength"
    FROM original_references JOIN case_memberships USING (case_id)
    WHERE case_memberships.reviewer_id = $1 AND original_references.case_id = $2
      AND document_version_id = $3`,
    [reviewerId, caseId, documentVersionId],
  );
  return result.rows[0];
}

export async function registerOriginalReference(
  client: SqlClient,
  reviewerId: string,
  reference: OriginalReference,
): Promise<OriginalReference | undefined> {
  const result = await client.query<OriginalReference>(
    `INSERT INTO original_references (case_id, document_version_id, sha256, byte_length)
    SELECT case_id, $2, $3, $4 FROM case_memberships
    WHERE case_id = $1 AND reviewer_id = $5
    RETURNING case_id AS "caseId", document_version_id AS "documentVersionId",
      sha256, byte_length::float8 AS "byteLength"`,
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

export async function listCasesForReviewer(
  client: SqlClient,
  reviewerId: string,
): Promise<CaseRecord[]> {
  const result = await client.query<CaseRecord>(
    `SELECT cases.case_id AS "caseId", cases.label,
      cases.record_revision AS "recordRevision"
    FROM cases JOIN case_memberships USING (case_id)
    WHERE case_memberships.reviewer_id = $1
    ORDER BY cases.case_id`,
    [reviewerId],
  );
  return result.rows;
}

export async function installCaseSchema(client: SqlClient): Promise<void> {
  await client.query(`CREATE TABLE cases (
    case_id uuid PRIMARY KEY,
    label text,
    record_revision integer DEFAULT 1
  )`);
  await client.query(`CREATE TABLE case_memberships (
    case_id uuid REFERENCES cases(case_id),
    reviewer_id uuid,
    PRIMARY KEY (case_id, reviewer_id)
  )`);
  await client.query(`CREATE TABLE original_references (
    case_id uuid REFERENCES cases(case_id),
    document_version_id uuid,
    sha256 text,
    byte_length bigint CHECK (byte_length <= 9007199254740991),
    PRIMARY KEY (case_id, document_version_id)
  )`);
}

export async function createCase(
  client: SqlClient,
  input: NewCase,
): Promise<CaseRecord | undefined> {
  const result = await client.query<CaseRecord>(
    `WITH created AS (
      INSERT INTO cases (case_id, label) VALUES ($1, $2)
      RETURNING case_id, label, record_revision
    ), membership AS (
      INSERT INTO case_memberships (case_id, reviewer_id)
      SELECT case_id, $3::uuid FROM created
      RETURNING case_id
    )
    SELECT created.case_id AS "caseId", created.label,
      created.record_revision AS "recordRevision"
    FROM created JOIN membership USING (case_id)`,
    [input.caseId, input.label, input.reviewerId],
  );
  return result.rows[0];
}
