CREATE TABLE IF NOT EXISTS accounting_periods (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('annual', 'final')),
  accounting_period_start TEXT,
  accounting_period_end TEXT,
  date_of_death TEXT,
  county TEXT,
  file_number TEXT,
  estate_type TEXT CHECK (estate_type IN ('decedent', 'minor', 'adult_ward', 'trust')),
  form_version_label TEXT NOT NULL DEFAULT 'AOC-E-506 Rev. 6/21',
  beginning_personal_property_value_cents INTEGER,
  loss_from_sale_amount_cents INTEGER NOT NULL DEFAULT 0,
  loss_explanation TEXT,
  is_locked INTEGER NOT NULL DEFAULT 0 CHECK (is_locked IN (0, 1)),
  created_by_email TEXT,
  created_by_id TEXT,
  locked_at TEXT,
  locked_by_email TEXT,
  locked_by_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounting_ledger_entries (
  id TEXT PRIMARY KEY,
  accounting_period_id TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('receipt', 'disbursement', 'distribution')),
  entry_date TEXT,
  party_name TEXT,
  description TEXT,
  amount_cents INTEGER,
  category TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (accounting_period_id) REFERENCES accounting_periods(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounting_held_assets (
  id TEXT PRIMARY KEY,
  accounting_period_id TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (
    asset_type IN (
      'bank_deposit',
      'security',
      'tangible_personal_property',
      'real_estate',
      'other'
    )
  ),
  institution_or_description TEXT,
  value_cents INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (accounting_period_id) REFERENCES accounting_periods(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounting_proof_links (
  id TEXT PRIMARY KEY,
  accounting_period_id TEXT NOT NULL,
  ledger_entry_id TEXT,
  label TEXT,
  reference_url TEXT,
  status TEXT CHECK (status IN ('pending', 'received', 'not_required')),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (accounting_period_id) REFERENCES accounting_periods(id) ON DELETE CASCADE,
  FOREIGN KEY (ledger_entry_id) REFERENCES accounting_ledger_entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_accounting_periods_matter_updated
  ON accounting_periods(matter_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_accounting_periods_matter_locked
  ON accounting_periods(matter_id, is_locked, accounting_period_end DESC);

CREATE INDEX IF NOT EXISTS idx_accounting_ledger_entries_period_date
  ON accounting_ledger_entries(accounting_period_id, entry_type, entry_date ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_accounting_held_assets_period_type
  ON accounting_held_assets(accounting_period_id, asset_type, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_accounting_proof_links_period
  ON accounting_proof_links(accounting_period_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_accounting_proof_links_entry
  ON accounting_proof_links(ledger_entry_id, created_at DESC);
