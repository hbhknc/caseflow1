import { ARCHIVE_READY_STAGE, DEFAULT_STAGE_LABELS, STAGES, isMatterStage } from "./stages";
import type {
  AppSettingRecord,
  BoardSettings,
  MatterInput,
  MatterNoteInput,
  MatterNoteRecord,
  MatterRecord,
  MatterStage,
  MatterTaskRecord,
  PracticeBoard
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
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at,
    archived: Boolean(row.archived),
    archivedAt: row.archived_at
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

async function getMatterRecord(db: D1Database, matterId: string) {
  return await db
    .prepare("SELECT * FROM matters WHERE id = ?1")
    .bind(matterId)
    .first<MatterRecord>();
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

export async function getBoardSettings(db: D1Database): Promise<BoardSettings> {
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

export async function listBoards(db: D1Database): Promise<PracticeBoard[]> {
  const settings = await getAppSettingMap(db, ["boards.registry"]);
  const registry = settings.get("boards.registry");

  if (!registry) {
    return buildDefaultBoards(await getBoardSettings(db));
  }

  try {
    const parsed = JSON.parse(registry) as Array<Partial<PracticeBoard> & { id: string; name: string }>;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return buildDefaultBoards(await getBoardSettings(db));
    }

    return parsed.map((board) => normalizeBoard(board));
  } catch {
    return buildDefaultBoards(await getBoardSettings(db));
  }
}

async function saveBoards(db: D1Database, boards: PracticeBoard[]) {
  await upsertAppSetting(db, "boards.registry", JSON.stringify(boards), nowIso());
}

export async function createBoard(db: D1Database, name: string): Promise<PracticeBoard> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Board name is required.");
  }

  const boards = await listBoards(db);
  const board = normalizeBoard({
    id: buildBoardId(trimmed, boards),
    name: trimmed,
    columnCount: DEFAULT_BOARD_SETTINGS.columnCount,
    stageLabels: DEFAULT_BOARD_SETTINGS.stageLabels
  });

  await saveBoards(db, [...boards, board]);
  return board;
}

export async function updateBoard(
  db: D1Database,
  boardId: string,
  input: {
    name?: string;
    columnCount?: number;
    stageLabels?: Partial<Record<MatterStage, string>>;
  }
): Promise<PracticeBoard | null> {
  const boards = await listBoards(db);
  const existing = boards.find((board) => board.id === boardId);

  if (!existing) {
    return null;
  }

  const updated = normalizeBoard({
    id: existing.id,
    name: input.name?.trim() || existing.name,
    columnCount: input.columnCount ?? existing.columnCount,
    stageLabels: input.stageLabels ?? existing.stageLabels
  });

  await saveBoards(
    db,
    boards.map((board) => (board.id === boardId ? updated : board))
  );

  return updated;
}

export async function deleteBoard(db: D1Database, boardId: string): Promise<PracticeBoard[]> {
  const boards = await listBoards(db);

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
  await saveBoards(db, remainingBoards);
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

export async function listMatters(db: D1Database, boardId: string) {
  const { results } = await db
    .prepare(
      `SELECT *
       FROM matters
       WHERE archived = 0
         AND board_id = ?1
       ORDER BY
         CASE stage
           WHEN 'intake' THEN 1
           WHEN 'qualified_opened' THEN 2
           WHEN 'notice_admin' THEN 3
           WHEN 'inventory_collection' THEN 4
           WHEN 'accounting_closing' THEN 5
           ELSE 99
         END,
         last_activity_at DESC`
    )
    .bind(boardId)
    .all<MatterRecord>();

  return results.map(mapMatter);
}

export async function listArchivedMatters(db: D1Database, boardId: string) {
  const { results } = await db
    .prepare(
      `SELECT *
       FROM matters
       WHERE archived = 1
         AND board_id = ?1
       ORDER BY archived_at DESC, last_activity_at DESC`
    )
    .bind(boardId)
    .all<MatterRecord>();

  return results.map(mapMatter);
}

export async function getMatterStats(db: D1Database, boardId: string) {
  const { results } = await db
    .prepare(
      `SELECT id, created_at, archived, archived_at
       FROM matters
       WHERE board_id = ?1`
    )
    .bind(boardId)
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

export async function createMatter(db: D1Database, payload: Partial<MatterInput>) {
  const input = assertMatterInput(payload);
  const matterId = crypto.randomUUID();
  const timestamp = nowIso();

  await db
    .prepare(
      `INSERT INTO matters (
        id, board_id, decedent_name, client_name, file_number, stage, created_at, updated_at, last_activity_at, archived, archived_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, ?7, 0, NULL)`
    )
    .bind(
      matterId,
      input.boardId,
      input.decedentName,
      input.clientName,
      input.fileNumber,
      input.stage,
      timestamp
    )
    .run();

  await db
    .prepare(
      `INSERT INTO matter_stage_history (id, matter_id, from_stage, to_stage, changed_at, changed_by)
       VALUES (?1, ?2, NULL, ?3, ?4, ?5)`
    )
    .bind(crypto.randomUUID(), matterId, input.stage, timestamp, "System")
    .run();

  await insertAuditEvent(
    db,
    "matter.created",
    "matter",
    matterId,
    JSON.stringify({ stage: input.stage })
  );

  const record = await getMatterRecord(db, matterId);
  if (!record) {
    throw new Error("Matter was created but could not be reloaded.");
  }

  return mapMatter(record);
}

export async function updateMatter(
  db: D1Database,
  matterId: string,
  payload: Partial<MatterInput>
) {
  const existing = await getMatterRecord(db, matterId);

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

  const timestamp = nowIso();

  await db
    .prepare(
      `UPDATE matters
       SET decedent_name = ?2,
           client_name = ?3,
           file_number = ?4,
           stage = ?5,
           board_id = ?6,
           updated_at = ?7,
           last_activity_at = CASE WHEN ?8 = 1 THEN ?7 ELSE last_activity_at END
       WHERE id = ?1`
    )
    .bind(
      matterId,
      input.decedentName,
      input.clientName,
      input.fileNumber,
      input.stage,
      input.boardId,
      timestamp,
      input.stage !== existing.stage ? 1 : 0
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

  await insertAuditEvent(
    db,
    "matter.updated",
    "matter",
    matterId,
    JSON.stringify({ fromStage: existing.stage, toStage: input.stage })
  );

  const updated = await getMatterRecord(db, matterId);
  return updated ? mapMatter(updated) : null;
}

export async function moveMatterStage(
  db: D1Database,
  matterId: string,
  stage: MatterStage
) {
  return updateMatter(db, matterId, { stage });
}

export async function deleteMatter(db: D1Database, matterId: string) {
  const existing = await getMatterRecord(db, matterId);

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

export async function archiveMatter(db: D1Database, matterId: string) {
  const existing = await getMatterRecord(db, matterId);

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

export async function unarchiveMatter(db: D1Database, matterId: string) {
  const existing = await getMatterRecord(db, matterId);

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

export async function listNotes(db: D1Database, matterId: string) {
  const { results } = await db
    .prepare(
      `SELECT id, matter_id, body, created_at, created_by
       FROM matter_notes
       WHERE matter_id = ?1
       ORDER BY created_at DESC`
    )
    .bind(matterId)
    .all<MatterNoteRecord>();

  return results.map(mapNote);
}

export async function listTasks(db: D1Database, boardId: string) {
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
       WHERE task_items.completed_at IS NULL
         AND matters.board_id = ?1
       ORDER BY task_items.created_at DESC`
    )
    .bind(boardId)
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

export async function createNote(db: D1Database, payload: Partial<MatterNoteInput>) {
  if (!payload.matterId?.trim()) {
    throw new Error("Matter id is required.");
  }

  if (!payload.body?.trim()) {
    throw new Error("Note body is required.");
  }

  const existing = await getMatterRecord(db, payload.matterId);

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
