-- Up Migration
ALTER TABLE document_processing_attempts
  ADD COLUMN claims_json jsonb;

-- Down Migration
ALTER TABLE document_processing_attempts
  DROP COLUMN claims_json;
