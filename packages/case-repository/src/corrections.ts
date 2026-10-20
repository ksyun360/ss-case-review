import type { SqlClient } from './cases.ts';

export type CorrectionArtifact = 'summary' | 'medical' | 'procedural' | 'five_step';
export type CorrectionStatus = 'pending' | 'accepted' | 'rejected';

export type CorrectionSuggestion = Readonly<{
  correctionId: string;
  caseId: string;
  recordRevision: number;
  artifact: CorrectionArtifact;
  entryKey: string;
  proposedText: string;
  rationale: string;
  status: CorrectionStatus;
}>;

export type NewCorrectionSuggestion = Readonly<{
  correctionId: string;
  caseId: string;
  artifact: CorrectionArtifact;
  entryKey: string;
  proposedText: string;
  rationale: string;
}>;

export async function insertCorrectionSuggestionForReviewer(
  client: SqlClient,
  reviewerId: string,
  suggestion: NewCorrectionSuggestion,
): Promise<CorrectionSuggestion | undefined> {
  const result = await client.query<CorrectionSuggestion>(
    `INSERT INTO correction_suggestions (
      correction_id, case_id, reviewer_id, record_revision,
      artifact, entry_key, proposed_text, rationale
    )
    SELECT $1, cases.case_id, $3, cases.record_revision,
      $4, $5, $6, $7
    FROM cases JOIN case_memberships USING (case_id)
    WHERE cases.case_id = $2 AND case_memberships.reviewer_id = $3
    RETURNING correction_id AS "correctionId", case_id AS "caseId",
      record_revision AS "recordRevision", artifact, entry_key AS "entryKey",
      proposed_text AS "proposedText", rationale, status`,
    [
      suggestion.correctionId,
      suggestion.caseId,
      reviewerId,
      suggestion.artifact,
      suggestion.entryKey,
      suggestion.proposedText,
      suggestion.rationale,
    ],
  );
  return result.rows[0];
}

export async function listCorrectionSuggestionsForReviewer(
  client: SqlClient,
  reviewerId: string,
  caseId: string,
): Promise<CorrectionSuggestion[]> {
  const result = await client.query<CorrectionSuggestion>(
    `SELECT correction_id AS "correctionId", case_id AS "caseId",
      record_revision AS "recordRevision", artifact, entry_key AS "entryKey",
      proposed_text AS "proposedText", rationale, status
    FROM correction_suggestions
    JOIN case_memberships USING (case_id)
    WHERE correction_suggestions.case_id = $1 AND case_memberships.reviewer_id = $2
    ORDER BY created_at, correction_id`,
    [caseId, reviewerId],
  );
  return result.rows;
}
