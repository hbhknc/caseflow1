import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import {
  CURRENT_ACCOUNTING_FORM_VERSION_LABEL,
  getAccountingEntryTypeLabel,
  getAccountingFormVersionInfo,
  getHeldAssetTypeLabel
} from "@/lib/accountingRules";
import { formatDateOnly, formatDateTime } from "@/lib/dates";
import {
  ENTRY_CATEGORY_OPTIONS,
  ESTATE_TYPE_OPTIONS,
  HELD_ASSET_TYPE_OPTIONS,
  PROOF_STATUS_OPTIONS,
  formatAccountType,
  formatCurrency,
  formatPeriodRange,
  toAmountInputValue
} from "@/features/accounting/lib/accountingUi";
import type {
  AccountingAccountType,
  AccountingEntryType,
  AccountingPeriodDetail,
  AccountingPeriodInput,
  AccountingPeriodSummary,
  AccountingPeriodUpdateInput,
  AccountingValidationIssue,
  HeldAsset,
  HeldAssetInput,
  HeldAssetType,
  HeldAssetUpdateInput,
  LedgerEntry,
  LedgerEntryInput,
  LedgerEntryUpdateInput,
  ProofLink,
  ProofLinkInput,
  ProofLinkUpdateInput
} from "@/types/accounting";
import type { Matter } from "@/types/matter";

type MatterAccountingSectionProps = {
  matter: Matter;
  periods: AccountingPeriodSummary[];
  selectedPeriod: AccountingPeriodDetail | null;
  error: string | null;
  isLoading: boolean;
  onSelectPeriod: (accountingPeriodId: string | null) => Promise<void>;
  onCreatePeriod: (input: AccountingPeriodInput) => Promise<void>;
  onUpdatePeriod: (
    accountingPeriodId: string,
    input: AccountingPeriodUpdateInput
  ) => Promise<void>;
  onFinalizePeriod: (accountingPeriodId: string) => Promise<void>;
  onCreateEntry: (input: LedgerEntryInput) => Promise<void>;
  onUpdateEntry: (entryId: string, input: LedgerEntryUpdateInput) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onCreateHeldAsset: (input: HeldAssetInput) => Promise<void>;
  onUpdateHeldAsset: (
    assetId: string,
    input: HeldAssetUpdateInput
  ) => Promise<void>;
  onDeleteHeldAsset: (assetId: string) => Promise<void>;
  onCreateProofLink: (input: ProofLinkInput) => Promise<void>;
  onUpdateProofLink: (
    proofLinkId: string,
    input: ProofLinkUpdateInput
  ) => Promise<void>;
  onDeleteProofLink: (proofLinkId: string) => Promise<void>;
};

type EditorMode = "create" | "edit";

type LedgerEditorState = {
  mode: EditorMode;
  entryId: string | null;
  draft: LedgerEntryInput;
};

type HeldAssetEditorState = {
  mode: EditorMode;
  assetId: string | null;
  draft: HeldAssetInput;
};

type ProofEditorState = {
  mode: EditorMode;
  proofLinkId: string | null;
  draft: ProofLinkInput;
};

const ENTRY_TYPES: AccountingEntryType[] = ["receipt", "disbursement", "distribution"];

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalAmount(value: string) {
  if (!value.trim()) {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Number(numericValue.toFixed(2)) : null;
}

function formatProofStatus(status: ProofLink["status"]) {
  switch (status) {
    case "pending":
      return "Pending";
    case "received":
      return "Received";
    case "not_required":
      return "Not required";
    default:
      return "Not set";
  }
}

function buildNewPeriodDraft(
  matter: Matter,
  accountType: AccountingAccountType
): AccountingPeriodInput {
  return {
    matterId: matter.id,
    accountType,
    accountingPeriodStart: null,
    accountingPeriodEnd: null,
    dateOfDeath: null,
    county: null,
    fileNumber: matter.fileNumber,
    estateType: null,
    formVersionLabel: CURRENT_ACCOUNTING_FORM_VERSION_LABEL,
    beginningPersonalPropertyValue: null,
    lossFromSaleAmount: 0,
    lossExplanation: null
  };
}

function buildPeriodDraftFromDetail(detail: AccountingPeriodDetail): AccountingPeriodInput {
  return {
    matterId: detail.period.matterId,
    accountType: detail.period.accountType,
    accountingPeriodStart: detail.period.accountingPeriodStart,
    accountingPeriodEnd: detail.period.accountingPeriodEnd,
    dateOfDeath: detail.period.dateOfDeath,
    county: detail.period.county,
    fileNumber: detail.period.fileNumber,
    estateType: detail.period.estateType,
    formVersionLabel: detail.period.formVersionLabel,
    beginningPersonalPropertyValue: detail.period.beginningPersonalPropertyValue,
    lossFromSaleAmount: detail.period.lossFromSaleAmount,
    lossExplanation: detail.period.lossExplanation
  };
}

function toPeriodUpdateInput(draft: AccountingPeriodInput): AccountingPeriodUpdateInput {
  return {
    accountType: draft.accountType,
    accountingPeriodStart: draft.accountingPeriodStart,
    accountingPeriodEnd: draft.accountingPeriodEnd,
    dateOfDeath: draft.dateOfDeath,
    county: draft.county,
    fileNumber: draft.fileNumber,
    estateType: draft.estateType,
    formVersionLabel: draft.formVersionLabel,
    beginningPersonalPropertyValue: draft.beginningPersonalPropertyValue,
    lossFromSaleAmount: draft.lossFromSaleAmount,
    lossExplanation: draft.lossExplanation
  };
}

function buildNewEntryDraft(
  accountingPeriodId: string,
  entryType: AccountingEntryType
): LedgerEntryInput {
  return {
    accountingPeriodId,
    entryType,
    entryDate: null,
    partyName: null,
    description: null,
    amount: null,
    category: null,
    notes: null
  };
}

function buildEntryDraft(entry: LedgerEntry): LedgerEntryInput {
  return {
    accountingPeriodId: entry.accountingPeriodId,
    entryType: entry.entryType,
    entryDate: entry.entryDate,
    partyName: entry.partyName,
    description: entry.description,
    amount: entry.amount,
    category: entry.category,
    notes: entry.notes
  };
}

function toEntryUpdateInput(draft: LedgerEntryInput): LedgerEntryUpdateInput {
  return {
    entryType: draft.entryType,
    entryDate: draft.entryDate,
    partyName: draft.partyName,
    description: draft.description,
    amount: draft.amount,
    category: draft.category,
    notes: draft.notes
  };
}

function buildNewHeldAssetDraft(accountingPeriodId: string): HeldAssetInput {
  return {
    accountingPeriodId,
    assetType: "bank_deposit",
    institutionOrDescription: null,
    value: null,
    notes: null
  };
}

function buildHeldAssetDraft(asset: HeldAsset): HeldAssetInput {
  return {
    accountingPeriodId: asset.accountingPeriodId,
    assetType: asset.assetType,
    institutionOrDescription: asset.institutionOrDescription,
    value: asset.value,
    notes: asset.notes
  };
}

function toHeldAssetUpdateInput(draft: HeldAssetInput): HeldAssetUpdateInput {
  return {
    assetType: draft.assetType,
    institutionOrDescription: draft.institutionOrDescription,
    value: draft.value,
    notes: draft.notes
  };
}

function buildNewProofDraft(accountingPeriodId: string): ProofLinkInput {
  return {
    accountingPeriodId,
    ledgerEntryId: null,
    label: null,
    referenceUrl: null,
    status: "pending",
    notes: null
  };
}

function buildProofDraft(proofLink: ProofLink): ProofLinkInput {
  return {
    accountingPeriodId: proofLink.accountingPeriodId,
    ledgerEntryId: proofLink.ledgerEntryId,
    label: proofLink.label,
    referenceUrl: proofLink.referenceUrl,
    status: proofLink.status,
    notes: proofLink.notes
  };
}

function toProofLinkUpdateInput(draft: ProofLinkInput): ProofLinkUpdateInput {
  return {
    ledgerEntryId: draft.ledgerEntryId,
    label: draft.label,
    referenceUrl: draft.referenceUrl,
    status: draft.status,
    notes: draft.notes
  };
}

function getIssueTone(issue: AccountingValidationIssue) {
  return issue.severity === "critical" ? "critical" : "warning";
}

function getEntryReferenceLabel(entry: LedgerEntry) {
  const party = entry.partyName?.trim();
  const description = entry.description?.trim();

  if (party && description) {
    return `${party} - ${description}`;
  }

  if (party) {
    return party;
  }

  if (description) {
    return description;
  }

  return `${getAccountingEntryTypeLabel(entry.entryType)} entry`;
}

function getProofLinkedItemLabel(
  proofLink: ProofLink,
  entriesById: Map<string, LedgerEntry>
) {
  if (!proofLink.ledgerEntryId) {
    return "Period-level proof";
  }

  const entry = entriesById.get(proofLink.ledgerEntryId);
  return entry ? getEntryReferenceLabel(entry) : "Linked entry";
}

export function MatterAccountingSection({
  matter,
  periods,
  selectedPeriod,
  error,
  isLoading,
  onSelectPeriod,
  onCreatePeriod,
  onUpdatePeriod,
  onFinalizePeriod,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onCreateHeldAsset,
  onUpdateHeldAsset,
  onDeleteHeldAsset,
  onCreateProofLink,
  onUpdateProofLink,
  onDeleteProofLink
}: MatterAccountingSectionProps) {
  const [periodMode, setPeriodMode] = useState<"selected" | "create">("selected");
  const [periodDraft, setPeriodDraft] = useState<AccountingPeriodInput | null>(null);
  const [entryEditor, setEntryEditor] = useState<LedgerEditorState | null>(null);
  const [heldAssetEditor, setHeldAssetEditor] = useState<HeldAssetEditorState | null>(null);
  const [proofEditor, setProofEditor] = useState<ProofEditorState | null>(null);

  useEffect(() => {
    if (periodMode === "create") {
      return;
    }

    if (!selectedPeriod) {
      setPeriodDraft(null);
      return;
    }

    setPeriodDraft(buildPeriodDraftFromDetail(selectedPeriod));
  }, [periodMode, selectedPeriod]);

  useEffect(() => {
    setEntryEditor(null);
    setHeldAssetEditor(null);
    setProofEditor(null);
  }, [periodMode, selectedPeriod?.period.id]);

  const selectedPeriodId = selectedPeriod?.period.id ?? null;
  const isSelectedPeriodLocked = Boolean(selectedPeriod?.period.isLocked);
  const isPeriodDraftLocked = periodMode === "selected" && isSelectedPeriodLocked;
  const formVersionInfo = getAccountingFormVersionInfo(periodDraft?.dateOfDeath);
  const entryProofCountByEntryId = useMemo(() => {
    const counts = new Map<string, number>();

    for (const proofLink of selectedPeriod?.proofLinks ?? []) {
      if (!proofLink.ledgerEntryId) {
        continue;
      }

      counts.set(proofLink.ledgerEntryId, (counts.get(proofLink.ledgerEntryId) ?? 0) + 1);
    }

    return counts;
  }, [selectedPeriod?.proofLinks]);
  const entriesById = useMemo(
    () => new Map((selectedPeriod?.entries ?? []).map((entry) => [entry.id, entry])),
    [selectedPeriod?.entries]
  );
  const entriesByType = useMemo(
    () =>
      Object.fromEntries(
        ENTRY_TYPES.map((entryType) => [
          entryType,
          (selectedPeriod?.entries ?? []).filter((entry) => entry.entryType === entryType)
        ])
      ) as Record<AccountingEntryType, LedgerEntry[]>,
    [selectedPeriod?.entries]
  );

  function handleOpenCreatePeriod(accountType: AccountingAccountType) {
    setPeriodMode("create");
    setPeriodDraft(buildNewPeriodDraft(matter, accountType));
  }

  function handleResetPeriodDraft() {
    if (periodMode === "create" || !selectedPeriod) {
      return;
    }

    setPeriodDraft(buildPeriodDraftFromDetail(selectedPeriod));
  }

  async function handleSavePeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!periodDraft) {
      return;
    }

    try {
      if (periodMode === "create") {
        await onCreatePeriod(periodDraft);
        setPeriodMode("selected");
        return;
      }

      if (!selectedPeriod) {
        return;
      }

      await onUpdatePeriod(selectedPeriod.period.id, toPeriodUpdateInput(periodDraft));
    } catch {
      return;
    }
  }

  async function handleFinalizeSelectedPeriod() {
    if (!selectedPeriod || selectedPeriod.period.isLocked) {
      return;
    }

    const confirmed = window.confirm(
      "Finalize this accounting period? Locked periods become read-only."
    );

    if (!confirmed) {
      return;
    }

    try {
      await onFinalizePeriod(selectedPeriod.period.id);
    } catch {
      return;
    }
  }

  function handlePrintSelectedPeriod() {
    if (!selectedPeriod) {
      return;
    }

    window.open(
      `/accounting/print/${encodeURIComponent(selectedPeriod.period.id)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function handleSelectPeriod(accountingPeriodId: string) {
    setPeriodMode("selected");

    try {
      await onSelectPeriod(accountingPeriodId);
    } catch {
      return;
    }
  }

  function handleOpenEntryCreate(entryType: AccountingEntryType) {
    if (!selectedPeriod || selectedPeriod.period.isLocked) {
      return;
    }

    setEntryEditor({
      mode: "create",
      entryId: null,
      draft: buildNewEntryDraft(selectedPeriod.period.id, entryType)
    });
  }

  function handleOpenEntryEdit(entry: LedgerEntry) {
    setEntryEditor({
      mode: "edit",
      entryId: entry.id,
      draft: buildEntryDraft(entry)
    });
  }

  async function handleSaveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!entryEditor) {
      return;
    }

    try {
      if (entryEditor.mode === "create") {
        await onCreateEntry(entryEditor.draft);
      } else if (entryEditor.entryId) {
        await onUpdateEntry(entryEditor.entryId, toEntryUpdateInput(entryEditor.draft));
      }

      setEntryEditor(null);
    } catch {
      return;
    }
  }

  async function handleDeleteEntry(entryId: string) {
    const confirmed = window.confirm("Delete this ledger entry?");

    if (!confirmed) {
      return;
    }

    try {
      await onDeleteEntry(entryId);
    } catch {
      return;
    }
  }

  function handleOpenHeldAssetCreate() {
    if (!selectedPeriod || selectedPeriod.period.isLocked) {
      return;
    }

    setHeldAssetEditor({
      mode: "create",
      assetId: null,
      draft: buildNewHeldAssetDraft(selectedPeriod.period.id)
    });
  }

  function handleOpenHeldAssetEdit(asset: HeldAsset) {
    setHeldAssetEditor({
      mode: "edit",
      assetId: asset.id,
      draft: buildHeldAssetDraft(asset)
    });
  }

  async function handleSaveHeldAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!heldAssetEditor) {
      return;
    }

    try {
      if (heldAssetEditor.mode === "create") {
        await onCreateHeldAsset(heldAssetEditor.draft);
      } else if (heldAssetEditor.assetId) {
        await onUpdateHeldAsset(
          heldAssetEditor.assetId,
          toHeldAssetUpdateInput(heldAssetEditor.draft)
        );
      }

      setHeldAssetEditor(null);
    } catch {
      return;
    }
  }

  async function handleDeleteHeldAsset(assetId: string) {
    const confirmed = window.confirm("Delete this held asset?");

    if (!confirmed) {
      return;
    }

    try {
      await onDeleteHeldAsset(assetId);
    } catch {
      return;
    }
  }

  function handleOpenProofCreate() {
    if (!selectedPeriod || selectedPeriod.period.isLocked) {
      return;
    }

    setProofEditor({
      mode: "create",
      proofLinkId: null,
      draft: buildNewProofDraft(selectedPeriod.period.id)
    });
  }

  function handleOpenProofEdit(proofLink: ProofLink) {
    setProofEditor({
      mode: "edit",
      proofLinkId: proofLink.id,
      draft: buildProofDraft(proofLink)
    });
  }

  async function handleSaveProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!proofEditor) {
      return;
    }

    try {
      if (proofEditor.mode === "create") {
        await onCreateProofLink(proofEditor.draft);
      } else if (proofEditor.proofLinkId) {
        await onUpdateProofLink(proofEditor.proofLinkId, toProofLinkUpdateInput(proofEditor.draft));
      }

      setProofEditor(null);
    } catch {
      return;
    }
  }

  async function handleDeleteProofLink(proofLinkId: string) {
    const confirmed = window.confirm("Delete this proof reference?");

    if (!confirmed) {
      return;
    }

    try {
      await onDeleteProofLink(proofLinkId);
    } catch {
      return;
    }
  }

  function renderEntryEditor() {
    if (!entryEditor) {
      return null;
    }

    return (
      <form className="accounting-editor" onSubmit={handleSaveEntry}>
        <div className="section-heading section-heading--split">
          <div>
            <h4>
              {entryEditor.mode === "create" ? "New" : "Edit"}{" "}
              {getAccountingEntryTypeLabel(entryEditor.draft.entryType).slice(0, -1)}
            </h4>
            <p>Capture date, payor or payee, narrative, amount, and category.</p>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setEntryEditor(null)}
            >
              Cancel
            </button>
            <button type="submit" className="button button--small">
              {entryEditor.mode === "create" ? "Add entry" : "Save entry"}
            </button>
          </div>
        </div>

        <div className="drawer-form-grid accounting-editor__grid">
          <label className="field">
            <span>Entry type</span>
            <select
              value={entryEditor.draft.entryType}
              onChange={(event) =>
                setEntryEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          entryType: event.target.value as AccountingEntryType
                        }
                      }
                    : current
                )
              }
            >
              {ENTRY_TYPES.map((entryType) => (
                <option key={entryType} value={entryType}>
                  {getAccountingEntryTypeLabel(entryType)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Entry date</span>
            <input
              type="date"
              value={entryEditor.draft.entryDate ?? ""}
              onChange={(event) =>
                setEntryEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          entryDate: event.target.value || null
                        }
                      }
                    : current
                )
              }
            />
          </label>
          <label className="field">
            <span>Party name</span>
            <input
              value={entryEditor.draft.partyName ?? ""}
              onChange={(event) =>
                setEntryEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          partyName: normalizeOptionalText(event.target.value)
                        }
                      }
                    : current
                )
              }
            />
          </label>
          <label className="field">
            <span>Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={toAmountInputValue(entryEditor.draft.amount)}
              onChange={(event) =>
                setEntryEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          amount: parseOptionalAmount(event.target.value)
                        }
                      }
                    : current
                )
              }
            />
          </label>
          <label className="field accounting-editor__field--wide">
            <span>Description</span>
            <input
              value={entryEditor.draft.description ?? ""}
              onChange={(event) =>
                setEntryEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          description: normalizeOptionalText(event.target.value)
                        }
                      }
                    : current
                )
              }
            />
          </label>
          <label className="field">
            <span>Category</span>
            <input
              list={`accounting-entry-categories-${entryEditor.draft.entryType}`}
              value={entryEditor.draft.category ?? ""}
              onChange={(event) =>
                setEntryEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          category: normalizeOptionalText(event.target.value)
                        }
                      }
                    : current
                )
              }
            />
            <datalist id={`accounting-entry-categories-${entryEditor.draft.entryType}`}>
              {ENTRY_CATEGORY_OPTIONS[entryEditor.draft.entryType].map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>
          <label className="field accounting-editor__field--wide">
            <span>Notes</span>
            <textarea
              rows={2}
              value={entryEditor.draft.notes ?? ""}
              onChange={(event) =>
                setEntryEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          notes: normalizeOptionalText(event.target.value)
                        }
                      }
                    : current
                )
              }
            />
          </label>
        </div>
      </form>
    );
  }

  function renderLedgerSection(entryType: AccountingEntryType) {
    const entries = entriesByType[entryType];
    const isEditingType = entryEditor?.draft.entryType === entryType;

    return (
      <section className="accounting-subsection">
        <div className="section-heading section-heading--split">
          <div>
            <h4>{getAccountingEntryTypeLabel(entryType)}</h4>
            <p>
              {entries.length} {entries.length === 1 ? "entry" : "entries"} in this section.
            </p>
          </div>
          {!isSelectedPeriodLocked ? (
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => handleOpenEntryCreate(entryType)}
            >
              Add {getAccountingEntryTypeLabel(entryType).slice(0, -1).toLowerCase()}
            </button>
          ) : null}
        </div>

        {isEditingType ? renderEntryEditor() : null}

        <div className="accounting-table-wrapper">
          <table className="accounting-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Party</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Proof</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="accounting-table__empty">
                    No {getAccountingEntryTypeLabel(entryType).toLowerCase()} yet.
                  </td>
                </tr>
              ) : null}

              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateOnly(entry.entryDate)}</td>
                  <td>{entry.partyName ?? "Not set"}</td>
                  <td>{entry.description ?? "Not set"}</td>
                  <td>{entry.category ?? "Not set"}</td>
                  <td>{formatCurrency(entry.amount)}</td>
                  <td>{entryProofCountByEntryId.get(entry.id) ?? 0}</td>
                  <td>
                    <div className="button-row accounting-table__actions">
                      {!isSelectedPeriodLocked ? (
                        <>
                          <button
                            type="button"
                            className="button button--ghost button--small"
                            onClick={() => handleOpenEntryEdit(entry)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="button button--ghost button--small"
                            onClick={() => void handleDeleteEntry(entry.id)}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="accounting-table__locked">Locked</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  function renderHeldAssetEditor() {
    if (!heldAssetEditor) {
      return null;
    }

    return (
      <form className="accounting-editor" onSubmit={handleSaveHeldAsset}>
        <div className="section-heading section-heading--split">
          <div>
            <h4>{heldAssetEditor.mode === "create" ? "New held asset" : "Edit held asset"}</h4>
            <p>List the assets still on hand for this accounting period.</p>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setHeldAssetEditor(null)}
            >
              Cancel
            </button>
            <button type="submit" className="button button--small">
              {heldAssetEditor.mode === "create" ? "Add held asset" : "Save held asset"}
            </button>
          </div>
        </div>

        <div className="drawer-form-grid accounting-editor__grid">
          <label className="field">
            <span>Asset type</span>
            <select
              value={heldAssetEditor.draft.assetType}
              onChange={(event) =>
                setHeldAssetEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          assetType: event.target.value as HeldAssetType
                        }
                      }
                    : current
                )
              }
            >
              {HELD_ASSET_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Value</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={toAmountInputValue(heldAssetEditor.draft.value)}
              onChange={(event) =>
                setHeldAssetEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          value: parseOptionalAmount(event.target.value)
                        }
                      }
                    : current
                )
              }
            />
          </label>
          <label className="field accounting-editor__field--wide">
            <span>Institution or description</span>
            <input
              value={heldAssetEditor.draft.institutionOrDescription ?? ""}
              onChange={(event) =>
                setHeldAssetEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          institutionOrDescription: normalizeOptionalText(event.target.value)
                        }
                      }
                    : current
                )
              }
            />
          </label>
          <label className="field accounting-editor__field--wide">
            <span>Notes</span>
            <textarea
              rows={2}
              value={heldAssetEditor.draft.notes ?? ""}
              onChange={(event) =>
                setHeldAssetEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          notes: normalizeOptionalText(event.target.value)
                        }
                      }
                    : current
                )
              }
            />
          </label>
        </div>
      </form>
    );
  }

  function renderProofEditor() {
    if (!proofEditor) {
      return null;
    }

    return (
      <form className="accounting-editor" onSubmit={handleSaveProof}>
        <div className="section-heading section-heading--split">
          <div>
            <h4>{proofEditor.mode === "create" ? "New proof reference" : "Edit proof reference"}</h4>
            <p>Track links, upload references, and proof status without building OCR.</p>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setProofEditor(null)}
            >
              Cancel
            </button>
            <button type="submit" className="button button--small">
              {proofEditor.mode === "create" ? "Add proof" : "Save proof"}
            </button>
          </div>
        </div>

        <div className="drawer-form-grid accounting-editor__grid">
          <label className="field">
            <span>Linked item</span>
            <select
              value={proofEditor.draft.ledgerEntryId ?? ""}
              onChange={(event) =>
                setProofEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          ledgerEntryId: event.target.value || null
                        }
                      }
                    : current
                )
              }
            >
              <option value="">Period-level proof</option>
              {(selectedPeriod?.entries ?? []).map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {getAccountingEntryTypeLabel(entry.entryType)}: {getEntryReferenceLabel(entry)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={proofEditor.draft.status ?? ""}
              onChange={(event) =>
                setProofEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          status: (event.target.value || null) as ProofLink["status"]
                        }
                      }
                    : current
                )
              }
            >
              <option value="">Not set</option>
              {PROOF_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Label</span>
            <input
              value={proofEditor.draft.label ?? ""}
              onChange={(event) =>
                setProofEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          label: normalizeOptionalText(event.target.value)
                        }
                      }
                    : current
                )
              }
            />
          </label>
          <label className="field">
            <span>Reference URL</span>
            <input
              value={proofEditor.draft.referenceUrl ?? ""}
              onChange={(event) =>
                setProofEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          referenceUrl: normalizeOptionalText(event.target.value)
                        }
                      }
                    : current
                )
              }
            />
          </label>
          <label className="field accounting-editor__field--wide">
            <span>Notes</span>
            <textarea
              rows={2}
              value={proofEditor.draft.notes ?? ""}
              onChange={(event) =>
                setProofEditor((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          notes: normalizeOptionalText(event.target.value)
                        }
                      }
                    : current
                )
              }
            />
          </label>
        </div>
      </form>
    );
  }

  function renderValidationSummary() {
    if (!selectedPeriod) {
      return null;
    }

    const criticalIssues = selectedPeriod.validationIssues.filter(
      (issue) => issue.severity === "critical"
    );
    const warningIssues = selectedPeriod.validationIssues.filter(
      (issue) => issue.severity === "warning"
    );

    return (
      <section className="accounting-subsection">
        <div className="section-heading section-heading--split">
          <div>
            <h4>Validation</h4>
            <p>Review missing fields, out-of-period dates, balance issues, and form warnings.</p>
          </div>
          <div className="button-row">
            <StatusPill tone={criticalIssues.length > 0 ? "warn" : "success"}>
              {criticalIssues.length} critical
            </StatusPill>
            <StatusPill tone={warningIssues.length > 0 ? "warn" : "neutral"}>
              {warningIssues.length} warnings
            </StatusPill>
          </div>
        </div>

        {selectedPeriod.validationIssues.length === 0 ? (
          <div className="accounting-validation accounting-validation--clean">
            <strong>No validation issues.</strong>
            <p>This period is internally consistent based on the current ledger and held assets.</p>
          </div>
        ) : (
          <div className="accounting-validation-list">
            {selectedPeriod.validationIssues.map((issue) => (
              <article
                key={issue.id}
                className={`accounting-validation accounting-validation--${getIssueTone(issue)}`}
              >
                <strong>{issue.severity === "critical" ? "Critical" : "Warning"}</strong>
                <p>{issue.message}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="drawer-section matter-accounting">
      <div className="section-heading section-heading--split">
        <div>
          <h3>Accounting</h3>
          <p>
            Build estate ledgers, review reconciliation, and prepare a review-ready
            AOC-E-506 worksheet.
          </p>
        </div>
        <div className="button-row">
          {isLoading ? <StatusPill tone="neutral">Refreshing</StatusPill> : null}
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => handleOpenCreatePeriod("annual")}
          >
            New annual
          </button>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => handleOpenCreatePeriod("final")}
          >
            New final
          </button>
        </div>
      </div>

      {error ? <p className="stats-empty">{error}</p> : null}

      <div className="matter-accounting__period-list" aria-label="Accounting periods">
        {periods.length === 0 && !isLoading ? (
          <EmptyState
            title="No accounting periods yet"
            message="Create the first annual or final account to start the probate ledger."
          />
        ) : null}

        {periods.map((period) => (
          <button
            key={period.id}
            type="button"
            className={
              period.id === selectedPeriodId && periodMode !== "create"
                ? "accounting-period-card accounting-period-card--active"
                : "accounting-period-card"
            }
            onClick={() => void handleSelectPeriod(period.id)}
          >
            <div className="accounting-period-card__header">
              <div>
                <span className="accounting-period-card__eyebrow">
                  {formatAccountType(period.accountType)}
                </span>
                <strong>{formatPeriodRange(period.accountingPeriodStart, period.accountingPeriodEnd)}</strong>
              </div>
              <StatusPill
                tone={
                  period.isLocked ? "success" : period.criticalIssueCount > 0 ? "warn" : "neutral"
                }
              >
                {period.isLocked ? "Finalized" : "Draft"}
              </StatusPill>
            </div>
            <div className="accounting-period-card__meta">
              <span>Ending {formatCurrency(period.totals.endingBalance)}</span>
              <span>{period.proofCount} proof links</span>
            </div>
            <div className="accounting-period-card__meta">
              <span>{period.criticalIssueCount} critical</span>
              <span>{period.warningIssueCount} warnings</span>
              <span>Updated {formatDateTime(period.updatedAt)}</span>
            </div>
          </button>
        ))}
      </div>

      {periodDraft ? (
        <form className="accounting-period-panel" onSubmit={handleSavePeriod}>
          <div className="section-heading section-heading--split">
            <div>
              <h4>
                {periodMode === "create"
                  ? `Create ${formatAccountType(periodDraft.accountType).toLowerCase()}`
                  : formatAccountType(periodDraft.accountType)}
              </h4>
              <p>
                Set the accounting window, estate metadata, and baseline amounts before
                entering the ledger.
              </p>
            </div>
            <div className="button-row">
              {periodMode !== "create" && selectedPeriod ? (
                <StatusPill
                  tone={
                    isSelectedPeriodLocked
                      ? "success"
                      : selectedPeriod.validationIssues.some((issue) => issue.severity === "critical")
                        ? "warn"
                        : "neutral"
                  }
                >
                  {isSelectedPeriodLocked ? "Locked" : "Editable"}
                </StatusPill>
              ) : null}
              {periodMode === "create" ? (
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => {
                    setPeriodMode("selected");
                    setPeriodDraft(selectedPeriod ? buildPeriodDraftFromDetail(selectedPeriod) : null);
                  }}
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={handleResetPeriodDraft}
                  disabled={isPeriodDraftLocked}
                >
                  Reset
                </button>
              )}
              {periodMode !== "create" && selectedPeriod ? (
                <button
                  type="button"
                  className="button button--secondary button--small"
                  onClick={handlePrintSelectedPeriod}
                >
                  Print worksheet
                </button>
              ) : null}
              {periodMode !== "create" && selectedPeriod && !isSelectedPeriodLocked ? (
                <button
                  type="button"
                  className="button button--secondary button--small"
                  onClick={() => void handleFinalizeSelectedPeriod()}
                >
                  Finalize
                </button>
              ) : null}
              <button
                type="submit"
                className="button button--small"
                disabled={isPeriodDraftLocked}
              >
                {periodMode === "create" ? "Create account" : "Save period"}
              </button>
            </div>
          </div>

          <div className="drawer-form-grid accounting-period-panel__grid">
            <label className="field">
              <span>Account type</span>
              <select
                value={periodDraft.accountType}
                disabled={isPeriodDraftLocked}
                onChange={(event) =>
                  setPeriodDraft((current) =>
                    current
                      ? {
                          ...current,
                          accountType: event.target.value as AccountingAccountType
                        }
                      : current
                  )
                }
              >
                <option value="annual">Annual account</option>
                <option value="final">Final account</option>
              </select>
            </label>
            <label className="field">
              <span>Estate type</span>
              <select
                value={periodDraft.estateType ?? ""}
                disabled={isPeriodDraftLocked}
                onChange={(event) =>
                  setPeriodDraft((current) =>
                    current
                      ? {
                          ...current,
                          estateType: (event.target.value || null) as AccountingPeriodInput["estateType"]
                        }
                      : current
                  )
                }
              >
                <option value="">Select estate type</option>
                {ESTATE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Accounting period start</span>
              <input
                type="date"
                value={periodDraft.accountingPeriodStart ?? ""}
                disabled={isPeriodDraftLocked}
                onChange={(event) =>
                  setPeriodDraft((current) =>
                    current
                      ? {
                          ...current,
                          accountingPeriodStart: event.target.value || null
                        }
                      : current
                  )
                }
              />
            </label>
            <label className="field">
              <span>Accounting period end</span>
              <input
                type="date"
                value={periodDraft.accountingPeriodEnd ?? ""}
                disabled={isPeriodDraftLocked}
                onChange={(event) =>
                  setPeriodDraft((current) =>
                    current
                      ? {
                          ...current,
                          accountingPeriodEnd: event.target.value || null
                        }
                      : current
                  )
                }
              />
            </label>
            <label className="field">
              <span>Date of death</span>
              <input
                type="date"
                value={periodDraft.dateOfDeath ?? ""}
                disabled={isPeriodDraftLocked}
                onChange={(event) =>
                  setPeriodDraft((current) =>
                    current
                      ? {
                          ...current,
                          dateOfDeath: event.target.value || null
                        }
                      : current
                  )
                }
              />
            </label>
            <label className="field">
              <span>County</span>
              <input
                value={periodDraft.county ?? ""}
                disabled={isPeriodDraftLocked}
                onChange={(event) =>
                  setPeriodDraft((current) =>
                    current
                      ? {
                          ...current,
                          county: normalizeOptionalText(event.target.value)
                        }
                      : current
                  )
                }
              />
            </label>
            <label className="field">
              <span>File number</span>
              <input
                value={periodDraft.fileNumber ?? ""}
                disabled={isPeriodDraftLocked}
                onChange={(event) =>
                  setPeriodDraft((current) =>
                    current
                      ? {
                          ...current,
                          fileNumber: normalizeOptionalText(event.target.value)
                        }
                      : current
                  )
                }
              />
            </label>
            <label className="field">
              <span>Form version</span>
              <input
                value={periodDraft.formVersionLabel ?? CURRENT_ACCOUNTING_FORM_VERSION_LABEL}
                disabled={isPeriodDraftLocked}
                onChange={(event) =>
                  setPeriodDraft((current) =>
                    current
                      ? {
                          ...current,
                          formVersionLabel: normalizeOptionalText(event.target.value)
                        }
                      : current
                  )
                }
              />
            </label>
            <label className="field">
              <span>Beginning personal property value</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={toAmountInputValue(periodDraft.beginningPersonalPropertyValue)}
                disabled={isPeriodDraftLocked}
                onChange={(event) =>
                  setPeriodDraft((current) =>
                    current
                      ? {
                          ...current,
                          beginningPersonalPropertyValue: parseOptionalAmount(event.target.value)
                        }
                      : current
                  )
                }
              />
            </label>
            <label className="field">
              <span>Loss from sale amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={toAmountInputValue(periodDraft.lossFromSaleAmount)}
                disabled={isPeriodDraftLocked}
                onChange={(event) =>
                  setPeriodDraft((current) =>
                    current
                      ? {
                          ...current,
                          lossFromSaleAmount: parseOptionalAmount(event.target.value)
                        }
                      : current
                  )
                }
              />
            </label>
            <label className="field accounting-period-panel__field--wide">
              <span>Loss explanation</span>
              <textarea
                rows={2}
                value={periodDraft.lossExplanation ?? ""}
                disabled={isPeriodDraftLocked}
                onChange={(event) =>
                  setPeriodDraft((current) =>
                    current
                      ? {
                          ...current,
                          lossExplanation: normalizeOptionalText(event.target.value)
                        }
                      : current
                  )
                }
              />
            </label>
          </div>

          {formVersionInfo.warning ? (
            <div className="accounting-validation accounting-validation--warning">
              <strong>Form version warning</strong>
              <p>{formVersionInfo.warning}</p>
            </div>
          ) : null}
        </form>
      ) : null}

      {selectedPeriod && periodMode !== "create" ? (
        <>
          <div className="matter-accounting__summary-strip" aria-label="Accounting totals">
            <article className="matter-accounting__summary-card">
              <span>Beginning balance</span>
              <strong>{formatCurrency(selectedPeriod.totals.beginningBalance)}</strong>
              <small>Opening personal property value.</small>
            </article>
            <article className="matter-accounting__summary-card">
              <span>Receipts</span>
              <strong>{formatCurrency(selectedPeriod.totals.totalReceipts)}</strong>
              <small>Total receipts during the period.</small>
            </article>
            <article className="matter-accounting__summary-card">
              <span>Disbursements</span>
              <strong>{formatCurrency(selectedPeriod.totals.totalDisbursements)}</strong>
              <small>Expenses and payments made by the estate.</small>
            </article>
            <article className="matter-accounting__summary-card">
              <span>Distributions</span>
              <strong>{formatCurrency(selectedPeriod.totals.totalDistributions)}</strong>
              <small>Transfers made to beneficiaries or distributees.</small>
            </article>
            <article className="matter-accounting__summary-card">
              <span>Ending balance</span>
              <strong>{formatCurrency(selectedPeriod.totals.endingBalance)}</strong>
              <small>Balance remaining after all activity.</small>
            </article>
            <article className="matter-accounting__summary-card">
              <span>Held assets</span>
              <strong>{formatCurrency(selectedPeriod.totals.totalHeldAssets)}</strong>
              <small>
                Reconciliation delta {formatCurrency(selectedPeriod.totals.reconciliationDelta)}.
              </small>
            </article>
          </div>

          <section className="accounting-subsection">
            <div className="section-heading">
              <h4>Review math</h4>
              <p>Use the internal worksheet math below before printing the court-facing output.</p>
            </div>
            <dl className="accounting-review-grid">
              <div>
                <dt>Beginning personal property value</dt>
                <dd>{formatCurrency(selectedPeriod.totals.beginningBalance)}</dd>
              </div>
              <div>
                <dt>Less loss from sale</dt>
                <dd>{formatCurrency(selectedPeriod.totals.lossFromSaleAmount)}</dd>
              </div>
              <div>
                <dt>Subtotal after loss</dt>
                <dd>{formatCurrency(selectedPeriod.totals.subtotalAfterLoss)}</dd>
              </div>
              <div>
                <dt>Plus receipts</dt>
                <dd>{formatCurrency(selectedPeriod.totals.totalReceipts)}</dd>
              </div>
              <div>
                <dt>Total assets</dt>
                <dd>{formatCurrency(selectedPeriod.totals.totalAssets)}</dd>
              </div>
              <div>
                <dt>Less disbursements</dt>
                <dd>{formatCurrency(selectedPeriod.totals.totalDisbursements)}</dd>
              </div>
              <div>
                <dt>Subtotal before distributions</dt>
                <dd>{formatCurrency(selectedPeriod.totals.subtotalBeforeDistributions)}</dd>
              </div>
              <div>
                <dt>Less distributions</dt>
                <dd>{formatCurrency(selectedPeriod.totals.totalDistributions)}</dd>
              </div>
              <div>
                <dt>Ending balance</dt>
                <dd>{formatCurrency(selectedPeriod.totals.endingBalance)}</dd>
              </div>
              <div>
                <dt>Held assets total</dt>
                <dd>{formatCurrency(selectedPeriod.totals.totalHeldAssets)}</dd>
              </div>
              <div>
                <dt>Reconciliation delta</dt>
                <dd>{formatCurrency(selectedPeriod.totals.reconciliationDelta)}</dd>
              </div>
              <div>
                <dt>Proof links</dt>
                <dd>{selectedPeriod.proofLinks.length}</dd>
              </div>
            </dl>
          </section>

          {renderValidationSummary()}

          {renderLedgerSection("receipt")}
          {renderLedgerSection("disbursement")}
          {renderLedgerSection("distribution")}

          <section className="accounting-subsection">
            <div className="section-heading section-heading--split">
              <div>
                <h4>Assets remaining on hand</h4>
                <p>
                  Detail the balance held or invested at the close of the accounting period.
                </p>
              </div>
              {!isSelectedPeriodLocked ? (
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={handleOpenHeldAssetCreate}
                >
                  Add held asset
                </button>
              ) : null}
            </div>

            {renderHeldAssetEditor()}

            <div className="accounting-table-wrapper">
              <table className="accounting-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Value</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPeriod.heldAssets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="accounting-table__empty">
                        No held-asset detail yet.
                      </td>
                    </tr>
                  ) : null}

                  {selectedPeriod.heldAssets.map((asset) => (
                    <tr key={asset.id}>
                      <td>{getHeldAssetTypeLabel(asset.assetType)}</td>
                      <td>{asset.institutionOrDescription ?? "Not set"}</td>
                      <td>{formatCurrency(asset.value)}</td>
                      <td>{asset.notes ?? "Not set"}</td>
                      <td>
                        <div className="button-row accounting-table__actions">
                          {!isSelectedPeriodLocked ? (
                            <>
                              <button
                                type="button"
                                className="button button--ghost button--small"
                                onClick={() => handleOpenHeldAssetEdit(asset)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="button button--ghost button--small"
                                onClick={() => void handleDeleteHeldAsset(asset.id)}
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="accounting-table__locked">Locked</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="accounting-subsection">
            <div className="section-heading section-heading--split">
              <div>
                <h4>Proof tracking</h4>
                <p>Reference period-level support or link support to individual ledger entries.</p>
              </div>
              {!isSelectedPeriodLocked ? (
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={handleOpenProofCreate}
                >
                  Add proof
                </button>
              ) : null}
            </div>

            {renderProofEditor()}

            <div className="accounting-table-wrapper">
              <table className="accounting-table">
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Status</th>
                    <th>Linked item</th>
                    <th>Reference</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPeriod.proofLinks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="accounting-table__empty">
                        No proof references yet.
                      </td>
                    </tr>
                  ) : null}

                  {selectedPeriod.proofLinks.map((proofLink) => (
                    <tr key={proofLink.id}>
                      <td>{proofLink.label ?? "Not set"}</td>
                      <td>{formatProofStatus(proofLink.status)}</td>
                      <td>{getProofLinkedItemLabel(proofLink, entriesById)}</td>
                      <td>
                        {proofLink.referenceUrl ? (
                          <a href={proofLink.referenceUrl} target="_blank" rel="noreferrer">
                            Open link
                          </a>
                        ) : (
                          "Not set"
                        )}
                      </td>
                      <td>{proofLink.notes ?? "Not set"}</td>
                      <td>
                        <div className="button-row accounting-table__actions">
                          {!isSelectedPeriodLocked ? (
                            <>
                              <button
                                type="button"
                                className="button button--ghost button--small"
                                onClick={() => handleOpenProofEdit(proofLink)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="button button--ghost button--small"
                                onClick={() => void handleDeleteProofLink(proofLink.id)}
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="accounting-table__locked">Locked</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : isLoading && periodMode !== "create" ? (
        <div className="accounting-loading-panel">Loading accounting detail...</div>
      ) : periods.length > 0 && periodMode !== "create" ? (
        <EmptyState
          title="Select an accounting period"
          message="Choose a period above to review totals, validation issues, and the ledger."
        />
      ) : null}
    </section>
  );
}
