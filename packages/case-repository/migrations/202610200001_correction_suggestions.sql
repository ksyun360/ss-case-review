-- Up Migration
CREATE TABLE correction_suggestions (
  correction_id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES cases(case_id),
  reviewer_id uuid NOT NULL,
  record_revision integer NOT NULL CHECK (record_revision > 0),
  artifact text NOT NULL CHECK (artifact IN ('summary', 'medical', 'procedural', 'five_step')),
  entry_key text NOT NULL CHECK (length(entry_key) BETWEEN 1 AND 256),
  proposed_text text NOT NULL CHECK (length(proposed_text) BETWEEN 1 AND 4000),
  rationale text NOT NULL CHECK (length(rationale) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX correction_suggestions_case_idx
  ON correction_suggestions (case_id, created_at, correction_id);

-- Down Migration
DROP TABLE correction_suggestions;
