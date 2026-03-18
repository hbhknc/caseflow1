ALTER TABLE matters ADD COLUMN board_id TEXT NOT NULL DEFAULT 'probate';

UPDATE matters
SET board_id = 'probate'
WHERE board_id IS NULL OR board_id = '';

CREATE INDEX IF NOT EXISTS idx_matters_board_stage_archived
  ON matters(board_id, stage, archived, last_activity_at DESC);
