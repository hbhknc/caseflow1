CREATE TABLE IF NOT EXISTS task_items (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  source_note_id TEXT,
  FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE,
  FOREIGN KEY (source_note_id) REFERENCES matter_notes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_task_items_created
  ON task_items(created_at DESC, completed_at);
