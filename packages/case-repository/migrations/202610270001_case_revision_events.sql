-- Up Migration
CREATE TABLE case_revision_events (
  case_id uuid NOT NULL REFERENCES cases(case_id),
  record_revision integer NOT NULL CHECK (record_revision > 1),
  event_type text NOT NULL CHECK (event_type IN ('original_registered')),
  document_version_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, record_revision)
);

CREATE INDEX case_revision_events_case_idx
  ON case_revision_events (case_id, record_revision);

-- Down Migration
DROP TABLE case_revision_events;
