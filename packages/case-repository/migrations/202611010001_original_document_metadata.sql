-- Up Migration
CREATE TABLE original_document_metadata (
  case_id uuid NOT NULL,
  document_version_id uuid NOT NULL,
  file_name text NOT NULL CHECK (
    length(file_name) BETWEEN 1 AND 255 AND file_name ~ '[^[:space:]]'
  ),
  media_type text NOT NULL CHECK (
    length(media_type) BETWEEN 1 AND 128 AND media_type ~ '^[^[:space:]]+$'
  ),
  PRIMARY KEY (case_id, document_version_id),
  FOREIGN KEY (case_id, document_version_id)
    REFERENCES original_references (case_id, document_version_id)
);

-- Down Migration
DROP TABLE original_document_metadata;
