-- Up Migration
CREATE TABLE cases (
  case_id uuid PRIMARY KEY,
  label text,
  record_revision integer DEFAULT 1
);

CREATE TABLE case_memberships (
  case_id uuid REFERENCES cases(case_id),
  reviewer_id uuid,
  PRIMARY KEY (case_id, reviewer_id)
);

CREATE TABLE original_references (
  case_id uuid REFERENCES cases(case_id),
  document_version_id uuid,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  byte_length bigint NOT NULL CHECK (byte_length BETWEEN 0 AND 9007199254740991),
  PRIMARY KEY (case_id, document_version_id)
);
