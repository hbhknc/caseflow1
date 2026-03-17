PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS matters (
  id TEXT PRIMARY KEY,
  decedent_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  file_number TEXT NOT NULL UNIQUE,
  stage TEXT NOT NULL CHECK (
    stage IN (
      'intake',
      'qualified_opened',
      'notice_admin',
      'inventory_collection',
      'accounting_closing',
      'closed'
    )
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS matter_notes (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS matter_stage_history (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  changed_by TEXT,
  FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_matters_stage_archived
  ON matters(stage, archived, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_matters_last_activity
  ON matters(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_matter_notes_matter_created
  ON matter_notes(matter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matter_stage_history_matter_changed
  ON matter_stage_history(matter_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity
  ON audit_events(entity_type, entity_id, created_at DESC);

