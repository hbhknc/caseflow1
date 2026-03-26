import {
  createEmptyProbateAccountingInput,
  hasProbateAccountingContentChanges,
  normalizeProbateAccountingInput,
  summarizeProbateAccounting
} from "../../src/lib/accounting";
import type {
  ProbateAccountingAssetRow,
  ProbateAccountingDetail,
  ProbateAccountingInput,
  ProbateAccountingLedgerEntry,
  ProbateAccountingMatterOption,
  ProbateAccountingSummary,
  ProbateAccountingType
} from "../../src/types/accounting";
import { ensureDefaultAccountData } from "./matterRepository";
import type {
  AuthenticatedUser,
  MatterRecord,
  ProbateAccountingAssetRecord,
  ProbateAccountingEntryRecord,
  ProbateAccountingListQuery,
  ProbateAccountingRecord
} from "./types";

function nowIso() {
  return new Date().toISOString();
}

function actorDisplayName(actor: AuthenticatedUser) {
  return actor.displayName?.trim() || actor.email;
}

function isProbateAccountingType(value: string | null | undefined): value is ProbateAccountingType {
  return value === "annual" || value === "final";
}

function buildLikeSearch(value: string) {
  return `%${value.trim().toLowerCase()}%`;
}

async function ensureAccountingSchema(db: D1Database) {
  await ensureDefaultAccountData(db);

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS probate_accountings (
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
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS probate_accounting_entries (
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
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS probate_accounting_assets (
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
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_probate_accountings_account_updated
       ON probate_accountings(account_id, updated_at DESC)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_probate_accountings_account_status_type
       ON probate_accountings(account_id, status, account_type, updated_at DESC)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_probate_accountings_matter
       ON probate_accountings(matter_id, updated_at DESC)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_probate_accounting_entries_accounting_sort
       ON probate_accounting_entries(accounting_id, sort_order ASC, created_at ASC)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_probate_accounting_assets_accounting_sort
       ON probate_accounting_assets(accounting_id, sort_order ASC, created_at ASC)`
    )
    .run();
}

function buildLinkedMatterLabel(
  row: Pick<
    ProbateAccountingRecord,
    "linked_matter_name" | "linked_matter_file_number" | "linked_matter_archived"
  >
) {
  if (!row.linked_matter_name && !row.linked_matter_file_number) {
    return null;
  }

  const base = [row.linked_matter_name, row.linked_matter_file_number]
    .filter(Boolean)
    .join(" | ");

  return row.linked_matter_archived ? `${base} (Archived)` : base;
}

function mapLedgerEntry(row: ProbateAccountingEntryRecord): ProbateAccountingLedgerEntry {
  return {
    id: row.id,
    entryType: row.entry_type,
    entryDate: row.entry_date ?? null,
    partyName: row.party_name ?? "",
    description: row.description ?? "",
    amountCents: Number(row.amount_cents ?? 0),
    proofReference: row.proof_reference ?? "",
    sortOrder: Number(row.sort_order ?? 0)
  };
}

function mapAssetRow(row: ProbateAccountingAssetRecord): ProbateAccountingAssetRow {
  return {
    id: row.id,
    assetType: row.asset_type,
    description: row.description ?? "",
    amountCents: Number(row.amount_cents ?? 0),
    proofReference: row.proof_reference ?? "",
    sortOrder: Number(row.sort_order ?? 0)
  };
}

function mapAccountingInput(
  row: ProbateAccountingRecord,
  entries: ProbateAccountingEntryRecord[],
  assets: ProbateAccountingAssetRecord[]
): ProbateAccountingInput {
  return {
    matterId: row.matter_id,
    accountType: row.account_type,
    status: row.status,
    county: row.county ?? "",
    fileNumber: row.file_number ?? "",
    decedentName: row.decedent_name ?? "",
    fiduciaryName: row.fiduciary_name ?? "",
    fiduciaryAddress: row.fiduciary_address ?? "",
    coFiduciaryName: row.co_fiduciary_name ?? "",
    coFiduciaryAddress: row.co_fiduciary_address ?? "",
    dateOfDeath: row.date_of_death ?? null,
    periodStart: row.period_start ?? null,
    periodEnd: row.period_end ?? null,
    openingPersonalPropertyCents: Number(row.opening_personal_property_cents ?? 0),
    lossFromSaleCents: Number(row.loss_from_sale_cents ?? 0),
    lossExplanation: row.loss_explanation ?? "",
    entries: [...entries]
      .sort((left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0))
      .map(mapLedgerEntry),
    assets: [...assets]
      .sort((left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0))
      .map(mapAssetRow)
  };
}

function mapMatterOption(
  row: Pick<
    MatterRecord,
    "id" | "board_name" | "decedent_name" | "file_number" | "client_name" | "archived"
  >
): ProbateAccountingMatterOption {
  return {
    id: row.id,
    label: `${row.decedent_name} | ${row.file_number}${row.archived ? " (Archived)" : ""}`,
    boardName: row.board_name ?? null,
    archived: Boolean(row.archived),
    decedentName: row.decedent_name,
    fileNumber: row.file_number,
    clientName: row.client_name
  };
}

async function insertAuditEvent(
  db: D1Database,
  input: {
    entityId: string;
    action: string;
    actor: AuthenticatedUser;
    metadata?: Record<string, unknown>;
  }
) {
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
      ) VALUES (?1, 'probate_accounting', ?2, NULL, ?3, ?4, ?5, ?6, ?7, ?8)`
    )
    .bind(
      crypto.randomUUID(),
      input.entityId,
      input.action,
      input.actor.email,
      input.actor.id,
      actorDisplayName(input.actor),
      input.metadata ? JSON.stringify(input.metadata) : null,
      nowIso()
    )
    .run();
}

async function getMatterForAccount(
  db: D1Database,
  accountId: string,
  matterId: string
) {
  return await db
    .prepare(
      `SELECT matters.*, practice_boards.name AS board_name
       FROM matters
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE matters.id = ?1
         AND practice_boards.account_id = ?2`
    )
    .bind(matterId, accountId)
    .first<MatterRecord>();
}

async function getMatterOptions(db: D1Database, accountId: string) {
  const { results } = await db
    .prepare(
      `SELECT matters.*, practice_boards.name AS board_name
       FROM matters
       INNER JOIN practice_boards ON practice_boards.id = matters.board_id
       WHERE practice_boards.account_id = ?1
       ORDER BY matters.archived ASC, matters.decedent_name COLLATE NOCASE ASC, matters.file_number COLLATE NOCASE ASC`
    )
    .bind(accountId)
    .all<MatterRecord>();

  return results.map(mapMatterOption);
}

async function getAccountingRecord(
  db: D1Database,
  accountId: string,
  accountingId: string
) {
  return await db
    .prepare(
      `SELECT
         probate_accountings.*,
         matters.decedent_name AS linked_matter_name,
         matters.file_number AS linked_matter_file_number,
         matters.archived AS linked_matter_archived
       FROM probate_accountings
       LEFT JOIN matters ON matters.id = probate_accountings.matter_id
       LEFT JOIN practice_boards
         ON practice_boards.id = matters.board_id
        AND practice_boards.account_id = probate_accountings.account_id
       WHERE probate_accountings.id = ?1
         AND probate_accountings.account_id = ?2`
    )
    .bind(accountingId, accountId)
    .first<ProbateAccountingRecord>();
}

async function listAccountingEntryRecords(
  db: D1Database,
  accountingId: string
) {
  const { results } = await db
    .prepare(
      `SELECT *
       FROM probate_accounting_entries
       WHERE accounting_id = ?1
       ORDER BY sort_order ASC, created_at ASC`
    )
    .bind(accountingId)
    .all<ProbateAccountingEntryRecord>();

  return results;
}

async function listAccountingAssetRecords(
  db: D1Database,
  accountingId: string
) {
  const { results } = await db
    .prepare(
      `SELECT *
       FROM probate_accounting_assets
       WHERE accounting_id = ?1
       ORDER BY sort_order ASC, created_at ASC`
    )
    .bind(accountingId)
    .all<ProbateAccountingAssetRecord>();

  return results;
}

async function listChildRecordsForAccountings<T extends ProbateAccountingEntryRecord | ProbateAccountingAssetRecord>(
  db: D1Database,
  tableName: "probate_accounting_entries" | "probate_accounting_assets",
  accountingIds: string[]
) {
  if (accountingIds.length === 0) {
    return [] as T[];
  }

  const placeholders = accountingIds.map((_, index) => `?${index + 1}`).join(", ");
  const { results } = await db
    .prepare(
      `SELECT *
       FROM ${tableName}
       WHERE accounting_id IN (${placeholders})
       ORDER BY sort_order ASC, created_at ASC`
    )
    .bind(...accountingIds)
    .all<T>();

  return results;
}

async function buildAccountingDetail(
  db: D1Database,
  accountId: string,
  row: ProbateAccountingRecord
): Promise<ProbateAccountingDetail> {
  const [entries, assets, matterOptions] = await Promise.all([
    listAccountingEntryRecords(db, row.id),
    listAccountingAssetRecords(db, row.id),
    getMatterOptions(db, accountId)
  ]);
  const input = mapAccountingInput(row, entries, assets);

  return {
    id: row.id,
    createdAt: row.created_at,
    createdBy: row.created_by_email ?? null,
    updatedAt: row.updated_at,
    updatedBy: row.last_updated_by_email ?? null,
    matterOptions,
    computed: summarizeProbateAccounting(input),
    ...input
  };
}

export async function listProbateAccountings(
  db: D1Database,
  accountId: string,
  filters: ProbateAccountingListQuery = {}
): Promise<ProbateAccountingSummary[]> {
  await ensureAccountingSchema(db);

  const clauses = ["probate_accountings.account_id = ?1"];
  const params: (string | null)[] = [accountId];

  if (filters.status && filters.status !== "all") {
    clauses.push(`probate_accountings.status = ?${params.length + 1}`);
    params.push(filters.status);
  }

  if (filters.accountType && filters.accountType !== "all") {
    clauses.push(`probate_accountings.account_type = ?${params.length + 1}`);
    params.push(filters.accountType);
  }

  if (filters.search?.trim()) {
    const likeSearch = buildLikeSearch(filters.search);
    clauses.push(
      `(LOWER(COALESCE(probate_accountings.decedent_name, '')) LIKE ?${params.length + 1}
        OR LOWER(COALESCE(probate_accountings.file_number, '')) LIKE ?${params.length + 2}
        OR LOWER(COALESCE(probate_accountings.fiduciary_name, '')) LIKE ?${params.length + 3}
        OR LOWER(COALESCE(probate_accountings.county, '')) LIKE ?${params.length + 4})`
    );
    params.push(likeSearch, likeSearch, likeSearch, likeSearch);
  }

  const { results } = await db
    .prepare(
      `SELECT
         probate_accountings.*,
         matters.decedent_name AS linked_matter_name,
         matters.file_number AS linked_matter_file_number,
         matters.archived AS linked_matter_archived
       FROM probate_accountings
       LEFT JOIN matters ON matters.id = probate_accountings.matter_id
       LEFT JOIN practice_boards
         ON practice_boards.id = matters.board_id
        AND practice_boards.account_id = probate_accountings.account_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY probate_accountings.updated_at DESC, probate_accountings.created_at DESC`
    )
    .bind(...params)
    .all<ProbateAccountingRecord>();

  if (results.length === 0) {
    return [];
  }

  const accountingIds = results.map((row) => row.id);
  const [entries, assets] = await Promise.all([
    listChildRecordsForAccountings<ProbateAccountingEntryRecord>(
      db,
      "probate_accounting_entries",
      accountingIds
    ),
    listChildRecordsForAccountings<ProbateAccountingAssetRecord>(
      db,
      "probate_accounting_assets",
      accountingIds
    )
  ]);
  const entriesByAccountingId = new Map<string, ProbateAccountingEntryRecord[]>();
  const assetsByAccountingId = new Map<string, ProbateAccountingAssetRecord[]>();

  entries.forEach((entry) => {
    const bucket = entriesByAccountingId.get(entry.accounting_id) ?? [];
    bucket.push(entry);
    entriesByAccountingId.set(entry.accounting_id, bucket);
  });

  assets.forEach((asset) => {
    const bucket = assetsByAccountingId.get(asset.accounting_id) ?? [];
    bucket.push(asset);
    assetsByAccountingId.set(asset.accounting_id, bucket);
  });

  return results.map((row) => {
    const input = mapAccountingInput(
      row,
      entriesByAccountingId.get(row.id) ?? [],
      assetsByAccountingId.get(row.id) ?? []
    );
    const computed = summarizeProbateAccounting(input);

    return {
      id: row.id,
      matterId: row.matter_id,
      linkedMatterLabel: buildLinkedMatterLabel(row),
      accountType: row.account_type,
      status: row.status,
      county: row.county ?? "",
      fileNumber: row.file_number ?? "",
      decedentName: row.decedent_name ?? "",
      fiduciaryName: row.fiduciary_name ?? "",
      periodStart: row.period_start ?? null,
      periodEnd: row.period_end ?? null,
      updatedAt: row.updated_at,
      line9BalanceCents: computed.totals.line9BalanceCents
    };
  });
}

export async function createProbateAccounting(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
  payload: Partial<{ matterId: string; accountType: ProbateAccountingType }> = {}
): Promise<ProbateAccountingDetail> {
  await ensureAccountingSchema(db);

  const timestamp = nowIso();
  const input = createEmptyProbateAccountingInput();
  input.accountType = isProbateAccountingType(payload.accountType) ? payload.accountType : "annual";

  if (payload.matterId?.trim()) {
    const matter = await getMatterForAccount(db, accountId, payload.matterId.trim());

    if (!matter) {
      throw new Error("Linked matter was not found.");
    }

    input.matterId = matter.id;
    input.decedentName = matter.decedent_name;
    input.fileNumber = matter.file_number;
    input.fiduciaryName = matter.client_name;
  }

  const accountingId = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO probate_accountings (
        id,
        account_id,
        matter_id,
        account_type,
        status,
        county,
        file_number,
        decedent_name,
        fiduciary_name,
        fiduciary_address,
        co_fiduciary_name,
        co_fiduciary_address,
        date_of_death,
        period_start,
        period_end,
        opening_personal_property_cents,
        loss_from_sale_cents,
        loss_explanation,
        created_at,
        created_by_email,
        created_by_id,
        updated_at,
        last_updated_by_email,
        last_updated_by_id
      ) VALUES (?1, ?2, ?3, ?4, 'draft', ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?18, ?19, ?20)`
    )
    .bind(
      accountingId,
      accountId,
      input.matterId,
      input.accountType,
      input.county,
      input.fileNumber,
      input.decedentName,
      input.fiduciaryName,
      input.fiduciaryAddress,
      input.coFiduciaryName,
      input.coFiduciaryAddress,
      input.dateOfDeath,
      input.periodStart,
      input.periodEnd,
      input.openingPersonalPropertyCents,
      input.lossFromSaleCents,
      input.lossExplanation,
      timestamp,
      actor.email,
      actor.id
    )
    .run();

  await insertAuditEvent(db, {
    entityId: accountingId,
    action: "probate_accounting.created",
    actor,
    metadata: {
      accountType: input.accountType,
      matterId: input.matterId
    }
  });

  const created = await getProbateAccountingDetail(db, accountId, accountingId);

  if (!created) {
    throw new Error("Unable to reload the created accounting.");
  }

  return created;
}

export async function getProbateAccountingDetail(
  db: D1Database,
  accountId: string,
  accountingId: string
) {
  await ensureAccountingSchema(db);

  const record = await getAccountingRecord(db, accountId, accountingId);

  if (!record) {
    return null;
  }

  return await buildAccountingDetail(db, accountId, record);
}

export async function saveProbateAccounting(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
  accountingId: string,
  payload: Partial<ProbateAccountingInput>
) {
  await ensureAccountingSchema(db);

  const record = await getAccountingRecord(db, accountId, accountingId);

  if (!record) {
    return null;
  }

  const [existingEntries, existingAssets] = await Promise.all([
    listAccountingEntryRecords(db, accountingId),
    listAccountingAssetRecords(db, accountingId)
  ]);
  const existingInput = mapAccountingInput(record, existingEntries, existingAssets);
  const nextInput = normalizeProbateAccountingInput({
    ...existingInput,
    ...payload,
    entries: payload.entries ?? existingInput.entries,
    assets: payload.assets ?? existingInput.assets,
    status: payload.status ?? existingInput.status
  });

  if (nextInput.matterId) {
    const linkedMatter = await getMatterForAccount(db, accountId, nextInput.matterId);

    if (!linkedMatter) {
      throw new Error("Linked matter was not found.");
    }
  }

  const computed = summarizeProbateAccounting(nextInput);
  const contentChanged = hasProbateAccountingContentChanges(existingInput, nextInput);
  let nextStatus = nextInput.status;

  if (nextStatus === "review_ready" && !computed.isReviewReady) {
    throw new Error("Resolve review issues before marking the accounting review ready.");
  }

  if (nextStatus !== "review_ready") {
    nextStatus = "draft";
  }

  if (record.status === "review_ready" && contentChanged && nextInput.status !== "review_ready") {
    nextStatus = "draft";
  }

  const timestamp = nowIso();
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `UPDATE probate_accountings
         SET matter_id = ?2,
             account_type = ?3,
             status = ?4,
             county = ?5,
             file_number = ?6,
             decedent_name = ?7,
             fiduciary_name = ?8,
             fiduciary_address = ?9,
             co_fiduciary_name = ?10,
             co_fiduciary_address = ?11,
             date_of_death = ?12,
             period_start = ?13,
             period_end = ?14,
             opening_personal_property_cents = ?15,
             loss_from_sale_cents = ?16,
             loss_explanation = ?17,
             updated_at = ?18,
             last_updated_by_email = ?19,
             last_updated_by_id = ?20
         WHERE id = ?1
           AND account_id = ?21`
      )
      .bind(
        accountingId,
        nextInput.matterId,
        nextInput.accountType,
        nextStatus,
        nextInput.county,
        nextInput.fileNumber,
        nextInput.decedentName,
        nextInput.fiduciaryName,
        nextInput.fiduciaryAddress,
        nextInput.coFiduciaryName,
        nextInput.coFiduciaryAddress,
        nextInput.dateOfDeath,
        nextInput.periodStart,
        nextInput.periodEnd,
        nextInput.openingPersonalPropertyCents,
        nextInput.lossFromSaleCents,
        nextInput.lossExplanation,
        timestamp,
        actor.email,
        actor.id,
        accountId
      ),
    db.prepare(`DELETE FROM probate_accounting_entries WHERE accounting_id = ?1`).bind(accountingId),
    db.prepare(`DELETE FROM probate_accounting_assets WHERE accounting_id = ?1`).bind(accountingId)
  ];

  nextInput.entries.forEach((entry, index) => {
    statements.push(
      db
        .prepare(
          `INSERT INTO probate_accounting_entries (
            id,
            accounting_id,
            entry_type,
            entry_date,
            party_name,
            description,
            amount_cents,
            proof_reference,
            sort_order,
            created_at,
            updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)`
        )
        .bind(
          entry.id?.trim() || crypto.randomUUID(),
          accountingId,
          entry.entryType,
          entry.entryDate,
          entry.partyName,
          entry.description,
          entry.amountCents,
          entry.proofReference || null,
          index + 1,
          timestamp
        )
    );
  });

  nextInput.assets.forEach((asset, index) => {
    statements.push(
      db
        .prepare(
          `INSERT INTO probate_accounting_assets (
            id,
            accounting_id,
            asset_type,
            description,
            amount_cents,
            proof_reference,
            sort_order,
            created_at,
            updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)`
        )
        .bind(
          asset.id?.trim() || crypto.randomUUID(),
          accountingId,
          asset.assetType,
          asset.description,
          asset.amountCents,
          asset.proofReference || null,
          index + 1,
          timestamp
        )
    );
  });

  await db.batch(statements);

  await insertAuditEvent(db, {
    entityId: accountingId,
    action: "probate_accounting.updated",
    actor,
    metadata: {
      accountType: nextInput.accountType,
      status: nextStatus,
      matterId: nextInput.matterId,
      contentChanged
    }
  });

  return await getProbateAccountingDetail(db, accountId, accountingId);
}

export async function deleteProbateAccounting(
  db: D1Database,
  accountId: string,
  actor: AuthenticatedUser,
  accountingId: string
) {
  await ensureAccountingSchema(db);

  const record = await getAccountingRecord(db, accountId, accountingId);

  if (!record) {
    return false;
  }

  if (record.status !== "draft") {
    throw new Error("Only draft accountings can be deleted.");
  }

  await db
    .prepare(
      `DELETE FROM probate_accountings
       WHERE id = ?1
         AND account_id = ?2`
    )
    .bind(accountingId, accountId)
    .run();

  await insertAuditEvent(db, {
    entityId: accountingId,
    action: "probate_accounting.deleted",
    actor,
    metadata: {
      accountType: record.account_type
    }
  });

  return true;
}
