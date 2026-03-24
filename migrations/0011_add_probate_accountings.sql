CREATE TABLE IF NOT EXISTS probate_accountings (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  matter_id TEXT,
  account_type TEXT NOT NULL DEFAULT 'annual' CHECK (account_type IN ('annual', 'final')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review_ready')),
  county TEXT,
  file_number TEXT,
  decedent_name TEXT,
  fiduciary_name TEXT,
  fiduciary_address TEXT,
  co_fiduciary_name TEXT,
  co_fiduciary_address TEXT,
  date_of_death TEXT,
  period_start TEXT,
  period_end TEXT,
  opening_personal_property_cents INTEGER NOT NULL DEFAULT 0,
  loss_from_sale_cents INTEGER NOT NULL DEFAULT 0,
  loss_explanation TEXT,
  created_at TEXT NOT NULL,
  created_by_email TEXT,
  created_by_id TEXT,
  updated_at TEXT NOT NULL,
  last_updated_by_email TEXT,
  last_updated_by_id TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS probate_accounting_entries (
  id TEXT PRIMARY KEY,
  accounting_id TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('receipt', 'disbursement', 'distribution')),
  entry_date TEXT,
  party_name TEXT,
  description TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  proof_reference TEXT,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (accounting_id) REFERENCES probate_accountings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS probate_accounting_assets (
  id TEXT PRIMARY KEY,
  accounting_id TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (
    asset_type IN (
      'bank',
      'securities',
      'tangible_personal_property',
      'real_estate_willed_not_sold',
      'real_estate_acquired',
      'other'
    )
  ),
  description TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  proof_reference TEXT,
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (accounting_id) REFERENCES probate_accountings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_probate_accountings_account_updated
  ON probate_accountings(account_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_probate_accountings_account_status_type
  ON probate_accountings(account_id, status, account_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_probate_accountings_matter
  ON probate_accountings(matter_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_probate_accounting_entries_accounting_sort
  ON probate_accounting_entries(accounting_id, sort_order ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_probate_accounting_assets_accounting_sort
  ON probate_accounting_assets(accounting_id, sort_order ASC, created_at ASC);
