import {
  DEFAULT_DEADLINE_TEMPLATE_SETTINGS,
  buildMatterAnchorAlerts,
  calculateDeadlineReminderState,
  calculateDeadlineStatus,
  getTodayDateOnly,
  isValidDateOnly,
  normalizeOptionalDateOnly,
  reconcileGeneratedDeadlines
} from "../../src/lib/deadlineRules";
import { DEFAULT_NEW_MATTER_DEADLINE_TEMPLATE_KEY } from "../../src/lib/matterDeadlineSettings";
import type {
  Deadline,
  DeadlineDashboardData,
  DeadlinePriority,
  DeadlineReminderState,
  DeadlineStatus,
  DeadlineTemplateItemConfig,
  DeadlineTemplateKey,
  DeadlineTemplateSettings,
  MatterAnchorAlert,
  MatterDeadlineSettings,
  MatterDeadlineSummary
} from "../../src/types/deadlines";
import { ARCHIVE_READY_STAGE, DEFAULT_STAGE_LABELS, STAGES, isMatterStage } from "./stages";
import type {
  AuthenticatedUser,
  AppSettingRecord,
  BoardSettings,
  DeadlineDashboardOverview,
  MatterDeadlineCompleteInput,
  MatterDeadlineDashboardQuery,
  MatterDeadlineDismissInput,
  MatterDeadlineInput,
  MatterDeadlineRecord,
  MatterDeadlineSettingsInput,
  MatterDeadlineUpdateInput,
  MatterStats,
  MatterStatsMonth,
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

function actorDisplayName(actor: AuthenticatedUser) {
  return actor.displayName?.trim() || actor.email;
}

type AuditEventInput = {
  action: string;
  entityType: string;
  entityId: string;
  matterId?: string | null;
  actor?: AuthenticatedUser | null;
  metadata?: Record<string, unknown>;
};

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

const DEFAULT_SHARED_ACCOUNT_ID = "account_default";
const DEFAULT_SHARED_ACCOUNT_USERNAME = "caseflow";
const LEGACY_SHARED_ACCOUNT_ID = "account_hbhklaw";
const DEADLINE_TEMPLATE_SETTINGS_KEY = "deadlines.template_settings";
const EMPTY_DEADLINE_SUMMARY: MatterDeadlineSummary = {
  overdueCount: 0,
  dueTodayCount: 0,
  activeCount: 0,
  urgentReminderCount: 0,
  anchorAlertCount: 0,
  nextDeadlineTitle: null,
  nextDeadlineDueDate: null,
  nextDeadlineStatus: null,
  nextReminderState: null
};

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

function isDeadlineTemplateKey(value: string | null | undefined): value is DeadlineTemplateKey {
  return value === "standard_estate_administration" || value === "custom_manual_only";
}

function isDeadlinePriority(value: string | null | undefined): value is DeadlinePriority {
  return value === "low" || value === "medium" || value === "high";
}

function cloneDeadlineTemplateSettings(
  settings: DeadlineTemplateSettings = DEFAULT_DEADLINE_TEMPLATE_SETTINGS
): DeadlineTemplateSettings {
  return {
    templates: settings.templates.map((template) => ({
      ...template,
      items: template.items.map((item) => ({ ...item }))
    }))
  };
}

function normalizeDeadlineTemplateSettings(
  settings: DeadlineTemplateSettings | null | undefined
): DeadlineTemplateSettings {
  const normalizedDefaults = cloneDeadlineTemplateSettings(DEFAULT_DEADLINE_TEMPLATE_SETTINGS);
  const incomingTemplates = new Map((settings?.templates ?? []).map((template) => [template.key, template]));

  return {
    templates: normalizedDefaults.templates.map((defaultTemplate) => {
      const incomingTemplate = incomingTemplates.get(defaultTemplate.key);

      if (!incomingTemplate) {
        return defaultTemplate;
      }

      const incomingItems = new Map((incomingTemplate.items ?? []).map((item) => [item.key, item]));

      return {
        key: defaultTemplate.key,
        label: incomingTemplate.label?.trim() || defaultTemplate.label,
        description: incomingTemplate.description?.trim() || defaultTemplate.description,
        items: defaultTemplate.items.map((defaultItem) => {
          const incomingItem = incomingItems.get(defaultItem.key);

          return {
            key: defaultItem.key,
            title: incomingItem?.title?.trim() || defaultItem.title,
            category: incomingItem?.category?.trim() || defaultItem.category,
            anchorType:
              incomingItem?.anchorType === "publication_date" ||
              incomingItem?.anchorType === "qualification_date"
                ? incomingItem.anchorType
                : defaultItem.anchorType,
            offsetDays: Number.isFinite(Number(incomingItem?.offsetDays))
              ? Math.round(Number(incomingItem?.offsetDays))
              : defaultItem.offsetDays,
            defaultPriority: isDeadlinePriority(incomingItem?.defaultPriority)
              ? incomingItem.defaultPriority
              : defaultItem.defaultPriority,
            enabled: incomingItem?.enabled ?? defaultItem.enabled
          };
        })
      };
    })
  };
}

function buildMatterAnchorAlertContext(
  row: Pick<
    MatterRecord,
    | "id"
    | "board_id"
    | "board_name"
    | "decedent_name"
    | "client_name"
    | "file_number"
    | "deadline_template_key"
    | "qualification_date"
    | "publication_date"
  >
) {
  return {
    matterId: row.id,
    boardId: row.board_id,
    boardName: row.board_name ?? null,
    matterName: row.decedent_name,
    clientName: row.client_name,
    fileNumber: row.file_number,
    templateKey: isDeadlineTemplateKey(row.deadline_template_key)
      ? row.deadline_template_key
      : "custom_manual_only",
    qualificationDate: row.qualification_date ?? null,
    publicationDate: row.publication_date ?? null
  };
}

function getMatterAnchorIssues(
  row: Pick<
    MatterRecord,
    | "id"
    | "board_id"
    | "board_name"
    | "decedent_name"
    | "client_name"
    | "file_number"
    | "deadline_template_key"
    | "qualification_date"
    | "publication_date"
  >,
  templateSettings: DeadlineTemplateSettings
) {
  return buildMatterAnchorAlerts(buildMatterAnchorAlertContext(row), templateSettings);
}

function getMatterDeadlineSummary(
  row: MatterRecord,
  templateSettings: DeadlineTemplateSettings = DEFAULT_DEADLINE_TEMPLATE_SETTINGS
): MatterDeadlineSummary {
  const nextDeadlineDueDate = row.next_deadline_due_date ?? null;
  const nextReminderState = nextDeadlineDueDate
    ? calculateDeadlineReminderState({
        dueDate: nextDeadlineDueDate,
        completedAt: null,
        dismissedAt: null
      })
    : "none";
  const anchorIssues = getMatterAnchorIssues(row, templateSettings);

  return {
    overdueCount: Number(row.deadline_overdue_count ?? 0),
    dueTodayCount: Number(row.deadline_due_today_count ?? 0),
    activeCount: Number(row.deadline_active_count ?? 0),
    urgentReminderCount:
      Number(row.deadline_overdue_count ?? 0) +
      Number(row.deadline_due_today_count ?? 0) +
      Number(row.deadline_due_tomorrow_count ?? 0),
    anchorAlertCount: anchorIssues.length,
    nextDeadlineTitle: row.next_deadline_title ?? null,
    nextDeadlineDueDate,
    nextDeadlineStatus: nextDeadlineDueDate
      ? (calculateDeadlineStatus({
          dueDate: nextDeadlineDueDate,
          completedAt: null,
          dismissedAt: null
        }) as "upcoming" | "due_today" | "overdue")
      : null,
    nextReminderState:
      nextReminderState !== "none"
        ? (nextReminderState as Exclude<DeadlineReminderState, "none">)
        : null
  };
}

function mapMatterDeadlineSettings(row: MatterRecord): MatterDeadlineSettings {
  return {
    matterId: row.id,
    templateKey: isDeadlineTemplateKey(row.deadline_template_key)
      ? row.deadline_template_key
      : "custom_manual_only",
    qualificationDate: row.qualification_date ?? null,
    publicationDate: row.publication_date ?? null
  };
}

function mapMatter(
  row: MatterRecord,
  templateSettings: DeadlineTemplateSettings = DEFAULT_DEADLINE_TEMPLATE_SETTINGS
) {
  return {
    id: row.id,
    boardId: row.board_id,
    decedentName: row.decedent_name,
    clientName: row.client_name,
    fileNumber: row.file_number,
    deadlineTemplateKey: isDeadlineTemplateKey(row.deadline_template_key)
      ? row.deadline_template_key
      : "custom_manual_only",
    qualificationDate: row.qualification_date ?? null,
    publicationDate: row.publication_date ?? null,
    deadlineSummary: getMatterDeadlineSummary(row, templateSettings),
    stage: row.stage,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at,
    stageEnteredAt: row.stage_entered_at ?? row.created_at,
    interactionCount: Number(row.interaction_count ?? 0),
    archived: Boolean(row.archived),
    archivedAt: row.archived_at
  };
}

async function mapMatterRecordWithTemplateSettings(db: D1Database, row: MatterRecord) {
  return mapMatter(row, await getDeadlineTemplateSettings(db));
}

async function mapMatterRecordsWithTemplateSettings(
  db: D1Database,
  rows: MatterRecord[]
) {
  const templateSettings = await getDeadlineTemplateSettings(db);
  return rows.map((row) => mapMatter(row, templateSettings));
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

function mapDeadline(row: MatterDeadlineRecord): Deadline {
  return {
    id: row.id,
    matterId: row.matter_id,
    boardId: row.board_id,
    boardName: row.board_name,
    matterName: row.decedent_name,
    clientName: row.client_name,
    fileNumber: row.file_number,
    title: row.title,
    category: row.category,
    dueDate: row.due_date,
    assignee: row.assignee,
    status: calculateDeadlineStatus({
      dueDate: row.due_date,
      completedAt: row.completed_at,
      dismissedAt: row.dismissed_at
    }),
    reminderState: calculateDeadlineReminderState({
      dueDate: row.due_date,
      completedAt: row.completed_at,
      dismissedAt: row.dismissed_at
    }),
    priority: row.priority,
    sourceType: row.source_type,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    completedBy: row.completed_by,
    completionNote: row.completion_note,
    dismissedAt: row.dismissed_at,
    dismissedBy: row.dismissed_by,
    templateKey: row.template_key,
    templateItemKey: row.template_item_key,
    isOverridden: Boolean(row.is_overridden)
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

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function assertDeadlineInput(
  input: Partial<MatterDeadlineInput>,
  existing?: MatterDeadlineRecord
) {
  const matterId = input.matterId?.trim() || existing?.matter_id;
  const title = input.title?.trim() || existing?.title;
  const category = input.category?.trim() || existing?.category;
  const dueDate = input.dueDate?.trim() || existing?.due_date;
  const priority = input.priority ?? existing?.priority;
  const assignee = normalizeOptionalText(input.assignee ?? existing?.assignee);
  const notes = normalizeOptionalText(input.notes ?? existing?.notes);

  if (!matterId) {
    throw new Error("Matter id is required.");
  }

  if (!title) {
    throw new Error("Deadline title is required.");
  }

  if (!category) {
    throw new Error("Deadline category is required.");
  }

  if (!dueDate || !isValidDateOnly(dueDate)) {
    throw new Error("Deadline due date must be a valid date.");
  }

  if (!isDeadlinePriority(priority)) {
    throw new Error("Deadline priority is required.");
  }

  return {
    matterId,
    title,
    category,
    dueDate,
    assignee,
    priority,
    notes
  };
}

function assertMatterDeadlineSettingsInput(
  input: Partial<MatterDeadlineSettingsInput>,
  existing?: MatterRecord
): MatterDeadlineSettings {
  const matterId = input.matterId?.trim() || existing?.id;
  const templateKey =
    input.templateKey ??
    (isDeadlineTemplateKey(existing?.deadline_template_key)
      ? existing.deadline_template_key
      : "custom_manual_only");

  if (!matterId) {
    throw new Error("Matter id is required.");
  }

  if (!isDeadlineTemplateKey(templateKey)) {
    throw new Error("A valid deadline template is required.");
  }

  const qualificationDate =
    input.qualificationDate === undefined
      ? existing?.qualification_date ?? null
      : normalizeOptionalDateOnly(input.qualificationDate);
  const publicationDate =
    input.publicationDate === undefined
      ? existing?.publication_date ?? null
      : normalizeOptionalDateOnly(input.publicationDate);

  if (input.qualificationDate !== undefined && input.qualificationDate && !qualificationDate) {
    throw new Error("Qualification date must be a valid date.");
  }

  if (input.publicationDate !== undefined && input.publicationDate && !publicationDate) {
    throw new Error("Publication date must be a valid date.");
  }

  return {
    matterId,
    templateKey,
    qualificationDate,
    publicationDate
  };
}

function hasTemplateDeadlineOverrideChanges(
  existing: MatterDeadlineRecord,
  nextValues: ReturnType<typeof assertDeadlineInput>
) {
  return (
    nextValues.title !== existing.title ||
    nextValues.category !== existing.category ||
    nextValues.dueDate !== existing.due_date ||
    nextValues.assignee !== normalizeOptionalText(existing.assignee) ||
    nextValues.priority !== existing.priority ||
    nextValues.notes !== normalizeOptionalText(existing.notes)
  );
}

function compareOptionalText(left: string | null, right: string | null) {
  return (left ?? "").localeCompare(right ?? "", undefined, { sensitivity: "base" });
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

function getMatterDeadlineSummarySelect(currentDatePlaceholder: string) {
  return `(
      SELECT COUNT(*)
      FROM matter_deadlines
      WHERE matter_deadlines.matter_id = matters.id
        AND matter_deadlines.completed_at IS NULL
        AND matter_deadlines.dismissed_at IS NULL
        AND matter_deadlines.due_date < ${currentDatePlaceholder}
    ) AS deadline_overdue_count,
    (
      SELECT COUNT(*)
      FROM matter_deadlines
      WHERE matter_deadlines.matter_id = matters.id
        AND matter_deadlines.completed_at IS NULL
        AND matter_deadlines.dismissed_at IS NULL
        AND matter_deadlines.due_date = ${currentDatePlaceholder}
    ) AS deadline_due_today_count,
    (
      SELECT COUNT(*)
      FROM matter_deadlines
      WHERE matter_deadlines.matter_id = matters.id
        AND matter_deadlines.completed_at IS NULL
        AND matter_deadlines.dismissed_at IS NULL
        AND matter_deadlines.due_date = DATE(${currentDatePlaceholder}, '+1 day')
    ) AS deadline_due_tomorrow_count,
    (
      SELECT COUNT(*)
      FROM matter_deadlines
      WHERE matter_deadlines.matter_id = matters.id
        AND matter_deadlines.completed_at IS NULL
        AND matter_deadlines.dismissed_at IS NULL
    ) AS deadline_active_count,
    (
      SELECT matter_deadlines.title
      FROM matter_deadlines
      WHERE matter_deadlines.matter_id = matters.id
        AND matter_deadlines.completed_at IS NULL
        AND matter_deadlines.dismissed_at IS NULL
      ORDER BY matter_deadlines.due_date ASC, matter_deadlines.created_at ASC
      LIMIT 1
    ) AS next_deadline_title,
    (
      SELECT matter_deadlines.due_date
      FROM matter_deadlines
      WHERE matter_deadlines.matter_id = matters.id
        AND matter_deadlines.completed_at IS NULL
        AND matter_deadlines.dismissed_at IS NULL
      ORDER BY matter_deadlines.due_date ASC, matter_deadlines.created_at ASC
      LIMIT 1
    ) AS next_deadline_due_date`;
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
    actor: AuthenticatedUser;
    auditAction: string;
    auditDetails: Record<string, unknown>;
  }
) {
  const matterId = crypto.randomUUID();
  const updatedAt = input.lastActivityAt;

  await db
    .prepare(
      `INSERT INTO matters (
        id,
        board_id,
        decedent_name,
        client_name,
        file_number,
        deadline_template_key,
        stage,
        sort_order,
        created_at,
        created_by_email,
        created_by_id,
        updated_at,
        last_updated_by_email,
        last_updated_by_id,
        last_activity_at,
        archived,
        archived_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?10, ?11, ?13, 0, NULL)`
    )
    .bind(
      matterId,
      input.boardId,
      input.decedentName,
      input.clientName,
      input.fileNumber,
      DEFAULT_NEW_MATTER_DEADLINE_TEMPLATE_KEY,
      input.stage,
      input.sortOrder,
      input.createdAt,
      input.actor.email,
      input.actor.id,
      updatedAt,
      input.lastActivityAt
    )
    .run();

  await db
    .prepare(
      `INSERT INTO matter_stage_history (id, matter_id, from_stage, to_stage, changed_at, changed_by)
       VALUES (?1, ?2, NULL, ?3, ?4, ?5)`
    )
    .bind(
      crypto.randomUUID(),
      matterId,
      input.stage,
      input.createdAt,
      actorDisplayName(input.actor)
    )
    .run();

  await insertAuditEvent(db, {
    action: input.auditAction,
    entityType: "matter",
    entityId: matterId,
    matterId,
    actor: input.actor,
    metadata: input.auditDetails
  });

  return matterId;
}

async function touchMatterActivity(
  db: D1Database,
  matterId: string,
  actor: AuthenticatedUser,
  timestamp: string,
  includeLastActivity = true
) {
  await db
    .prepare(
      `UPDATE matters
       SET updated_at = ?2,
           last_updated_by_email = ?3,
           last_updated_by_id = ?4,
           last_activity_at = CASE WHEN ?5 = 1 THEN ?2 ELSE last_activity_at END
       WHERE id = ?1`
    )
    .bind(matterId, timestamp, actor.email, actor.id, includeLastActivity ? 1 : 0)
    .run();
}

async function getMatterRecord(db: D1Database, matterId: string, accountId?: string) {
  await ensureDefaultAccountData(db);
  const today = getTodayDateOnly();

  if (!accountId) {
    return await db
      .prepare(
        `SELECT matters.*, NULL AS board_name, ${getMatterDeadlineSummarySelect("?2")}
         FROM matters
         WHERE matters.id = ?1`
      )
      .bind(matterId, today)
      .first<MatterRecord>();
  }

  return await db
    .prepare(
      `SELECT matters.*, practice_boards.name AS board_name, ${getMatterDeadlineSummarySelect("?3")}
       FROM matters
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE matters.id = ?1
         AND practice_boards.account_id = ?2`
    )
    .bind(matterId, accountId, today)
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

async function listMatterDeadlineRecords(
  db: D1Database,
  accountId: string,
  matterId: string
) {
  await ensureDefaultAccountData(db);

  const { results } = await db
    .prepare(
      `SELECT
         matter_deadlines.*,
         matters.board_id,
         practice_boards.name AS board_name,
         matters.decedent_name,
         matters.client_name,
         matters.file_number
       FROM matter_deadlines
       INNER JOIN matters ON matters.id = matter_deadlines.matter_id
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE matter_deadlines.matter_id = ?1
         AND practice_boards.account_id = ?2
       ORDER BY
         CASE
           WHEN matter_deadlines.completed_at IS NOT NULL THEN 3
           WHEN matter_deadlines.dismissed_at IS NOT NULL THEN 4
           ELSE 1
         END,
         matter_deadlines.due_date ASC,
         matter_deadlines.updated_at DESC`
    )
    .bind(matterId, accountId)
    .all<MatterDeadlineRecord>();

  return results;
}

async function listAccountDeadlineRecords(db: D1Database, accountId: string) {
  await ensureDefaultAccountData(db);

  const { results } = await db
    .prepare(
      `SELECT
         matter_deadlines.*,
         matters.board_id,
         practice_boards.name AS board_name,
         matters.decedent_name,
         matters.client_name,
         matters.file_number
       FROM matter_deadlines
       INNER JOIN matters ON matters.id = matter_deadlines.matter_id
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE practice_boards.account_id = ?1
       ORDER BY
         CASE
           WHEN matter_deadlines.completed_at IS NOT NULL THEN 3
           WHEN matter_deadlines.dismissed_at IS NOT NULL THEN 4
           ELSE 1
         END,
         matter_deadlines.due_date ASC,
         matter_deadlines.updated_at DESC`
    )
    .bind(accountId)
    .all<MatterDeadlineRecord>();

  return results;
}

async function listAccountMatterRecords(db: D1Database, accountId: string) {
  await ensureDefaultAccountData(db);

  const { results } = await db
    .prepare(
      `SELECT
         matters.*,
         practice_boards.name AS board_name,
         ${getMatterDeadlineSummarySelect("?2")}
       FROM matters
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE practice_boards.account_id = ?1
         AND matters.archived = 0`
    )
    .bind(accountId, getTodayDateOnly())
    .all<MatterRecord>();

  return results;
}

async function listGeneratedDeadlineRecords(db: D1Database, matterId: string) {
  const { results } = await db
    .prepare(
      `SELECT
         matter_deadlines.*,
         matters.board_id,
         NULL AS board_name,
         matters.decedent_name,
         matters.client_name,
         matters.file_number
       FROM matter_deadlines
       INNER JOIN matters ON matters.id = matter_deadlines.matter_id
       WHERE matter_deadlines.matter_id = ?1
         AND matter_deadlines.source_type = 'template'`
    )
    .bind(matterId)
    .all<MatterDeadlineRecord>();

  return results;
}

async function getMatterDeadlineRecord(
  db: D1Database,
  accountId: string,
  deadlineId: string
) {
  await ensureDefaultAccountData(db);

  return await db
    .prepare(
      `SELECT
         matter_deadlines.*,
         matters.board_id,
         practice_boards.name AS board_name,
         matters.decedent_name,
         matters.client_name,
         matters.file_number
       FROM matter_deadlines
       INNER JOIN matters ON matters.id = matter_deadlines.matter_id
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE matter_deadlines.id = ?1
         AND practice_boards.account_id = ?2`
    )
    .bind(deadlineId, accountId)
    .first<MatterDeadlineRecord>();
}

async function insertDeadlineRecord(
  db: D1Database,
  input: {
    matterId: string;
    title: string;
    category: string;
    dueDate: string;
    assignee: string | null;
    priority: DeadlinePriority;
    sourceType: Deadline["sourceType"];
    notes: string | null;
    templateKey?: DeadlineTemplateKey | null;
    templateItemKey?: Deadline["templateItemKey"];
    isOverridden?: boolean;
    createdAt: string;
    updatedAt: string;
  }
) {
  const deadlineId = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO matter_deadlines (
        id,
        matter_id,
        title,
        category,
        due_date,
        assignee,
        priority,
        source_type,
        notes,
        template_key,
        template_item_key,
        is_overridden,
        created_at,
        updated_at,
        completed_at,
        completed_by,
        completed_by_email,
        completed_by_id,
        completion_note,
        dismissed_at,
        dismissed_by,
        dismissed_by_email,
        dismissed_by_id
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`
    )
    .bind(
      deadlineId,
      input.matterId,
      input.title,
      input.category,
      input.dueDate,
      input.assignee,
      input.priority,
      input.sourceType,
      input.notes,
      input.templateKey ?? null,
      input.templateItemKey ?? null,
      input.isOverridden ? 1 : 0,
      input.createdAt,
      input.updatedAt
    )
    .run();

  return deadlineId;
}

async function reconcileMatterGeneratedDeadlines(
  db: D1Database,
  matter: MatterRecord,
  actor: AuthenticatedUser,
  templateSettings: DeadlineTemplateSettings,
  timestamp: string
) {
  const existingGeneratedDeadlines = await listGeneratedDeadlineRecords(db, matter.id);
  const reconciliation = reconcileGeneratedDeadlines({
    settings: mapMatterDeadlineSettings(matter),
    templateSettings,
    existingDeadlines: existingGeneratedDeadlines.map((deadline) => ({
      id: deadline.id,
      templateKey: deadline.template_key,
      templateItemKey: deadline.template_item_key,
      sourceType: deadline.source_type,
      isOverridden: Boolean(deadline.is_overridden),
      completedAt: deadline.completed_at,
      dismissedAt: deadline.dismissed_at
    }))
  });

  for (const deadline of reconciliation.toCreate) {
    await insertDeadlineRecord(db, {
      matterId: matter.id,
      title: deadline.title,
      category: deadline.category,
      dueDate: deadline.dueDate,
      assignee: null,
      priority: deadline.priority,
      sourceType: "template",
      notes: null,
      templateKey: deadline.templateKey,
      templateItemKey: deadline.templateItemKey,
      isOverridden: false,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }

  for (const deadline of reconciliation.toUpdate) {
    await db
      .prepare(
        `UPDATE matter_deadlines
         SET title = ?2,
             category = ?3,
             due_date = ?4,
             priority = ?5,
             template_key = ?6,
             template_item_key = ?7,
             updated_at = ?8
         WHERE id = ?1
           AND completed_at IS NULL
           AND dismissed_at IS NULL`
      )
      .bind(
        deadline.id,
        deadline.title,
        deadline.category,
        deadline.dueDate,
        deadline.priority,
        deadline.templateKey,
        deadline.templateItemKey,
        timestamp
      )
      .run();
  }

  for (const deadlineId of reconciliation.toDismiss) {
    await db
      .prepare(
        `UPDATE matter_deadlines
         SET dismissed_at = ?2,
             dismissed_by = ?3,
             dismissed_by_email = ?4,
             dismissed_by_id = ?5,
             updated_at = ?2
         WHERE id = ?1
           AND completed_at IS NULL
           AND dismissed_at IS NULL`
      )
      .bind(
        deadlineId,
        timestamp,
        actorDisplayName(actor),
        actor.email,
        actor.id
      )
      .run();
  }
}

async function insertAuditEvent(db: D1Database, input: AuditEventInput) {
  await db
    .prepare(
      `INSERT INTO audit_events (
        id,
        entity_type,
        entity_id,
        matter_id,
        action,
        actor_email,
        actor_id,
        actor_name,
        details_json,
        created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
    )
    .bind(
      crypto.randomUUID(),
      input.entityType,
      input.entityId,
      input.matterId ?? null,
      input.action,
      input.actor?.email ?? null,
      input.actor?.id ?? null,
      input.actor ? actorDisplayName(input.actor) : null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      nowIso()
    )
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

function formatUtcMonthKey(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

function incrementMonthlyCounts(timestamps: string[], counts: Map<string, number>) {
  for (const timestamp of timestamps) {
    const parsed = new Date(timestamp);

    if (Number.isNaN(parsed.getTime())) {
      continue;
    }

    const monthKey = formatUtcMonthKey(
      new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1))
    );

    if (counts.has(monthKey)) {
      counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
    }
  }
}

function buildMatterActivityByMonthLast12Months(
  input: {
    openedTimestamps: string[];
    archivedTimestamps: string[];
  },
  referenceDate = new Date()
): MatterStatsMonth[] {
  const currentMonth = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1)
  );
  const months = Array.from({ length: 12 }, (_, index) => {
    const offset = index - 11;
    return new Date(
      Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + offset, 1)
    );
  });
  const openedCounts = new Map(months.map((month) => [formatUtcMonthKey(month), 0]));
  const archivedCounts = new Map(months.map((month) => [formatUtcMonthKey(month), 0]));

  incrementMonthlyCounts(input.openedTimestamps, openedCounts);
  incrementMonthlyCounts(input.archivedTimestamps, archivedCounts);

  return months.map((month) => ({
    monthStart: month.toISOString(),
    openedCount: openedCounts.get(formatUtcMonthKey(month)) ?? 0,
    archivedCount: archivedCounts.get(formatUtcMonthKey(month)) ?? 0
  }));
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

async function ensureTableColumn(
  db: D1Database,
  tableName: string,
  columnName: string,
  alterStatement: string
) {
  if (await tableHasColumn(db, tableName, columnName)) {
    return;
  }

  try {
    await db.prepare(alterStatement).run();
  } catch (error) {
    if (await tableHasColumn(db, tableName, columnName)) {
      return;
    }

    throw error;
  }
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
        deadline_template_key TEXT NOT NULL DEFAULT 'custom_manual_only',
        qualification_date TEXT,
        publication_date TEXT,
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
        created_by_email TEXT,
        created_by_id TEXT,
        updated_at TEXT NOT NULL,
        last_updated_by_email TEXT,
        last_updated_by_id TEXT,
        last_activity_at TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
        archived_at TEXT
      )`
    )
    .run();

  await ensureTableColumn(
    db,
    "matters",
    "board_id",
    `ALTER TABLE matters
     ADD COLUMN board_id TEXT NOT NULL DEFAULT 'probate'`
  );

  await db
    .prepare(
      `UPDATE matters
       SET board_id = 'probate'
       WHERE board_id IS NULL OR board_id = ''`
    )
    .run();

  await ensureTableColumn(
    db,
    "matters",
    "sort_order",
    `ALTER TABLE matters
     ADD COLUMN sort_order REAL NOT NULL DEFAULT 0`
  );

  await ensureTableColumn(
    db,
    "matters",
    "deadline_template_key",
    `ALTER TABLE matters
     ADD COLUMN deadline_template_key TEXT NOT NULL DEFAULT 'custom_manual_only'`
  );

  await ensureTableColumn(
    db,
    "matters",
    "qualification_date",
    `ALTER TABLE matters
     ADD COLUMN qualification_date TEXT`
  );

  await ensureTableColumn(
    db,
    "matters",
    "publication_date",
    `ALTER TABLE matters
     ADD COLUMN publication_date TEXT`
  );

  await db
    .prepare(
      `UPDATE matters
       SET deadline_template_key = 'custom_manual_only'
       WHERE deadline_template_key IS NULL OR deadline_template_key = ''`
    )
    .run();

  await ensureTableColumn(
    db,
    "matters",
    "created_by_email",
    `ALTER TABLE matters
     ADD COLUMN created_by_email TEXT`
  );

  await ensureTableColumn(
    db,
    "matters",
    "created_by_id",
    `ALTER TABLE matters
     ADD COLUMN created_by_id TEXT`
  );

  await ensureTableColumn(
    db,
    "matters",
    "last_updated_by_email",
    `ALTER TABLE matters
     ADD COLUMN last_updated_by_email TEXT`
  );

  await ensureTableColumn(
    db,
    "matters",
    "last_updated_by_id",
    `ALTER TABLE matters
     ADD COLUMN last_updated_by_id TEXT`
  );

  await normalizeMatterSortOrder(db);

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS matter_notes (
        id TEXT PRIMARY KEY,
        matter_id TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT,
        created_by_email TEXT,
        created_by_id TEXT,
        FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE
      )`
    )
    .run();

  await ensureTableColumn(
    db,
    "matter_notes",
    "created_by_email",
    `ALTER TABLE matter_notes
     ADD COLUMN created_by_email TEXT`
  );

  await ensureTableColumn(
    db,
    "matter_notes",
    "created_by_id",
    `ALTER TABLE matter_notes
     ADD COLUMN created_by_id TEXT`
  );

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
      `CREATE TABLE IF NOT EXISTS matter_deadlines (
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
        matter_id TEXT,
        action TEXT NOT NULL,
        actor_email TEXT,
        actor_id TEXT,
        actor_name TEXT,
        details_json TEXT,
        created_at TEXT NOT NULL
      )`
    )
    .run();

  await ensureTableColumn(
    db,
    "audit_events",
    "matter_id",
    `ALTER TABLE audit_events
     ADD COLUMN matter_id TEXT`
  );

  await ensureTableColumn(
    db,
    "audit_events",
    "actor_email",
    `ALTER TABLE audit_events
     ADD COLUMN actor_email TEXT`
  );

  await ensureTableColumn(
    db,
    "audit_events",
    "actor_id",
    `ALTER TABLE audit_events
     ADD COLUMN actor_id TEXT`
  );

  await ensureTableColumn(
    db,
    "audit_events",
    "actor_name",
    `ALTER TABLE audit_events
     ADD COLUMN actor_name TEXT`
  );

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
      `CREATE INDEX IF NOT EXISTS idx_matter_deadlines_matter_due
       ON matter_deadlines(matter_id, due_date ASC, updated_at DESC)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_matter_deadlines_due_active
       ON matter_deadlines(due_date ASC, completed_at, dismissed_at)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_matter_deadlines_assignee_due
       ON matter_deadlines(assignee, due_date ASC)`
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

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_audit_events_matter
       ON audit_events(matter_id, created_at DESC)`
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

export async function ensureDefaultAccountData(db: D1Database) {
  await ensureAccountScopeSchema(db);

  const timestamp = nowIso();
  await db
    .prepare(
      `INSERT OR IGNORE INTO accounts (id, username, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?3)`
    )
    .bind(DEFAULT_SHARED_ACCOUNT_ID, DEFAULT_SHARED_ACCOUNT_USERNAME, timestamp)
    .run();

  await db
    .prepare(
      `UPDATE practice_boards
       SET account_id = ?1
       WHERE account_id = ?2`
    )
    .bind(DEFAULT_SHARED_ACCOUNT_ID, LEGACY_SHARED_ACCOUNT_ID)
    .run();

  await db
    .prepare(
      `UPDATE accounts
       SET username = ?2,
           updated_at = ?3
       WHERE id = ?1`
    )
    .bind(DEFAULT_SHARED_ACCOUNT_ID, DEFAULT_SHARED_ACCOUNT_USERNAME, timestamp)
    .run();

  await db
    .prepare("DELETE FROM accounts WHERE id = ?1")
    .bind(LEGACY_SHARED_ACCOUNT_ID)
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
      DEFAULT_SHARED_ACCOUNT_ID,
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

export async function getDeadlineTemplateSettings(
  db: D1Database
): Promise<DeadlineTemplateSettings> {
  await ensureBaseSchema(db);

  const record = await db
    .prepare(
      `SELECT key, value, updated_at
       FROM app_settings
       WHERE key = ?1`
    )
    .bind(DEADLINE_TEMPLATE_SETTINGS_KEY)
    .first<AppSettingRecord>();

  if (!record?.value) {
    return cloneDeadlineTemplateSettings(DEFAULT_DEADLINE_TEMPLATE_SETTINGS);
  }

  try {
    return normalizeDeadlineTemplateSettings(
      JSON.parse(record.value) as DeadlineTemplateSettings
    );
  } catch {
    return cloneDeadlineTemplateSettings(DEFAULT_DEADLINE_TEMPLATE_SETTINGS);
  }
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

export async function updateDeadlineTemplateSettings(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
  input: DeadlineTemplateSettings
): Promise<DeadlineTemplateSettings> {
  await ensureDefaultAccountData(db);

  const settings = normalizeDeadlineTemplateSettings(input);
  const timestamp = nowIso();

  await upsertAppSetting(
    db,
    DEADLINE_TEMPLATE_SETTINGS_KEY,
    JSON.stringify(settings),
    timestamp
  );

  const { results } = await db
    .prepare(
      `SELECT matters.*, ${getMatterDeadlineSummarySelect("?2")}
       FROM matters
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE practice_boards.account_id = ?1`
    )
    .bind(accountId, getTodayDateOnly())
    .all<MatterRecord>();

  for (const matter of results) {
    await reconcileMatterGeneratedDeadlines(db, matter, actor, settings, timestamp);
  }

  await insertAuditEvent(db, {
    action: "settings.deadline_templates.updated",
    entityType: "app_setting",
    entityId: DEADLINE_TEMPLATE_SETTINGS_KEY,
    actor,
    metadata: {
      templateCount: settings.templates.length
    }
  });

  return settings;
}

export async function listMatters(db: D1Database, accountId: string, boardId: string) {
  await ensureDefaultAccountData(db);
  const today = getTodayDateOnly();

  const { results } = await db
    .prepare(
      `SELECT
         matters.*,
         practice_boards.name AS board_name,
         COALESCE(
           (
             SELECT matter_stage_history.changed_at
             FROM matter_stage_history
             WHERE matter_stage_history.matter_id = matters.id
               AND matter_stage_history.to_stage = matters.stage
             ORDER BY matter_stage_history.changed_at DESC
             LIMIT 1
           ),
           matters.created_at
         ) AS stage_entered_at,
         (
           SELECT COUNT(*)
           FROM matter_notes
           WHERE matter_notes.matter_id = matters.id
         ) AS interaction_count,
         ${getMatterDeadlineSummarySelect("?3")}
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
    .bind(boardId, accountId, today)
    .all<MatterRecord>();

  return await mapMatterRecordsWithTemplateSettings(db, results);
}

export async function listArchivedMatters(
  db: D1Database,
  accountId: string,
  boardId: string
) {
  await ensureDefaultAccountData(db);
  const today = getTodayDateOnly();

  const { results } = await db
    .prepare(
      `SELECT
         matters.*,
         practice_boards.name AS board_name,
         COALESCE(
           (
             SELECT matter_stage_history.changed_at
             FROM matter_stage_history
             WHERE matter_stage_history.matter_id = matters.id
               AND matter_stage_history.to_stage = matters.stage
             ORDER BY matter_stage_history.changed_at DESC
             LIMIT 1
           ),
           matters.created_at
         ) AS stage_entered_at,
         (
           SELECT COUNT(*)
           FROM matter_notes
           WHERE matter_notes.matter_id = matters.id
         ) AS interaction_count,
         ${getMatterDeadlineSummarySelect("?3")}
       FROM matters
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE matters.archived = 1
         AND matters.board_id = ?1
         AND practice_boards.account_id = ?2
       ORDER BY matters.archived_at DESC, matters.last_activity_at DESC`
    )
    .bind(boardId, accountId, today)
    .all<MatterRecord>();

  return await mapMatterRecordsWithTemplateSettings(db, results);
}

export async function getMatterStats(
  db: D1Database,
  accountId: string,
  boardId: string
): Promise<MatterStats> {
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
    averageCaseLengthDays,
    openedCasesByMonthLast12Months: buildMatterActivityByMonthLast12Months({
      openedTimestamps: results.map((matter) => matter.created_at),
      archivedTimestamps: archivedMatters.map(
        (matter) => matter.archived_at ?? matter.created_at
      )
    })
  };
}

export async function createMatter(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
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
    actor,
    auditAction: "matter.created",
    auditDetails: { stage: input.stage }
  });

  const record = await getMatterRecord(db, matterId);
  if (!record) {
    throw new Error("Matter was created but could not be reloaded.");
  }

  return await mapMatterRecordWithTemplateSettings(db, record);
}

export async function importMatters(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
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
      actor,
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
  actor: AuthenticatedUser,
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
           last_updated_by_email = ?9,
           last_updated_by_id = ?10,
           last_activity_at = CASE WHEN ?11 = 1 THEN ?8 ELSE last_activity_at END
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
      actor.email,
      actor.id,
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
        actorDisplayName(actor)
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

  await insertAuditEvent(db, {
    action: "matter.updated",
    entityType: "matter",
    entityId: matterId,
    matterId,
    actor,
    metadata: {
      fromBoardId: existing.board_id,
      toBoardId: input.boardId,
      fromStage: existing.stage,
      toStage: input.stage
    }
  });

  const updated = await getMatterRecord(db, matterId);
  return updated ? await mapMatterRecordWithTemplateSettings(db, updated) : null;
}

export async function moveMatterStage(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
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
           last_updated_by_email = ?4,
           last_updated_by_id = ?5,
           last_activity_at = CASE WHEN ?6 = 1 THEN ?3 ELSE last_activity_at END
       WHERE id = ?1`
    )
    .bind(matterId, input.stage, timestamp, actor.email, actor.id, stageChanged ? 1 : 0)
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
        actorDisplayName(actor)
      )
      .run();

    const sourceIds = await getStageMatterIdsOrdered(db, existing.board_id, existing.stage);
    await renumberStageMatterOrder(db, sourceIds);
  }

  await renumberStageMatterOrder(db, destinationIds);

  await insertAuditEvent(db, {
    action: stageChanged ? "matter.moved" : "matter.reordered",
    entityType: "matter",
    entityId: matterId,
    matterId,
    actor,
    metadata: {
      fromStage: existing.stage,
      toStage: input.stage,
      beforeMatterId
    }
  });

  const updated = await getMatterRecord(db, matterId);
  return updated ? await mapMatterRecordWithTemplateSettings(db, updated) : null;
}

export async function deleteMatter(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
  matterId: string
) {
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

  await insertAuditEvent(db, {
    action: "matter.deleted",
    entityType: "matter",
    entityId: matterId,
    matterId,
    actor,
    metadata: { fileNumber: existing.file_number }
  });

  return true;
}

export async function archiveMatter(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
  matterId: string
) {
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
           last_updated_by_email = ?3,
           last_updated_by_id = ?4,
           last_activity_at = ?2
       WHERE id = ?1`
    )
    .bind(matterId, timestamp, actor.email, actor.id)
    .run();

  await insertAuditEvent(db, {
    action: "matter.archived",
    entityType: "matter",
    entityId: matterId,
    matterId,
    actor,
    metadata: { archivedAt: timestamp }
  });

  const archived = await getMatterRecord(db, matterId);
  return archived ? await mapMatterRecordWithTemplateSettings(db, archived) : null;
}

export async function unarchiveMatter(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
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
           last_updated_by_email = ?3,
           last_updated_by_id = ?4,
           last_activity_at = ?2
       WHERE id = ?1`
    )
    .bind(matterId, timestamp, actor.email, actor.id)
    .run();

  await insertAuditEvent(db, {
    action: "matter.unarchived",
    entityType: "matter",
    entityId: matterId,
    matterId,
    actor,
    metadata: { unarchivedAt: timestamp }
  });

  const matter = await getMatterRecord(db, matterId);
  return matter ? await mapMatterRecordWithTemplateSettings(db, matter) : null;
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
  actor: AuthenticatedUser,
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

  await insertAuditEvent(db, {
    action: "task.completed",
    entityType: "task_item",
    entityId: taskId,
    matterId: task.matter_id,
    actor,
    metadata: { matterId: task.matter_id, completedAt }
  });

  return true;
}

export async function createNote(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
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
      `INSERT INTO matter_notes (
        id,
        matter_id,
        body,
        created_at,
        created_by,
        created_by_email,
        created_by_id
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    )
    .bind(
      noteId,
      payload.matterId,
      payload.body.trim(),
      timestamp,
      actorDisplayName(actor),
      actor.email,
      actor.id
    )
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
           last_updated_by_email = ?3,
           last_updated_by_id = ?4,
           last_activity_at = ?2
       WHERE id = ?1`
    )
    .bind(payload.matterId, timestamp, actor.email, actor.id)
    .run();

  await insertAuditEvent(db, {
    action: "note.created",
    entityType: "matter_note",
    entityId: noteId,
    matterId: payload.matterId,
    actor,
    metadata: { matterId: payload.matterId, addToTaskList: Boolean(payload.addToTaskList) }
  });

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

export async function getMatterDeadlines(
  db: D1Database,
  accountId: string,
  matterId: string
) {
  const matter = await getMatterRecord(db, matterId, accountId);

  if (!matter) {
    return null;
  }

  const [deadlines, templateSettings] = await Promise.all([
    listMatterDeadlineRecords(db, accountId, matterId),
    getDeadlineTemplateSettings(db)
  ]);
  const anchorIssues = getMatterAnchorIssues(matter, templateSettings);

  return {
    matter: mapMatter(matter, templateSettings),
    settings: mapMatterDeadlineSettings(matter),
    deadlines: deadlines.map(mapDeadline),
    anchorIssues
  };
}

export async function listDeadlineDashboard(
  db: D1Database,
  accountId: string,
  query: MatterDeadlineDashboardQuery = {}
): Promise<DeadlineDashboardOverview> {
  const [records, matterRecords, templateSettings] = await Promise.all([
    listAccountDeadlineRecords(db, accountId),
    listAccountMatterRecords(db, accountId),
    getDeadlineTemplateSettings(db)
  ]);
  const mappedDeadlines = records.map(mapDeadline);
  const assigneeFilter = normalizeOptionalText(query.assignee);
  const matterIdFilter = query.matterId?.trim() || null;
  const statusFilter = query.status && query.status !== "all" ? query.status : "all";

  const deadlines = mappedDeadlines.filter((deadline) => {
    if (assigneeFilter && compareOptionalText(deadline.assignee, assigneeFilter) !== 0) {
      return false;
    }

    if (matterIdFilter && deadline.matterId !== matterIdFilter) {
      return false;
    }

    if (statusFilter !== "all" && deadline.status !== statusFilter) {
      return false;
    }

    return true;
  });

  const assignees = Array.from(
    new Set(
      mappedDeadlines
        .map((deadline) => normalizeOptionalText(deadline.assignee))
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));

  const matters = Array.from(
    new Map(
      matterRecords.map((record) => [
        record.id,
        {
          matterId: record.id,
          boardId: record.board_id,
          boardName: record.board_name ?? null,
          label: `${record.decedent_name} | ${record.file_number}`
        }
      ])
    ).values()
  ).sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base" }));

  const anchorIssues =
    statusFilter === "all" || statusFilter === "upcoming"
      ? matterRecords
          .flatMap((record) => getMatterAnchorIssues(record, templateSettings))
          .filter((issue) => !matterIdFilter || issue.matterId === matterIdFilter)
      : [];

  return {
    deadlines,
    anchorIssues,
    assignees,
    matters
  };
}

export async function createDeadline(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
  payload: Partial<MatterDeadlineInput>
) {
  const input = assertDeadlineInput(payload);
  const matter = await getMatterRecord(db, input.matterId, accountId);

  if (!matter) {
    return null;
  }

  const timestamp = nowIso();
  const deadlineId = await insertDeadlineRecord(db, {
    matterId: input.matterId,
    title: input.title,
    category: input.category,
    dueDate: input.dueDate,
    assignee: input.assignee,
    priority: input.priority,
    sourceType: "manual",
    notes: input.notes,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  await touchMatterActivity(db, input.matterId, actor, timestamp);

  await insertAuditEvent(db, {
    action: "deadline.created",
    entityType: "matter_deadline",
    entityId: deadlineId,
    matterId: input.matterId,
    actor,
    metadata: {
      sourceType: "manual",
      dueDate: input.dueDate
    }
  });

  const [updatedMatter, deadline] = await Promise.all([
    getMatterRecord(db, input.matterId, accountId),
    getMatterDeadlineRecord(db, accountId, deadlineId)
  ]);

  if (!updatedMatter || !deadline) {
    return null;
  }

  return {
    matter: await mapMatterRecordWithTemplateSettings(db, updatedMatter),
    deadline: mapDeadline(deadline)
  };
}

export async function updateDeadline(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
  deadlineId: string,
  payload: Partial<MatterDeadlineUpdateInput>
) {
  const existing = await getMatterDeadlineRecord(db, accountId, deadlineId);

  if (!existing) {
    return null;
  }

  if (existing.completed_at) {
    throw new Error("Completed deadlines cannot be edited.");
  }

  if (existing.dismissed_at) {
    throw new Error("Dismissed deadlines cannot be edited.");
  }

  const input = assertDeadlineInput(payload, existing);
  const timestamp = nowIso();
  const isOverridden =
    existing.source_type === "template" &&
    (Boolean(existing.is_overridden) || hasTemplateDeadlineOverrideChanges(existing, input));

  await db
    .prepare(
      `UPDATE matter_deadlines
       SET title = ?2,
           category = ?3,
           due_date = ?4,
           assignee = ?5,
           priority = ?6,
           notes = ?7,
           is_overridden = ?8,
           updated_at = ?9
       WHERE id = ?1`
    )
    .bind(
      deadlineId,
      input.title,
      input.category,
      input.dueDate,
      input.assignee,
      input.priority,
      input.notes,
      isOverridden ? 1 : 0,
      timestamp
    )
    .run();

  await touchMatterActivity(db, existing.matter_id, actor, timestamp);

  await insertAuditEvent(db, {
    action: "deadline.updated",
    entityType: "matter_deadline",
    entityId: deadlineId,
    matterId: existing.matter_id,
    actor,
    metadata: {
      sourceType: existing.source_type,
      isOverridden
    }
  });

  const [updatedMatter, deadline] = await Promise.all([
    getMatterRecord(db, existing.matter_id, accountId),
    getMatterDeadlineRecord(db, accountId, deadlineId)
  ]);

  if (!updatedMatter || !deadline) {
    return null;
  }

  return {
    matter: await mapMatterRecordWithTemplateSettings(db, updatedMatter),
    deadline: mapDeadline(deadline)
  };
}

export async function completeDeadline(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
  input: MatterDeadlineCompleteInput
) {
  if (!input.deadlineId?.trim()) {
    throw new Error("Deadline id is required.");
  }

  const existing = await getMatterDeadlineRecord(db, accountId, input.deadlineId);

  if (!existing) {
    return null;
  }

  if (existing.dismissed_at) {
    throw new Error("Dismissed deadlines cannot be completed.");
  }

  if (existing.completed_at) {
    const matter = await getMatterRecord(db, existing.matter_id, accountId);

    if (!matter) {
      return null;
    }

    return {
      matter: await mapMatterRecordWithTemplateSettings(db, matter),
      deadline: mapDeadline(existing)
    };
  }

  const completedAt = nowIso();
  const completionNote = normalizeOptionalText(input.completionNote);

  await db
    .prepare(
      `UPDATE matter_deadlines
       SET completed_at = ?2,
           completed_by = ?3,
           completed_by_email = ?4,
           completed_by_id = ?5,
           completion_note = ?6,
           updated_at = ?2
       WHERE id = ?1
         AND completed_at IS NULL
         AND dismissed_at IS NULL`
    )
    .bind(
      existing.id,
      completedAt,
      actorDisplayName(actor),
      actor.email,
      actor.id,
      completionNote
    )
    .run();

  await touchMatterActivity(db, existing.matter_id, actor, completedAt);

  await insertAuditEvent(db, {
    action: "deadline.completed",
    entityType: "matter_deadline",
    entityId: existing.id,
    matterId: existing.matter_id,
    actor,
    metadata: {
      completedAt,
      completionNote
    }
  });

  const [updatedMatter, deadline] = await Promise.all([
    getMatterRecord(db, existing.matter_id, accountId),
    getMatterDeadlineRecord(db, accountId, existing.id)
  ]);

  if (!updatedMatter || !deadline) {
    return null;
  }

  return {
    matter: await mapMatterRecordWithTemplateSettings(db, updatedMatter),
    deadline: mapDeadline(deadline)
  };
}

export async function dismissDeadline(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
  input: MatterDeadlineDismissInput
) {
  if (!input.deadlineId?.trim()) {
    throw new Error("Deadline id is required.");
  }

  const existing = await getMatterDeadlineRecord(db, accountId, input.deadlineId);

  if (!existing) {
    return null;
  }

  if (existing.completed_at) {
    throw new Error("Completed deadlines cannot be dismissed.");
  }

  if (existing.dismissed_at) {
    const matter = await getMatterRecord(db, existing.matter_id, accountId);

    if (!matter) {
      return null;
    }

    return {
      matter: await mapMatterRecordWithTemplateSettings(db, matter),
      deadline: mapDeadline(existing)
    };
  }

  const dismissedAt = nowIso();

  await db
    .prepare(
      `UPDATE matter_deadlines
       SET dismissed_at = ?2,
           dismissed_by = ?3,
           dismissed_by_email = ?4,
           dismissed_by_id = ?5,
           updated_at = ?2
       WHERE id = ?1
         AND completed_at IS NULL
         AND dismissed_at IS NULL`
    )
    .bind(existing.id, dismissedAt, actorDisplayName(actor), actor.email, actor.id)
    .run();

  await touchMatterActivity(db, existing.matter_id, actor, dismissedAt);

  await insertAuditEvent(db, {
    action: "deadline.dismissed",
    entityType: "matter_deadline",
    entityId: existing.id,
    matterId: existing.matter_id,
    actor,
    metadata: {
      dismissedAt
    }
  });

  const [updatedMatter, deadline] = await Promise.all([
    getMatterRecord(db, existing.matter_id, accountId),
    getMatterDeadlineRecord(db, accountId, existing.id)
  ]);

  if (!updatedMatter || !deadline) {
    return null;
  }

  return {
    matter: await mapMatterRecordWithTemplateSettings(db, updatedMatter),
    deadline: mapDeadline(deadline)
  };
}

export async function saveMatterDeadlineSettings(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
  payload: Partial<MatterDeadlineSettingsInput>
) {
  if (!payload.matterId?.trim()) {
    throw new Error("Matter id is required.");
  }

  const existingMatter = await getMatterRecord(db, payload.matterId, accountId);

  if (!existingMatter) {
    return null;
  }

  const settings = assertMatterDeadlineSettingsInput(payload, existingMatter);
  const templateSettings = await getDeadlineTemplateSettings(db);
  const timestamp = nowIso();

  await db
    .prepare(
      `UPDATE matters
       SET deadline_template_key = ?2,
           qualification_date = ?3,
           publication_date = ?4,
           updated_at = ?5,
           last_updated_by_email = ?6,
           last_updated_by_id = ?7,
           last_activity_at = ?5
       WHERE id = ?1`
    )
    .bind(
      existingMatter.id,
      settings.templateKey,
      settings.qualificationDate,
      settings.publicationDate,
      timestamp,
      actor.email,
      actor.id
    )
    .run();

  const updatedMatterRecord = await getMatterRecord(db, existingMatter.id, accountId);

  if (!updatedMatterRecord) {
    return null;
  }

  await reconcileMatterGeneratedDeadlines(
    db,
    updatedMatterRecord,
    actor,
    templateSettings,
    timestamp
  );

  await insertAuditEvent(db, {
    action: "matter.deadline_settings.updated",
    entityType: "matter",
    entityId: existingMatter.id,
    matterId: existingMatter.id,
    actor,
    metadata: {
      templateKey: settings.templateKey,
      qualificationDate: settings.qualificationDate,
      publicationDate: settings.publicationDate
    }
  });

  const [finalMatter, deadlineRecords] = await Promise.all([
    getMatterRecord(db, existingMatter.id, accountId),
    listMatterDeadlineRecords(db, accountId, existingMatter.id)
  ]);

  if (!finalMatter) {
    return null;
  }

  return {
    matter: mapMatter(finalMatter, templateSettings),
    settings: mapMatterDeadlineSettings(finalMatter),
    deadlines: deadlineRecords.map(mapDeadline),
    anchorIssues: getMatterAnchorIssues(finalMatter, templateSettings)
  };
}

export async function getAppStatus(env: { APP_NAME?: string; ACCESS_DEV_BYPASS?: string }) {
  return {
    appName: env.APP_NAME ?? "CaseFlow v1.0",
    runtime: "Cloudflare Pages Functions",
    timestamp: nowIso(),
    authMode:
      env.ACCESS_DEV_BYPASS?.trim().toLowerCase() === "true"
        ? "Cloudflare Access with local dev bypass"
        : "Cloudflare Access"
  };
}
