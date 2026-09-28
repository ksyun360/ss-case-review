-- Up Migration
CREATE TABLE text_source_units (
  source_unit_id uuid PRIMARY KEY,
  case_id uuid NOT NULL,
  document_version_id uuid NOT NULL,
  record_revision integer NOT NULL CHECK (record_revision > 0),
  document_sha256 text NOT NULL CHECK (document_sha256 ~ '^[a-f0-9]{64}$'),
  extraction_version text NOT NULL CHECK (
    length(extraction_version) BETWEEN 1 AND 128 AND extraction_version ~ '[^[:space:]]'
  ),
  page_number integer NOT NULL CHECK (page_number > 0),
  raw_text text NOT NULL,
  FOREIGN KEY (case_id, document_version_id)
    REFERENCES original_references (case_id, document_version_id),
  UNIQUE (case_id, document_version_id, record_revision, extraction_version, page_number)
);

-- Down Migration
DROP TABLE text_source_units;
