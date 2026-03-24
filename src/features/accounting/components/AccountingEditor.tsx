import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PROBATE_ACCOUNTING_ASSET_TYPE_LABELS,
  PROBATE_ACCOUNTING_STATUS_LABELS,
  PROBATE_ACCOUNTING_TYPE_LABELS,
  createEmptyProbateAccountingAsset,
  createEmptyProbateAccountingEntry,
  formatCentsForInput,
  formatCurrencyFromCents,
  parseCurrencyInputToCents,
  summarizeProbateAccounting
} from "@/lib/accounting";
import { formatDateTime } from "@/lib/dates";
import {
  deleteProbateAccounting,
  saveProbateAccounting
} from "@/services/accountings";
import type {
  ProbateAccountingAssetRow,
  ProbateAccountingDetail,
  ProbateAccountingInput,
  ProbateAccountingLedgerEntry,
  ProbateAccountingStatus
} from "@/types/accounting";

type AccountingEditorProps = {
  accounting: ProbateAccountingDetail;
  onSaved: (accounting: ProbateAccountingDetail) => void;
};

function buildInput(accounting: ProbateAccountingDetail): ProbateAccountingInput {
  return {
    matterId: accounting.matterId,
    accountType: accounting.accountType,
    status: accounting.status,
    county: accounting.county,
    fileNumber: accounting.fileNumber,
    decedentName: accounting.decedentName,
    fiduciaryName: accounting.fiduciaryName,
    fiduciaryAddress: accounting.fiduciaryAddress,
    coFiduciaryName: accounting.coFiduciaryName,
    coFiduciaryAddress: accounting.coFiduciaryAddress,
    dateOfDeath: accounting.dateOfDeath,
    periodStart: accounting.periodStart,
    periodEnd: accounting.periodEnd,
    openingPersonalPropertyCents: accounting.openingPersonalPropertyCents,
    lossFromSaleCents: accounting.lossFromSaleCents,
    lossExplanation: accounting.lossExplanation,
    entries: accounting.entries.map((entry) => ({ ...entry })),
    assets: accounting.assets.map((asset) => ({ ...asset }))
  };
}

export function AccountingEditor({ accounting, onSaved }: AccountingEditorProps) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProbateAccountingInput>(() => buildInput(accounting));
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "neutral" | "success" | "warn";
    message: string;
  }>({
    tone: "neutral",
    message: "Save a draft as you work, then mark it review ready when all issues are cleared."
  });
  const computed = useMemo(() => summarizeProbateAccounting(draft), [draft]);

  useEffect(() => {
    setDraft(buildInput(accounting));
    setFeedback({
      tone: "neutral",
      message: "Save a draft as you work, then mark it review ready when all issues are cleared."
    });
  }, [accounting.id, accounting.updatedAt]);

  function setField<K extends keyof ProbateAccountingInput>(
    key: K,
    value: ProbateAccountingInput[K]
  ) {
    setDraft((current) => {
      if (key === "accountType" && value === "final") {
        return {
          ...current,
          [key]: value,
          assets: []
        };
      }

      return {
        ...current,
        [key]: value
      };
    });
  }

  function updateEntry(
    entryId: string,
    updater: (entry: ProbateAccountingLedgerEntry) => ProbateAccountingLedgerEntry
  ) {
    setDraft((current) => ({
      ...current,
      entries: current.entries.map((entry) => (entry.id === entryId ? updater(entry) : entry))
    }));
  }

  function updateAsset(
    assetId: string,
    updater: (asset: ProbateAccountingAssetRow) => ProbateAccountingAssetRow
  ) {
    setDraft((current) => ({
      ...current,
      assets: current.assets.map((asset) => (asset.id === assetId ? updater(asset) : asset))
    }));
  }

  function handleMatterChange(value: string) {
    const matterId = value || null;
    const selectedMatter = accounting.matterOptions.find((option) => option.id === matterId) ?? null;

    setDraft((current) => ({
      ...current,
      matterId,
      decedentName: selectedMatter ? selectedMatter.decedentName : current.decedentName,
      fileNumber: selectedMatter ? selectedMatter.fileNumber : current.fileNumber,
      fiduciaryName: selectedMatter ? selectedMatter.clientName : current.fiduciaryName
    }));
  }

  async function persist(nextStatus: ProbateAccountingStatus) {
    setIsSaving(true);
    setFeedback({
      tone: "neutral",
      message: nextStatus === "review_ready" ? "Marking accounting review ready..." : "Saving draft..."
    });

    try {
      const saved = await saveProbateAccounting(accounting.id, {
        ...draft,
        status: nextStatus
      });
      onSaved(saved);
      setFeedback({
        tone: "success",
        message:
          saved.status === "review_ready"
            ? "Accounting marked review ready."
            : "Draft saved successfully."
      });
    } catch (error) {
      setFeedback({
        tone: "warn",
        message: error instanceof Error ? error.message : "Unable to save accounting."
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete the draft accounting for ${draft.decedentName || "this estate"}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);

    try {
      await deleteProbateAccounting(accounting.id);
      navigate("/accounting");
    } catch (error) {
      setFeedback({
        tone: "warn",
        message: error instanceof Error ? error.message : "Unable to delete accounting."
      });
      setIsSaving(false);
    }
  }

  return (
    <div className="accounting-editor">
      <section className="panel">
        <div className="section-heading section-heading--split">
          <div>
            <h1>{draft.decedentName || PROBATE_ACCOUNTING_TYPE_LABELS[draft.accountType]}</h1>
            <p>
              Keep the ledger and summary in sync, then generate a print-ready AOC-E-506 review
              worksheet.
            </p>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="button button--ghost"
              onClick={() => navigate("/accounting")}
            >
              Back to Hub
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => window.open(`/accounting/${accounting.id}/print`, "_blank", "noopener")}
            >
              Print Worksheet
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => void persist("draft")}
              disabled={isSaving}
            >
              Save Draft
            </button>
            <button
              type="button"
              className="button"
              onClick={() => void persist("review_ready")}
              disabled={isSaving || !computed.isReviewReady}
            >
              Mark Review Ready
            </button>
          </div>
        </div>
        <div className="accounting-editor__summary-strip">
          <div>
            <span>Status</span>
            <strong className={`accounting-status accounting-status--${draft.status}`}>
              {PROBATE_ACCOUNTING_STATUS_LABELS[draft.status]}
            </strong>
          </div>
          <div>
            <span>Type</span>
            <strong>{PROBATE_ACCOUNTING_TYPE_LABELS[draft.accountType]}</strong>
          </div>
          <div>
            <span>Line 9 Balance</span>
            <strong>{formatCurrencyFromCents(computed.totals.line9BalanceCents)}</strong>
          </div>
          <div>
            <span>Last Saved</span>
            <strong>{formatDateTime(accounting.updatedAt)}</strong>
          </div>
        </div>
        <p className={`accounting-feedback accounting-feedback--${feedback.tone}`}>{feedback.message}</p>
      </section>

      <div className="accounting-editor__layout">
        <div className="accounting-editor__main">
          <section className="panel">
            <div className="section-heading">
              <h2>Estate Header</h2>
              <p>Optional matter linking is for prefill only and does not alter board workflow.</p>
            </div>
            <div className="accounting-form-grid">
              <label className="field">
                <span>Linked Matter</span>
                <select
                  value={draft.matterId ?? ""}
                  onChange={(event) => handleMatterChange(event.target.value)}
                >
                  <option value="">No linked matter</option>
                  {accounting.matterOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Account Type</span>
                <select
                  value={draft.accountType}
                  onChange={(event) => setField("accountType", event.target.value as "annual" | "final")}
                >
                  <option value="annual">Annual Account</option>
                  <option value="final">Final Account</option>
                </select>
              </label>
              <label className="field">
                <span>County</span>
                <input
                  value={draft.county}
                  onChange={(event) => setField("county", event.target.value)}
                  placeholder="Wake"
                />
              </label>
              <label className="field">
                <span>File Number</span>
                <input
                  value={draft.fileNumber}
                  onChange={(event) => setField("fileNumber", event.target.value)}
                  placeholder="PR-2026-0021"
                />
              </label>
              <label className="field accounting-form-grid__wide">
                <span>Decedent Name</span>
                <input
                  value={draft.decedentName}
                  onChange={(event) => setField("decedentName", event.target.value)}
                  placeholder="Lucille Carver"
                />
              </label>
              <label className="field">
                <span>Fiduciary Name</span>
                <input
                  value={draft.fiduciaryName}
                  onChange={(event) => setField("fiduciaryName", event.target.value)}
                  placeholder="Daniel Carver"
                />
              </label>
              <label className="field">
                <span>Date Of Death</span>
                <input
                  type="date"
                  value={draft.dateOfDeath ?? ""}
                  onChange={(event) => setField("dateOfDeath", event.target.value || null)}
                />
              </label>
              <label className="field accounting-form-grid__wide">
                <span>Fiduciary Address</span>
                <textarea
                  value={draft.fiduciaryAddress}
                  onChange={(event) => setField("fiduciaryAddress", event.target.value)}
                  rows={3}
                  placeholder="Street, city, state, ZIP"
                />
              </label>
              <label className="field">
                <span>Co-Fiduciary Name</span>
                <input
                  value={draft.coFiduciaryName}
                  onChange={(event) => setField("coFiduciaryName", event.target.value)}
                />
              </label>
              <label className="field accounting-form-grid__wide">
                <span>Co-Fiduciary Address</span>
                <textarea
                  value={draft.coFiduciaryAddress}
                  onChange={(event) => setField("coFiduciaryAddress", event.target.value)}
                  rows={3}
                />
              </label>
              <label className="field">
                <span>Period Start</span>
                <input
                  type="date"
                  value={draft.periodStart ?? ""}
                  onChange={(event) => setField("periodStart", event.target.value || null)}
                />
              </label>
              <label className="field">
                <span>Period End</span>
                <input
                  type="date"
                  value={draft.periodEnd ?? ""}
                  onChange={(event) => setField("periodEnd", event.target.value || null)}
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="section-heading">
              <h2>Part I Inputs</h2>
              <p>Header-level values that roll into the AOC-E-506 line progression.</p>
            </div>
            <div className="accounting-form-grid">
              <label className="field">
                <span>Opening Personal Property</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formatCentsForInput(draft.openingPersonalPropertyCents)}
                  onChange={(event) =>
                    setField(
                      "openingPersonalPropertyCents",
                      parseCurrencyInputToCents(event.target.value)
                    )
                  }
                />
              </label>
              <label className="field">
                <span>Loss From Sale</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formatCentsForInput(draft.lossFromSaleCents)}
                  onChange={(event) =>
                    setField("lossFromSaleCents", parseCurrencyInputToCents(event.target.value))
                  }
                />
              </label>
              <label className="field accounting-form-grid__wide">
                <span>Loss Explanation</span>
                <textarea
                  value={draft.lossExplanation}
                  onChange={(event) => setField("lossExplanation", event.target.value)}
                  rows={2}
                  placeholder="Explain any sale loss reported on Part I, line 2."
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="section-heading section-heading--split">
              <div>
                <h2>Unified Ledger</h2>
                <p>Receipts, disbursements, and distributions all live in one ordered ledger.</p>
              </div>
              <div className="button-row">
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      entries: [
                        ...current.entries,
                        createEmptyProbateAccountingEntry("receipt", current.entries.length + 1)
                      ]
                    }))
                  }
                >
                  Add Receipt
                </button>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      entries: [
                        ...current.entries,
                        createEmptyProbateAccountingEntry(
                          "disbursement",
                          current.entries.length + 1
                        )
                      ]
                    }))
                  }
                >
                  Add Disbursement
                </button>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      entries: [
                        ...current.entries,
                        createEmptyProbateAccountingEntry(
                          "distribution",
                          current.entries.length + 1
                        )
                      ]
                    }))
                  }
                >
                  Add Distribution
                </button>
              </div>
            </div>
            {draft.entries.length ? (
              <div className="accounting-ledger">
                {draft.entries.map((entry) => (
                  <div key={entry.id} className="accounting-ledger__row">
                    <label className="field">
                      <span>Type</span>
                      <select
                        value={entry.entryType}
                        onChange={(event) =>
                          updateEntry(entry.id, (current) => ({
                            ...current,
                            entryType: event.target.value as ProbateAccountingLedgerEntry["entryType"]
                          }))
                        }
                      >
                        <option value="receipt">Receipt</option>
                        <option value="disbursement">Disbursement</option>
                        <option value="distribution">Distribution</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Date</span>
                      <input
                        type="date"
                        value={entry.entryDate ?? ""}
                        onChange={(event) =>
                          updateEntry(entry.id, (current) => ({
                            ...current,
                            entryDate: event.target.value || null
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Party</span>
                      <input
                        value={entry.partyName}
                        onChange={(event) =>
                          updateEntry(entry.id, (current) => ({
                            ...current,
                            partyName: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label className="field accounting-ledger__wide">
                      <span>Description</span>
                      <input
                        value={entry.description}
                        onChange={(event) =>
                          updateEntry(entry.id, (current) => ({
                            ...current,
                            description: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Amount</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formatCentsForInput(entry.amountCents)}
                        onChange={(event) =>
                          updateEntry(entry.id, (current) => ({
                            ...current,
                            amountCents: parseCurrencyInputToCents(event.target.value)
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Proof Reference</span>
                      <input
                        value={entry.proofReference}
                        onChange={(event) =>
                          updateEntry(entry.id, (current) => ({
                            ...current,
                            proofReference: event.target.value
                          }))
                        }
                        placeholder={
                          entry.entryType === "receipt" ? "Optional" : "Check, receipt, or statement ref"
                        }
                      />
                    </label>
                    <div className="accounting-ledger__actions">
                      <button
                        type="button"
                        className="button button--ghost button--small"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            entries: current.entries.filter((item) => item.id !== entry.id)
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="accounting-empty-inline">No ledger rows added yet.</p>
            )}
          </section>

          {draft.accountType === "annual" ? (
            <section className="panel">
              <div className="section-heading section-heading--split">
                <div>
                  <h2>Part II Balance Held Or Invested</h2>
                  <p>Use descriptive labels only. Do not store account numbers here.</p>
                </div>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      assets: [
                        ...current.assets,
                        createEmptyProbateAccountingAsset(current.assets.length + 1)
                      ]
                    }))
                  }
                >
                  Add Balance Row
                </button>
              </div>
              {draft.assets.length ? (
                <div className="accounting-ledger">
                  {draft.assets.map((asset) => (
                    <div key={asset.id} className="accounting-ledger__row">
                      <label className="field">
                        <span>Category</span>
                        <select
                          value={asset.assetType}
                          onChange={(event) =>
                            updateAsset(asset.id, (current) => ({
                              ...current,
                              assetType: event.target.value as ProbateAccountingAssetRow["assetType"]
                            }))
                          }
                        >
                          {Object.entries(PROBATE_ACCOUNTING_ASSET_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field accounting-ledger__wide">
                        <span>Description</span>
                        <input
                          value={asset.description}
                          onChange={(event) =>
                            updateAsset(asset.id, (current) => ({
                              ...current,
                              description: event.target.value
                            }))
                          }
                          placeholder="Bank name or descriptive asset label"
                        />
                      </label>
                      <label className="field">
                        <span>Balance</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formatCentsForInput(asset.amountCents)}
                          onChange={(event) =>
                            updateAsset(asset.id, (current) => ({
                              ...current,
                              amountCents: parseCurrencyInputToCents(event.target.value)
                            }))
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Proof Reference</span>
                        <input
                          value={asset.proofReference}
                          onChange={(event) =>
                            updateAsset(asset.id, (current) => ({
                              ...current,
                              proofReference: event.target.value
                            }))
                          }
                        />
                      </label>
                      <div className="accounting-ledger__actions">
                        <button
                          type="button"
                          className="button button--ghost button--small"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              assets: current.assets.filter((item) => item.id !== asset.id)
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="accounting-empty-inline">No Part II rows added yet.</p>
              )}
            </section>
          ) : (
            <section className="panel">
              <div className="section-heading">
                <h2>Part II Balance Held Or Invested</h2>
                <p>Final accounts do not use Part II and must end with a zero line 9 balance.</p>
              </div>
            </section>
          )}

          {draft.status === "draft" ? (
            <section className="panel accounting-editor__danger-zone">
              <div className="section-heading section-heading--split">
                <div>
                  <h2>Draft Actions</h2>
                  <p>Draft accountings can be deleted if they are no longer needed.</p>
                </div>
                <button
                  type="button"
                  className="button button--danger"
                  onClick={() => void handleDelete()}
                  disabled={isSaving}
                >
                  Delete Draft
                </button>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="accounting-editor__sidebar">
          <section className="panel">
            <div className="section-heading">
              <h2>Live Totals</h2>
              <p>These values flow directly into the worksheet output.</p>
            </div>
            <div className="accounting-totals-list">
              <div>
                <span>Line 3</span>
                <strong>{formatCurrencyFromCents(computed.totals.line3SubtotalCents)}</strong>
              </div>
              <div>
                <span>Line 5</span>
                <strong>{formatCurrencyFromCents(computed.totals.line5SubtotalCents)}</strong>
              </div>
              <div>
                <span>Line 7</span>
                <strong>{formatCurrencyFromCents(computed.totals.line7SubtotalCents)}</strong>
              </div>
              <div>
                <span>Line 9</span>
                <strong>{formatCurrencyFromCents(computed.totals.line9BalanceCents)}</strong>
              </div>
              {draft.accountType === "annual" ? (
                <div>
                  <span>Part II Total</span>
                  <strong>{formatCurrencyFromCents(computed.totals.partIiTotalCents)}</strong>
                </div>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <div className="section-heading">
              <h2>Review Checklist</h2>
              <p>
                {computed.isReviewReady
                  ? "All review blockers are cleared."
                  : `${computed.readinessIssues.length} issue(s) still need attention.`}
              </p>
            </div>
            {computed.readinessIssues.length ? (
              <ul className="accounting-issues-list">
                {computed.readinessIssues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`}>{issue.message}</li>
                ))}
              </ul>
            ) : (
              <p className="accounting-checklist-success">
                This accounting is ready to be marked review ready.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
