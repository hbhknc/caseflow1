ALTER TABLE matters
ADD COLUMN created_by_email TEXT;

ALTER TABLE matters
ADD COLUMN created_by_id TEXT;

ALTER TABLE matters
ADD COLUMN last_updated_by_email TEXT;

ALTER TABLE matters
ADD COLUMN last_updated_by_id TEXT;

ALTER TABLE matter_notes
ADD COLUMN created_by_email TEXT;

ALTER TABLE matter_notes
ADD COLUMN created_by_id TEXT;

ALTER TABLE audit_events
ADD COLUMN matter_id TEXT;

ALTER TABLE audit_events
ADD COLUMN actor_email TEXT;

ALTER TABLE audit_events
ADD COLUMN actor_id TEXT;

ALTER TABLE audit_events
ADD COLUMN actor_name TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_events_matter
  ON audit_events(matter_id, created_at DESC);
