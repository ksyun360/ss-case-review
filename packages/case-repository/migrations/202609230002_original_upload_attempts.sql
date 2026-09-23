-- Up Migration
CREATE TABLE original_upload_attempts (
  case_id uuid NOT NULL REFERENCES cases(case_id),
  document_version_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  maximum_bytes bigint NOT NULL CHECK (maximum_bytes BETWEEN 1 AND 9007199254740991),
  state text NOT NULL DEFAULT 'receiving' CHECK (state IN ('receiving', 'registered', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, document_version_id)
);

CREATE INDEX original_upload_attempts_recovery_idx
  ON original_upload_attempts (state, created_at)
  WHERE state <> 'registered';
