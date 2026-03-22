ALTER TABLE matters
ADD COLUMN deadline_template_key TEXT NOT NULL DEFAULT 'custom_manual_only';

ALTER TABLE matters
ADD COLUMN qualification_date TEXT;

ALTER TABLE matters
ADD COLUMN publication_date TEXT;

UPDATE matters
SET deadline_template_key = 'custom_manual_only'
WHERE deadline_template_key IS NULL OR deadline_template_key = '';

CREATE TABLE IF NOT EXISTS matter_deadlines (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  due_date TEXT NOT NULL,
  assignee TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'template')),
  notes TEXT,
  template_key TEXT,
  template_item_key TEXT,
  is_overridden INTEGER NOT NULL DEFAULT 0 CHECK (is_overridden IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  completed_by TEXT,
  completed_by_email TEXT,
  completed_by_id TEXT,
  completion_note TEXT,
  dismissed_at TEXT,
  dismissed_by TEXT,
  dismissed_by_email TEXT,
  dismissed_by_id TEXT,
  FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_matter_deadlines_matter_due
  ON matter_deadlines(matter_id, due_date ASC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_matter_deadlines_due_active
  ON matter_deadlines(due_date ASC, completed_at, dismissed_at);

CREATE INDEX IF NOT EXISTS idx_matter_deadlines_assignee_due
  ON matter_deadlines(assignee, due_date ASC);
