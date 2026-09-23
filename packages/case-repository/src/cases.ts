import type { QueryResultRow } from 'pg';

export type SqlClient = {
  query<Row extends QueryResultRow>(
    statement: string,
    parameters?: unknown[],
  ): Promise<{ rows: Row[] }>;
};

export type CaseRecord = Readonly<{ caseId: string; label: string; recordRevision: number }>;
export type NewCase = Readonly<{ caseId: string; label: string; reviewerId: string }>;

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
