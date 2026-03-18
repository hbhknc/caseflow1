import { ARCHIVE_READY_STAGE, isMatterStage } from "./stages";
import type {
  MatterInput,
  MatterNoteInput,
  MatterNoteRecord,
  MatterRecord,
  MatterStage,
  MatterTaskRecord
} from "./types";

function nowIso() {
  return new Date().toISOString();
}

function mapMatter(row: MatterRecord) {
  return {
    id: row.id,
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

export async function listMatters(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT *
       FROM matters
       WHERE archived = 0
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
    .all<MatterRecord>();

  return results.map(mapMatter);
}

export async function getMatterStats(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT id, created_at, archived, archived_at
       FROM matters`
    )
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
        id, decedent_name, client_name, file_number, stage, created_at, updated_at, last_activity_at, archived, archived_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?6, 0, NULL)`
    )
    .bind(
      matterId,
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
           updated_at = ?6,
           last_activity_at = CASE WHEN ?7 = 1 THEN ?6 ELSE last_activity_at END
       WHERE id = ?1`
    )
    .bind(
      matterId,
      input.decedentName,
      input.clientName,
      input.fileNumber,
      input.stage,
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

export async function listTasks(db: D1Database) {
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
       ORDER BY task_items.created_at DESC`
    )
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
    appName: env.APP_NAME ?? "CaseFlow",
    runtime: "Cloudflare Pages Functions",
    timestamp: nowIso(),
    authMode: "Cloudflare Access planned"
  };
}
