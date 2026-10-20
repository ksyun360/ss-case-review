-- Up Migration
ALTER TABLE text_source_units
  ADD COLUMN geometry jsonb NOT NULL DEFAULT '{"view":[],"rotation":0,"items":[]}'::jsonb;

-- Down Migration
ALTER TABLE text_source_units DROP COLUMN geometry;
