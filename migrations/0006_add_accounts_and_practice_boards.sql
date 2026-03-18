CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS practice_boards (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  column_count INTEGER NOT NULL,
  stage_labels_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO accounts (id, username, created_at, updated_at)
VALUES ('account_hbhklaw', 'hbhklaw', '2026-03-18T12:00:00.000Z', '2026-03-18T12:00:00.000Z');

INSERT OR IGNORE INTO practice_boards (
  id,
  account_id,
  name,
  column_count,
  stage_labels_json,
  created_at,
  updated_at
)
VALUES (
  'probate',
  'account_hbhklaw',
  'Probate',
  COALESCE((SELECT CAST(value AS INTEGER) FROM app_settings WHERE key = 'board.column_count'), 5),
  json_object(
    'intake', COALESCE((SELECT value FROM app_settings WHERE key = 'board.stage_label.intake'), 'Intake'),
    'qualified_opened', COALESCE((SELECT value FROM app_settings WHERE key = 'board.stage_label.qualified_opened'), 'Qualified / Opened'),
    'notice_admin', COALESCE((SELECT value FROM app_settings WHERE key = 'board.stage_label.notice_admin'), 'Notice / Admin'),
    'inventory_collection', COALESCE((SELECT value FROM app_settings WHERE key = 'board.stage_label.inventory_collection'), 'Inventory / Collection'),
    'accounting_closing', COALESCE((SELECT value FROM app_settings WHERE key = 'board.stage_label.accounting_closing'), 'Accounting / Closing')
  ),
  '2026-03-18T12:00:00.000Z',
  '2026-03-18T12:00:00.000Z'
);

UPDATE matters
SET board_id = 'probate'
WHERE board_id IS NULL OR board_id = '';

CREATE INDEX IF NOT EXISTS idx_accounts_username
  ON accounts(username);

CREATE INDEX IF NOT EXISTS idx_practice_boards_account_name
  ON practice_boards(account_id, name);
