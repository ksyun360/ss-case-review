-- Up Migration
CREATE TABLE document_processing_attempts (
  case_id uuid NOT NULL,
  document_version_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  extraction_version text NOT NULL CHECK (
    length(extraction_version) BETWEEN 1 AND 128 AND extraction_version ~ '[^[:space:]]'
  ),
  maximum_bytes bigint NOT NULL CHECK (maximum_bytes BETWEEN 1 AND 9007199254740991),
  maximum_pages integer NOT NULL CHECK (maximum_pages > 0),
  state text NOT NULL DEFAULT 'queued'
    CHECK (state IN ('queued', 'processing', 'published', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  failure_code text CHECK (
    failure_code IS NULL OR failure_code ~ '^[a-z][a-z0-9_]{0,63}$'
  ),
  lease_token uuid,
  lease_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, document_version_id, extraction_version),
  FOREIGN KEY (case_id, document_version_id)
    REFERENCES original_references (case_id, document_version_id),
  CHECK (
    (state = 'processing' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR (state <> 'processing' AND lease_token IS NULL AND lease_expires_at IS NULL)
  )
);

CREATE INDEX document_processing_claim_idx
  ON document_processing_attempts (state, lease_expires_at, created_at)
  WHERE state IN ('queued', 'processing');

-- Down Migration
DROP TABLE document_processing_attempts;
