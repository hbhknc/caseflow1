import { ARCHIVE_READY_STAGE, DEFAULT_STAGE_LABELS, STAGES, isMatterStage } from "./stages";
import type {
  AccountRecord,
  AppSettingRecord,
  BoardSettings,
  MatterImportIssue,
  MatterImportRowInput,
  MatterImportSummary,
  MatterInput,
  MatterNoteInput,
  MatterNoteRecord,
  MatterRecord,
  MatterStage,
  MatterTaskRecord,
  PracticeBoard,
  PracticeBoardRecord
} from "./types";

function nowIso() {
  return new Date().toISOString();
}

const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  columnCount: 5,
  stageLabels: { ...DEFAULT_STAGE_LABELS }
};

const DEFAULT_BOARDS: PracticeBoard[] = [
  {
    id: "probate",
    name: "Probate",
    columnCount: DEFAULT_BOARD_SETTINGS.columnCount,
    stageLabels: { ...DEFAULT_BOARD_SETTINGS.stageLabels }
  }
];

function buildDefaultBoards(settings: BoardSettings = DEFAULT_BOARD_SETTINGS): PracticeBoard[] {
  return [
    {
      id: "probate",
      name: "Probate",
      columnCount: settings.columnCount,
      stageLabels: { ...settings.stageLabels }
    }
  ];
}

function mapMatter(row: MatterRecord) {
  return {
    id: row.id,
    boardId: row.board_id,
    decedentName: row.decedent_name,
    clientName: row.client_name,
    fileNumber: row.file_number,
    stage: row.stage,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at,
    archived: Boolean(row.archived),
    archivedAt: row.archived_at
  };
}

function mapPracticeBoard(row: PracticeBoardRecord): PracticeBoard {
  let parsedStageLabels: Partial<Record<MatterStage, string>> = {};

  try {
    parsedStageLabels = JSON.parse(row.stage_labels_json) as Partial<
      Record<MatterStage, string>
    >;
  } catch {
    parsedStageLabels = {};
  }

  return {
    id: row.id,
    name: row.name,
    columnCount: clampColumnCount(row.column_count),
    stageLabels: normalizeStageLabels(parsedStageLabels)
  };
}

function mapNote(row: MatterNoteRecord) {
  return {
    id: row.id,
    matterId: row.matter_id,
    body: row.body,
    createdAt: row.created_at,
    createdBy: row.created_by
  };
}

function assertMatterInput(input: Partial<MatterInput>): MatterInput {
  if (!input.boardId?.trim()) {
    throw new Error("Board id is required.");
  }

  if (!input.decedentName?.trim()) {
    throw new Error("Decedent name is required.");
  }

  if (!input.clientName?.trim()) {
    throw new Error("Client name is required.");
  }

  if (!input.fileNumber?.trim()) {
    throw new Error("File number is required.");
  }

  if (!input.stage || !isMatterStage(input.stage)) {
    throw new Error("A valid stage is required.");
  }

  return {
    boardId: input.boardId.trim(),
    decedentName: input.decedentName.trim(),
    clientName: input.clientName.trim(),
    fileNumber: input.fileNumber.trim(),
    stage: input.stage
  };
}

function normalizeImportTimestamp(value: string | undefined, label: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Date.parse(trimmed);

  if (Number.isNaN(parsed)) {
    throw new Error(`${label} must be a valid date.`);
  }

  return new Date(parsed).toISOString();
}

function createImportedFileNumber(rowNumber: number) {
  const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `IMPORT-${compactDate}-${rowNumber}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function normalizeMatterSortOrder(db: D1Database) {
  await db
    .prepare(
      `WITH ranked AS (
         SELECT
           id,
           ROW_NUMBER() OVER (
             PARTITION BY board_id, stage
             ORDER BY sort_order ASC, last_activity_at DESC, created_at DESC, id ASC
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
       WHERE archived = 0`
    )
    .run();
}

async function getStageMatterIdsOrdered(
  db: D1Database,
  boardId: string,
  stage: MatterStage,
  excludeMatterId?: string
) {
  const query = excludeMatterId
    ? `SELECT id
       FROM matters
       WHERE board_id = ?1
         AND archived = 0
         AND stage = ?2
         AND id != ?3
       ORDER BY sort_order ASC, last_activity_at DESC, created_at DESC, id ASC`
    : `SELECT id
       FROM matters
       WHERE board_id = ?1
         AND archived = 0
         AND stage = ?2
       ORDER BY sort_order ASC, last_activity_at DESC, created_at DESC, id ASC`;
  const statement = db.prepare(query);
  const bound = excludeMatterId
    ? statement.bind(boardId, stage, excludeMatterId)
    : statement.bind(boardId, stage);
  const { results } = await bound.all<{ id: string }>();
  return results.map((row) => row.id);
}

async function renumberStageMatterOrder(
  db: D1Database,
  matterIds: string[]
) {
  if (matterIds.length === 0) {
    return;
  }

  await db.batch(
    matterIds.map((matterId, index) =>
      db
        .prepare(
          `UPDATE matters
           SET sort_order = ?2
           WHERE id = ?1`
        )
        .bind(matterId, index + 1)
    )
  );
}

async function getNextStageSortOrder(
  db: D1Database,
  boardId: string,
  stage: MatterStage,
  placement: "start" | "end"
) {
  const boundary = await db
    .prepare(
      `SELECT MIN(sort_order) AS min_sort_order, MAX(sort_order) AS max_sort_order
       FROM matters
       WHERE board_id = ?1
         AND archived = 0
         AND stage = ?2`
    )
    .bind(boardId, stage)
    .first<{ min_sort_order: number | null; max_sort_order: number | null }>();

  const minSortOrder = Number(boundary?.min_sort_order ?? 0);
  const maxSortOrder = Number(boundary?.max_sort_order ?? 0);

  if (!boundary?.min_sort_order && !boundary?.max_sort_order) {
    return 1;
  }

  return placement === "start" ? minSortOrder - 1 : maxSortOrder + 1;
}

async function insertMatterRecord(
  db: D1Database,
  input: {
    boardId: string;
    decedentName: string;
    clientName: string;
    fileNumber: string;
    stage: MatterStage;
    sortOrder: number;
    createdAt: string;
    lastActivityAt: string;
    auditAction: string;
    auditDetails: Record<string, unknown>;
  }
) {
  const matterId = crypto.randomUUID();
  const updatedAt = input.lastActivityAt;

  await db
    .prepare(
      `INSERT INTO matters (
        id, board_id, decedent_name, client_name, file_number, stage, sort_order, created_at, updated_at, last_activity_at, archived, archived_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, NULL)`
    )
    .bind(
      matterId,
      input.boardId,
      input.decedentName,
      input.clientName,
      input.fileNumber,
      input.stage,
      input.sortOrder,
      input.createdAt,
      updatedAt,
      input.lastActivityAt
    )
    .run();

  await db
    .prepare(
      `INSERT INTO matter_stage_history (id, matter_id, from_stage, to_stage, changed_at, changed_by)
       VALUES (?1, ?2, NULL, ?3, ?4, ?5)`
    )
    .bind(crypto.randomUUID(), matterId, input.stage, input.createdAt, "System")
    .run();

  await insertAuditEvent(
    db,
    input.auditAction,
    "matter",
    matterId,
    JSON.stringify(input.auditDetails)
  );

  return matterId;
}

async function getMatterRecord(db: D1Database, matterId: string, accountId?: string) {
  await ensureDefaultAccountData(db);

  if (!accountId) {
    return await db
      .prepare("SELECT * FROM matters WHERE id = ?1")
      .bind(matterId)
      .first<MatterRecord>();
  }

  return await db
    .prepare(
      `SELECT matters.*
       FROM matters
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE matters.id = ?1
         AND practice_boards.account_id = ?2`
    )
    .bind(matterId, accountId)
    .first<MatterRecord>();
}

async function getPracticeBoardRecord(
  db: D1Database,
  boardId: string,
  accountId: string
) {
  await ensureDefaultAccountData(db);

  return await db
    .prepare(
      `SELECT *
       FROM practice_boards
       WHERE id = ?1
         AND account_id = ?2`
    )
    .bind(boardId, accountId)
    .first<PracticeBoardRecord>();
}

async function insertAuditEvent(
  db: D1Database,
  action: string,
  entityType: string,
  entityId: string,
  detailsJson: string
) {
  await db
    .prepare(
      `INSERT INTO audit_events (id, entity_type, entity_id, action, details_json, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    )
    .bind(crypto.randomUUID(), entityType, entityId, action, detailsJson, nowIso())
    .run();
}

function calculateAveragePerYear(timestamps: string[]) {
  if (timestamps.length === 0) {
    return 0;
  }

  const years = timestamps.map((timestamp) => new Date(timestamp).getUTCFullYear());
  const span = Math.max(...years) - Math.min(...years) + 1;
  return Number((timestamps.length / span).toFixed(1));
}

function clampColumnCount(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_BOARD_SETTINGS.columnCount;
  }

  return Math.min(STAGES.length, Math.max(1, Math.round(parsed)));
}

function normalizeStageLabels(
  stageLabels: Partial<Record<MatterStage, string>> | undefined
): Record<MatterStage, string> {
  return {
    intake: stageLabels?.intake?.trim() || DEFAULT_STAGE_LABELS.intake,
    qualified_opened:
      stageLabels?.qualified_opened?.trim() || DEFAULT_STAGE_LABELS.qualified_opened,
    notice_admin: stageLabels?.notice_admin?.trim() || DEFAULT_STAGE_LABELS.notice_admin,
    inventory_collection:
      stageLabels?.inventory_collection?.trim() ||
      DEFAULT_STAGE_LABELS.inventory_collection,
    accounting_closing:
      stageLabels?.accounting_closing?.trim() || DEFAULT_STAGE_LABELS.accounting_closing
  };
}

function normalizeBoard(input: {
  id: string;
  name: string;
  columnCount?: number;
  stageLabels?: Partial<Record<MatterStage, string>>;
}): PracticeBoard {
  return {
    id: input.id,
    name: input.name.trim(),
    columnCount: clampColumnCount(input.columnCount),
    stageLabels: normalizeStageLabels(input.stageLabels)
  };
}

function buildBoardId(name: string, existingBoards: PracticeBoard[]) {
  const baseId =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "board";
  let candidate = baseId;
  let suffix = 2;

  while (existingBoards.some((board) => board.id === candidate)) {
    candidate = `${baseId}_${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function upsertAppSetting(db: D1Database, key: string, value: string, updatedAt: string) {
  await db
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(key, value, updatedAt)
    .run();
}

async function tableHasColumn(db: D1Database, tableName: string, columnName: string) {
  const { results } = await db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all<{ name: string }>();

  return results.some((column) => column.name === columnName);
}

async function ensureBaseSchema(db: D1Database) {
  await db.prepare("PRAGMA foreign_keys = ON").run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS matters (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL DEFAULT 'probate',
        decedent_name TEXT NOT NULL,
        client_name TEXT NOT NULL,
        file_number TEXT NOT NULL UNIQUE,
        stage TEXT NOT NULL CHECK (
          stage IN (
            'intake',
            'qualified_opened',
            'notice_admin',
            'inventory_collection',
            'accounting_closing'
          )
        ),
        sort_order REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_activity_at TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
        archived_at TEXT
      )`
    )
    .run();

  if (!(await tableHasColumn(db, "matters", "board_id"))) {
    await db
      .prepare(
        `ALTER TABLE matters
         ADD COLUMN board_id TEXT NOT NULL DEFAULT 'probate'`
      )
      .run();
  }

  await db
    .prepare(
      `UPDATE matters
       SET board_id = 'probate'
       WHERE board_id IS NULL OR board_id = ''`
    )
    .run();

  if (!(await tableHasColumn(db, "matters", "sort_order"))) {
    await db
      .prepare(
        `ALTER TABLE matters
         ADD COLUMN sort_order REAL NOT NULL DEFAULT 0`
      )
      .run();
  }

  await normalizeMatterSortOrder(db);

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS matter_notes (
        id TEXT PRIMARY KEY,
        matter_id TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT,
        FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS task_items (
        id TEXT PRIMARY KEY,
        matter_id TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        source_note_id TEXT,
        FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE,
        FOREIGN KEY (source_note_id) REFERENCES matter_notes(id) ON DELETE SET NULL
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS matter_stage_history (
        id TEXT PRIMARY KEY,
        matter_id TEXT NOT NULL,
        from_stage TEXT,
        to_stage TEXT NOT NULL,
        changed_at TEXT NOT NULL,
        changed_by TEXT,
        FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details_json TEXT,
        created_at TEXT NOT NULL
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_matters_stage_archived
       ON matters(stage, archived, sort_order ASC, last_activity_at DESC)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_matters_last_activity
       ON matters(last_activity_at DESC)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_matters_board_stage_archived
       ON matters(board_id, stage, archived, sort_order ASC, last_activity_at DESC)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_matter_notes_matter_created
       ON matter_notes(matter_id, created_at DESC)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_task_items_created
       ON task_items(created_at DESC, completed_at)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_matter_stage_history_matter_changed
       ON matter_stage_history(matter_id, changed_at DESC)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_audit_events_entity
       ON audit_events(entity_type, entity_id, created_at DESC)`
    )
    .run();
}

async function ensureAccountScopeSchema(db: D1Database) {
  await ensureBaseSchema(db);

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS practice_boards (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        name TEXT NOT NULL,
        column_count INTEGER NOT NULL,
        stage_labels_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_accounts_username
       ON accounts(username)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_practice_boards_account_name
       ON practice_boards(account_id, name)`
    )
    .run();
}

async function getAppSettingMap(db: D1Database, keys: string[]) {
  const placeholders = keys.map((_, index) => `?${index + 1}`).join(", ");
  const { results } = await db
    .prepare(
      `SELECT key, value, updated_at
       FROM app_settings
       WHERE key IN (${placeholders})`
    )
    .bind(...keys)
    .all<AppSettingRecord>();

  return new Map(results.map((row) => [row.key, row.value]));
}

async function ensureDefaultAccountData(db: D1Database) {
  await ensureAccountScopeSchema(db);

  const timestamp = nowIso();
  await db
    .prepare(
      `INSERT OR IGNORE INTO accounts (id, username, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?3)`
    )
    .bind("account_hbhklaw", "hbhklaw", timestamp)
    .run();

  const defaultBoardSettings = await getBoardSettings(db);
  await db
    .prepare(
      `INSERT OR IGNORE INTO practice_boards (
        id, account_id, name, column_count, stage_labels_json, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)`
    )
    .bind(
      "probate",
      "account_hbhklaw",
      "Probate",
      defaultBoardSettings.columnCount,
      JSON.stringify(defaultBoardSettings.stageLabels),
      timestamp
    )
    .run();
}

export async function getBoardSettings(db: D1Database): Promise<BoardSettings> {
  await ensureBaseSchema(db);
  const stageKeys = STAGES.map((stage) => `board.stage_label.${stage}`);
  const settings = await getAppSettingMap(db, ["board.column_count", ...stageKeys]);
  const stageLabels = normalizeStageLabels({
    intake: settings.get("board.stage_label.intake"),
    qualified_opened: settings.get("board.stage_label.qualified_opened"),
    notice_admin: settings.get("board.stage_label.notice_admin"),
    inventory_collection: settings.get("board.stage_label.inventory_collection"),
    accounting_closing: settings.get("board.stage_label.accounting_closing")
  });

  return {
    columnCount: clampColumnCount(settings.get("board.column_count")),
    stageLabels
  };
}

export async function getAccountByUsername(db: D1Database, username: string) {
  await ensureDefaultAccountData(db);
  return await db
    .prepare(
      `SELECT id, username, created_at, updated_at
       FROM accounts
       WHERE username = ?1`
    )
    .bind(username)
    .first<AccountRecord>();
}

export async function listBoards(db: D1Database, accountId: string): Promise<PracticeBoard[]> {
  await ensureDefaultAccountData(db);
  const { results } = await db
    .prepare(
      `SELECT *
       FROM practice_boards
       WHERE account_id = ?1
       ORDER BY created_at ASC, name ASC`
    )
    .bind(accountId)
    .all<PracticeBoardRecord>();

  return results.map(mapPracticeBoard);
}

export async function createBoard(
  db: D1Database,
  accountId: string,
  name: string
): Promise<PracticeBoard> {
  await ensureDefaultAccountData(db);
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Board name is required.");
  }

  const boards = await listBoards(db, accountId);
  const timestamp = nowIso();
  const board = normalizeBoard({
    id: buildBoardId(trimmed, boards),
    name: trimmed,
    columnCount: DEFAULT_BOARD_SETTINGS.columnCount,
    stageLabels: DEFAULT_BOARD_SETTINGS.stageLabels
  });

  await db
    .prepare(
      `INSERT INTO practice_boards (
        id, account_id, name, column_count, stage_labels_json, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)`
    )
    .bind(
      board.id,
      accountId,
      board.name,
      board.columnCount,
      JSON.stringify(board.stageLabels),
      timestamp
    )
    .run();

  return board;
}

export async function updateBoard(
  db: D1Database,
  accountId: string,
  boardId: string,
  input: {
    name?: string;
    columnCount?: number;
    stageLabels?: Partial<Record<MatterStage, string>>;
  }
): Promise<PracticeBoard | null> {
  await ensureDefaultAccountData(db);
  const existing = await getPracticeBoardRecord(db, boardId, accountId);

  if (!existing) {
    return null;
  }

  const updated = normalizeBoard({
    id: existing.id,
    name: input.name?.trim() || existing.name,
    columnCount: input.columnCount ?? existing.column_count,
    stageLabels: input.stageLabels ?? mapPracticeBoard(existing).stageLabels
  });

  await db
    .prepare(
      `UPDATE practice_boards
       SET name = ?3,
           column_count = ?4,
           stage_labels_json = ?5,
           updated_at = ?6
       WHERE id = ?1
         AND account_id = ?2`
    )
    .bind(
      boardId,
      accountId,
      updated.name,
      updated.columnCount,
      JSON.stringify(updated.stageLabels),
      nowIso()
    )
    .run();

  return updated;
}

export async function deleteBoard(
  db: D1Database,
  accountId: string,
  boardId: string
): Promise<PracticeBoard[]> {
  const boards = await listBoards(db, accountId);

  if (boards.length === 1) {
    throw new Error("At least one board is required.");
  }

  const board = boards.find((item) => item.id === boardId);
  if (!board) {
    throw new Error("Board not found.");
  }

  const matterCount = await db
    .prepare("SELECT COUNT(*) AS count FROM matters WHERE board_id = ?1")
    .bind(boardId)
    .first<{ count: number | string }>();

  if (Number(matterCount?.count ?? 0) > 0) {
    throw new Error("Move or archive matters off this board before deleting it.");
  }

  const remainingBoards = boards.filter((item) => item.id !== boardId);
  await db
    .prepare(
      `DELETE FROM practice_boards
       WHERE id = ?1
         AND account_id = ?2`
    )
    .bind(boardId, accountId)
    .run();

  return remainingBoards;
}

export async function updateBoardSettings(
  db: D1Database,
  input: {
    columnCount?: number;
    stageLabels?: Partial<Record<MatterStage, string>>;
  }
): Promise<BoardSettings> {
  const settings: BoardSettings = {
    columnCount: clampColumnCount(input.columnCount),
    stageLabels: normalizeStageLabels(input.stageLabels)
  };
  const timestamp = nowIso();

  await upsertAppSetting(
    db,
    "board.column_count",
    String(settings.columnCount),
    timestamp
  );

  for (const stage of STAGES) {
    await upsertAppSetting(
      db,
      `board.stage_label.${stage}`,
      settings.stageLabels[stage],
      timestamp
    );
  }

  return settings;
}

export async function listMatters(db: D1Database, accountId: string, boardId: string) {
  await ensureDefaultAccountData(db);

  const { results } = await db
    .prepare(
      `SELECT matters.*
       FROM matters
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE matters.archived = 0
         AND matters.board_id = ?1
         AND practice_boards.account_id = ?2
       ORDER BY
         CASE matters.stage
           WHEN 'intake' THEN 1
           WHEN 'qualified_opened' THEN 2
           WHEN 'notice_admin' THEN 3
           WHEN 'inventory_collection' THEN 4
           WHEN 'accounting_closing' THEN 5
           ELSE 99
         END,
         matters.sort_order ASC,
         matters.last_activity_at DESC`
    )
    .bind(boardId, accountId)
    .all<MatterRecord>();

  return results.map(mapMatter);
}

export async function listArchivedMatters(
  db: D1Database,
  accountId: string,
  boardId: string
) {
  await ensureDefaultAccountData(db);

  const { results } = await db
    .prepare(
      `SELECT matters.*
       FROM matters
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE matters.archived = 1
         AND matters.board_id = ?1
         AND practice_boards.account_id = ?2
       ORDER BY matters.archived_at DESC, matters.last_activity_at DESC`
    )
    .bind(boardId, accountId)
    .all<MatterRecord>();

  return results.map(mapMatter);
}

export async function getMatterStats(db: D1Database, accountId: string, boardId: string) {
  await ensureDefaultAccountData(db);

  const { results } = await db
    .prepare(
      `SELECT matters.id, matters.created_at, matters.archived, matters.archived_at
       FROM matters
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE matters.board_id = ?1
         AND practice_boards.account_id = ?2`
    )
    .bind(boardId, accountId)
    .all<Pick<MatterRecord, "id" | "created_at" | "archived" | "archived_at">>();

  const archivedMatters = results.filter(
    (matter) => Boolean(matter.archived) && matter.archived_at
  );

  const averageCaseLengthDays =
    archivedMatters.length === 0
      ? null
      : Math.round(
          archivedMatters.reduce((total, matter) => {
            const openedAt = new Date(matter.created_at).getTime();
            const archivedAt = new Date(matter.archived_at ?? matter.created_at).getTime();
            return total + (archivedAt - openedAt) / (1000 * 60 * 60 * 24);
          }, 0) / archivedMatters.length
        );

  return {
    totalCasesOpened: results.length,
    totalCasesArchived: archivedMatters.length,
    averageCasesOpenedPerYear: calculateAveragePerYear(
      results.map((matter) => matter.created_at)
    ),
    averageCasesArchivedPerYear: calculateAveragePerYear(
      archivedMatters.map((matter) => matter.archived_at ?? matter.created_at)
    ),
    averageCaseLengthDays
  };
}

export async function createMatter(
  db: D1Database,
  accountId: string,
  payload: Partial<MatterInput>
) {
  const input = assertMatterInput(payload);
  const board = await getPracticeBoardRecord(db, input.boardId, accountId);
  if (!board) {
    throw new Error("Board not found.");
  }
  const timestamp = nowIso();
  const sortOrder = await getNextStageSortOrder(db, input.boardId, input.stage, "start");
  const matterId = await insertMatterRecord(db, {
    boardId: input.boardId,
    decedentName: input.decedentName,
    clientName: input.clientName,
    fileNumber: input.fileNumber,
    stage: input.stage,
    sortOrder,
    createdAt: timestamp,
    lastActivityAt: timestamp,
    auditAction: "matter.created",
    auditDetails: { stage: input.stage }
  });

  const record = await getMatterRecord(db, matterId);
  if (!record) {
    throw new Error("Matter was created but could not be reloaded.");
  }

  return mapMatter(record);
}

export async function importMatters(
  db: D1Database,
  accountId: string,
  boardId: string,
  rows: MatterImportRowInput[]
): Promise<MatterImportSummary> {
  if (!boardId.trim()) {
    throw new Error("Board id is required.");
  }

  if (rows.length === 0) {
    throw new Error("At least one import row is required.");
  }

  if (rows.length > 1000) {
    throw new Error("Imports are limited to 1000 rows at a time.");
  }

  const board = await getPracticeBoardRecord(db, boardId, accountId);
  if (!board) {
    throw new Error("Board not found.");
  }

  const normalizedRows = rows.map((row) => ({
    rowNumber: row.rowNumber,
    decedentName: row.decedentName.trim(),
    clientName: row.clientName.trim(),
    fileNumber: row.fileNumber.trim(),
    stage: row.stage,
    createdAt: normalizeImportTimestamp(row.createdAt, "createdAt"),
    lastActivityAt: normalizeImportTimestamp(row.lastActivityAt, "lastActivityAt")
  }));

  const invalidRows: MatterImportIssue[] = [];
  const skippedRows: MatterImportIssue[] = [];
  const importedFileNumbers: string[] = [];
  const seenFileNumbers = new Set<string>();
  const existingLookup = new Set<string>();
  const fileNumbers = normalizedRows.map((row) => row.fileNumber.toLowerCase());

  if (fileNumbers.length > 0) {
    const placeholders = fileNumbers.map((_, index) => `?${index + 1}`).join(", ");
    const { results } = await db
      .prepare(
        `SELECT file_number
         FROM matters
         WHERE lower(file_number) IN (${placeholders})`
      )
      .bind(...fileNumbers)
      .all<{ file_number: string }>();

    for (const result of results) {
      existingLookup.add(result.file_number.toLowerCase());
    }
  }

  const nextStageSortOrders = new Map<MatterStage, number>();

  for (const row of normalizedRows) {
    if (!isMatterStage(row.stage)) {
      invalidRows.push({
        rowNumber: row.rowNumber,
        fileNumber: row.fileNumber,
        message: "Stage is not a valid CaseFlow stage."
      });
      continue;
    }

    if (row.fileNumber && seenFileNumbers.has(row.fileNumber.toLowerCase())) {
      invalidRows.push({
        rowNumber: row.rowNumber,
        fileNumber: row.fileNumber,
        message: "Duplicate file number appears more than once in the upload."
      });
      continue;
    }

    if (row.fileNumber && existingLookup.has(row.fileNumber.toLowerCase())) {
      skippedRows.push({
        rowNumber: row.rowNumber,
        fileNumber: row.fileNumber,
        message: "File number already exists in CaseFlow and was skipped."
      });
      continue;
    }

    if (row.fileNumber) {
      seenFileNumbers.add(row.fileNumber.toLowerCase());
    }
    const createdAt = row.createdAt ?? nowIso();
    const lastActivityAt = row.lastActivityAt ?? createdAt;
    const fileNumber = row.fileNumber || createImportedFileNumber(row.rowNumber);
    const decedentName = row.decedentName || `Imported Matter ${row.rowNumber}`;
    const clientName = row.clientName || "Imported Client";
    const nextSortOrder =
      nextStageSortOrders.get(row.stage) ??
      (await getNextStageSortOrder(db, boardId, row.stage, "end"));

    await insertMatterRecord(db, {
      boardId,
      decedentName,
      clientName,
      fileNumber,
      stage: row.stage,
      sortOrder: nextSortOrder,
      createdAt,
      lastActivityAt,
      auditAction: "matter.imported",
      auditDetails: {
        stage: row.stage,
        source: "csv-import",
        boardId
      }
    });
    nextStageSortOrders.set(row.stage, nextSortOrder + 1);
    importedFileNumbers.push(fileNumber);
  }

  return {
    importedCount: importedFileNumbers.length,
    skippedCount: skippedRows.length,
    invalidCount: invalidRows.length,
    importedFileNumbers,
    skippedRows,
    invalidRows
  };
}

export async function updateMatter(
  db: D1Database,
  accountId: string,
  matterId: string,
  payload: Partial<MatterInput>
) {
  const existing = await getMatterRecord(db, matterId, accountId);

  if (!existing) {
    return null;
  }

  const input = assertMatterInput({
    boardId: payload.boardId ?? existing.board_id,
    decedentName: payload.decedentName ?? existing.decedent_name,
    clientName: payload.clientName ?? existing.client_name,
    fileNumber: payload.fileNumber ?? existing.file_number,
    stage: payload.stage ?? existing.stage
  });
  const board = await getPracticeBoardRecord(db, input.boardId, accountId);
  if (!board) {
    throw new Error("Board not found.");
  }

  const timestamp = nowIso();
  const movedAcrossStageOrBoard =
    input.stage !== existing.stage || input.boardId !== existing.board_id;
  const nextSortOrder = movedAcrossStageOrBoard
    ? await getNextStageSortOrder(db, input.boardId, input.stage, "start")
    : Number(existing.sort_order ?? 0);

  await db
    .prepare(
      `UPDATE matters
       SET decedent_name = ?2,
           client_name = ?3,
           file_number = ?4,
           stage = ?5,
           board_id = ?6,
           sort_order = ?7,
           updated_at = ?8,
           last_activity_at = CASE WHEN ?9 = 1 THEN ?8 ELSE last_activity_at END
       WHERE id = ?1`
    )
    .bind(
      matterId,
      input.decedentName,
      input.clientName,
      input.fileNumber,
      input.stage,
      input.boardId,
      nextSortOrder,
      timestamp,
      movedAcrossStageOrBoard ? 1 : 0
    )
    .run();

  if (input.stage !== existing.stage) {
    await db
      .prepare(
        `INSERT INTO matter_stage_history (id, matter_id, from_stage, to_stage, changed_at, changed_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(
        crypto.randomUUID(),
        matterId,
        existing.stage,
        input.stage,
        timestamp,
        "System"
      )
      .run();
  }

  if (movedAcrossStageOrBoard) {
    const destinationIds = await getStageMatterIdsOrdered(db, input.boardId, input.stage);
    await renumberStageMatterOrder(db, destinationIds);

    if (existing.board_id !== input.boardId || existing.stage !== input.stage) {
      const sourceIds = await getStageMatterIdsOrdered(
        db,
        existing.board_id,
        existing.stage
      );
      await renumberStageMatterOrder(db, sourceIds);
    }
  }

  await insertAuditEvent(
    db,
    "matter.updated",
    "matter",
    matterId,
    JSON.stringify({
      fromBoardId: existing.board_id,
      toBoardId: input.boardId,
      fromStage: existing.stage,
      toStage: input.stage
    })
  );

  const updated = await getMatterRecord(db, matterId);
  return updated ? mapMatter(updated) : null;
}

export async function moveMatterStage(
  db: D1Database,
  accountId: string,
  matterId: string,
  input: { stage: MatterStage; beforeMatterId?: string | null }
) {
  const existing = await getMatterRecord(db, matterId, accountId);

  if (!existing) {
    return null;
  }

  const beforeMatterId =
    input.beforeMatterId && input.beforeMatterId !== matterId ? input.beforeMatterId : null;
  const destinationIds = await getStageMatterIdsOrdered(
    db,
    existing.board_id,
    input.stage,
    matterId
  );

  if (beforeMatterId && !destinationIds.includes(beforeMatterId)) {
    throw new Error("Target matter for reordering was not found.");
  }

  const insertIndex = beforeMatterId ? destinationIds.indexOf(beforeMatterId) : destinationIds.length;
  destinationIds.splice(insertIndex, 0, matterId);

  const timestamp = nowIso();
  const stageChanged = existing.stage !== input.stage;

  await db
    .prepare(
      `UPDATE matters
       SET stage = ?2,
           updated_at = ?3,
           last_activity_at = CASE WHEN ?4 = 1 THEN ?3 ELSE last_activity_at END
       WHERE id = ?1`
    )
    .bind(matterId, input.stage, timestamp, stageChanged ? 1 : 0)
    .run();

  if (stageChanged) {
    await db
      .prepare(
        `INSERT INTO matter_stage_history (id, matter_id, from_stage, to_stage, changed_at, changed_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(
        crypto.randomUUID(),
        matterId,
        existing.stage,
        input.stage,
        timestamp,
        "System"
      )
      .run();

    const sourceIds = await getStageMatterIdsOrdered(db, existing.board_id, existing.stage);
    await renumberStageMatterOrder(db, sourceIds);
  }

  await renumberStageMatterOrder(db, destinationIds);

  await insertAuditEvent(
    db,
    stageChanged ? "matter.moved" : "matter.reordered",
    "matter",
    matterId,
    JSON.stringify({
      fromStage: existing.stage,
      toStage: input.stage,
      beforeMatterId
    })
  );

  const updated = await getMatterRecord(db, matterId);
  return updated ? mapMatter(updated) : null;
}

export async function deleteMatter(db: D1Database, accountId: string, matterId: string) {
  const existing = await getMatterRecord(db, matterId, accountId);

  if (!existing) {
    return false;
  }

  await db.prepare("DELETE FROM matter_notes WHERE matter_id = ?1").bind(matterId).run();
  await db
    .prepare("DELETE FROM matter_stage_history WHERE matter_id = ?1")
    .bind(matterId)
    .run();
  await db.prepare("DELETE FROM matters WHERE id = ?1").bind(matterId).run();

  await insertAuditEvent(
    db,
    "matter.deleted",
    "matter",
    matterId,
    JSON.stringify({ fileNumber: existing.file_number })
  );

  return true;
}

export async function archiveMatter(db: D1Database, accountId: string, matterId: string) {
  const existing = await getMatterRecord(db, matterId, accountId);

  if (!existing) {
    return null;
  }

  if (existing.stage !== ARCHIVE_READY_STAGE) {
    throw new Error("Only matters in Accounting / Closing can be archived.");
  }

  const timestamp = nowIso();

  await db
    .prepare(
      `UPDATE matters
       SET archived = 1,
           archived_at = ?2,
           updated_at = ?2,
           last_activity_at = ?2
       WHERE id = ?1`
    )
    .bind(matterId, timestamp)
    .run();

  await insertAuditEvent(
    db,
    "matter.archived",
    "matter",
    matterId,
    JSON.stringify({ archivedAt: timestamp })
  );

  const archived = await getMatterRecord(db, matterId);
  return archived ? mapMatter(archived) : null;
}

export async function unarchiveMatter(
  db: D1Database,
  accountId: string,
  matterId: string
) {
  const existing = await getMatterRecord(db, matterId, accountId);

  if (!existing) {
    return null;
  }

  const timestamp = nowIso();

  await db
    .prepare(
      `UPDATE matters
       SET archived = 0,
           archived_at = NULL,
           updated_at = ?2,
           last_activity_at = ?2
       WHERE id = ?1`
    )
    .bind(matterId, timestamp)
    .run();

  await insertAuditEvent(
    db,
    "matter.unarchived",
    "matter",
    matterId,
    JSON.stringify({ unarchivedAt: timestamp })
  );

  const matter = await getMatterRecord(db, matterId);
  return matter ? mapMatter(matter) : null;
}

export async function listNotes(db: D1Database, accountId: string, matterId: string) {
  await ensureDefaultAccountData(db);

  const { results } = await db
    .prepare(
      `SELECT matter_notes.id, matter_notes.matter_id, matter_notes.body, matter_notes.created_at, matter_notes.created_by
       FROM matter_notes
       INNER JOIN matters ON matters.id = matter_notes.matter_id
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE matter_notes.matter_id = ?1
         AND practice_boards.account_id = ?2
       ORDER BY matter_notes.created_at DESC`
    )
    .bind(matterId, accountId)
    .all<MatterNoteRecord>();

  return results.map(mapNote);
}

export async function listTasks(db: D1Database, accountId: string, boardId: string) {
  await ensureDefaultAccountData(db);

  const { results } = await db
    .prepare(
      `SELECT
         task_items.id,
         task_items.matter_id,
         task_items.body,
         task_items.created_at,
         task_items.completed_at,
         task_items.source_note_id,
         matters.decedent_name,
         matters.client_name,
         matters.file_number
       FROM task_items
       INNER JOIN matters ON matters.id = task_items.matter_id
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE task_items.completed_at IS NULL
         AND matters.board_id = ?1
         AND practice_boards.account_id = ?2
       ORDER BY task_items.created_at DESC`
    )
    .bind(boardId, accountId)
    .all<MatterTaskRecord>();

  return results.map((row) => ({
    id: row.id,
    matterId: row.matter_id,
    matterName: row.decedent_name,
    clientName: row.client_name,
    fileNumber: row.file_number,
    body: row.body,
    createdAt: row.created_at,
    completedAt: row.completed_at
  }));
}

export async function completeTask(
  db: D1Database,
  accountId: string,
  taskId: string
) {
  const task = await db
    .prepare(
      `SELECT task_items.id, task_items.matter_id
       FROM task_items
       INNER JOIN matters ON matters.id = task_items.matter_id
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE task_items.id = ?1
         AND task_items.completed_at IS NULL
         AND practice_boards.account_id = ?2`
    )
    .bind(taskId, accountId)
    .first<{ id: string; matter_id: string }>();

  if (!task) {
    return false;
  }

  const completedAt = nowIso();

  await db
    .prepare(
      `UPDATE task_items
       SET completed_at = ?2
       WHERE id = ?1`
    )
    .bind(taskId, completedAt)
    .run();

  await insertAuditEvent(
    db,
    "task.completed",
    "task_item",
    taskId,
    JSON.stringify({ matterId: task.matter_id, completedAt })
  );

  return true;
}

export async function createNote(
  db: D1Database,
  accountId: string,
  payload: Partial<MatterNoteInput>
) {
  if (!payload.matterId?.trim()) {
    throw new Error("Matter id is required.");
  }

  if (!payload.body?.trim()) {
    throw new Error("Note body is required.");
  }

  const existing = await getMatterRecord(db, payload.matterId, accountId);

  if (!existing) {
    return null;
  }

  const noteId = crypto.randomUUID();
  const timestamp = nowIso();

  await db
    .prepare(
      `INSERT INTO matter_notes (id, matter_id, body, created_at, created_by)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    )
    .bind(noteId, payload.matterId, payload.body.trim(), timestamp, "Firm staff")
    .run();

  if (payload.addToTaskList) {
    await db
      .prepare(
        `INSERT INTO task_items (id, matter_id, body, created_at, completed_at, source_note_id)
         VALUES (?1, ?2, ?3, ?4, NULL, ?5)`
      )
      .bind(crypto.randomUUID(), payload.matterId, payload.body.trim(), timestamp, noteId)
      .run();
  }

  await db
    .prepare(
      `UPDATE matters
       SET updated_at = ?2,
           last_activity_at = ?2
       WHERE id = ?1`
    )
    .bind(payload.matterId, timestamp)
    .run();

  await insertAuditEvent(
    db,
    "note.created",
    "matter_note",
    noteId,
    JSON.stringify({ matterId: payload.matterId })
  );

  const note = await db
    .prepare(
      `SELECT id, matter_id, body, created_at, created_by
       FROM matter_notes
       WHERE id = ?1`
    )
    .bind(noteId)
    .first<MatterNoteRecord>();

  return note ? mapNote(note) : null;
}

export async function getAppStatus(env: { APP_NAME?: string }) {
  return {
    appName: env.APP_NAME ?? "CaseFlow v1.0",
    runtime: "Cloudflare Pages Functions",
    timestamp: nowIso(),
    authMode: "Cloudflare Access planned"
  };
}
