ALTER TABLE matters
ADD COLUMN sort_order REAL NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY board_id, stage
      ORDER BY last_activity_at DESC, created_at DESC, id ASC
    ) AS next_sort_order
  FROM matters
  WHERE archived = 0
)
UPDATE matters
SET sort_order = (
  SELECT ranked.next_sort_order
  FROM ranked
  WHERE ranked.id = matters.id
)
WHERE archived = 0;

CREATE INDEX IF NOT EXISTS idx_matters_stage_archived_sort_order
  ON matters(stage, archived, sort_order ASC, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_matters_board_stage_archived_sort_order
  ON matters(board_id, stage, archived, sort_order ASC, last_activity_at DESC);
