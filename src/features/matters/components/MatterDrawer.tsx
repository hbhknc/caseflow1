import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Drawer } from "@/components/Drawer";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { MatterAccountingSection } from "@/features/accounting/components/MatterAccountingSection";
import { MatterDeadlinesSection } from "@/features/deadlines/components/MatterDeadlinesSection";
import { NotesTimeline } from "@/features/notes/components/NotesTimeline";
import { formatDateTime } from "@/lib/dates";
import { ARCHIVE_READY_STAGE, STAGES, createStageLabelMap, getStageLabel } from "@/utils/stages";
import type {
  AccountingPeriodDetail,
  AccountingPeriodInput,
  AccountingPeriodSummary,
  AccountingPeriodUpdateInput,
  HeldAssetInput,
  HeldAssetUpdateInput,
  LedgerEntryInput,
  LedgerEntryUpdateInput,
  ProofLinkInput,
  ProofLinkUpdateInput
} from "@/types/accounting";
import type {
  Deadline,
  DeadlineInput,
  MatterAnchorAlert,
  DeadlineUpdateInput,
  MatterDeadlineSettings,
  MatterDeadlineSettingsInput
} from "@/types/deadlines";
import type { Matter, MatterFormInput, MatterNote, MatterStage } from "@/types/matter";

type MatterDrawerProps = {
  matter: Matter | null;
  notes: MatterNote[];
  accountingPeriods: AccountingPeriodSummary[];
  accountingPeriod: AccountingPeriodDetail | null;
  deadlines: Deadline[];
  deadlineSettings: MatterDeadlineSettings | null;
  deadlineAnchorIssues: MatterAnchorAlert[];
  accountingError: string | null;
  isAccountingLoading: boolean;
  deadlineError: string | null;
  isCreateMode: boolean;
  defaultBoardId?: string;
  stageLabels?: Partial<Record<MatterStage, string>>;
  onClose: () => void;
  onCreateMatter: (input: MatterFormInput) => Promise<void>;
  onUpdateMatter: (matterId: string, input: MatterFormInput) => Promise<Matter>;
  onDeleteMatter: (matterId: string) => Promise<void>;
  onArchiveMatter: (matterId: string) => Promise<void>;
  onAddNote: (matterId: string, body: string, addToTaskList: boolean) => Promise<void>;
  onSelectAccountingPeriod: (accountingPeriodId: string | null) => Promise<void>;
  onCreateAccountingPeriod: (input: AccountingPeriodInput) => Promise<void>;
  onUpdateAccountingPeriod: (
    accountingPeriodId: string,
    input: AccountingPeriodUpdateInput
  ) => Promise<void>;
  onFinalizeAccountingPeriod: (accountingPeriodId: string) => Promise<void>;
  onCreateAccountingEntry: (input: LedgerEntryInput) => Promise<void>;
  onUpdateAccountingEntry: (
    entryId: string,
    input: LedgerEntryUpdateInput
  ) => Promise<void>;
  onDeleteAccountingEntry: (entryId: string) => Promise<void>;
  onCreateAccountingHeldAsset: (input: HeldAssetInput) => Promise<void>;
  onUpdateAccountingHeldAsset: (
    assetId: string,
    input: HeldAssetUpdateInput
  ) => Promise<void>;
  onDeleteAccountingHeldAsset: (assetId: string) => Promise<void>;
  onCreateAccountingProofLink: (input: ProofLinkInput) => Promise<void>;
  onUpdateAccountingProofLink: (
    proofLinkId: string,
    input: ProofLinkUpdateInput
  ) => Promise<void>;
  onDeleteAccountingProofLink: (proofLinkId: string) => Promise<void>;
  onSaveDeadlineSettings: (
    matterId: string,
    input: MatterDeadlineSettingsInput
  ) => Promise<void>;
  onCreateDeadline: (input: DeadlineInput) => Promise<void>;
  onUpdateDeadline: (deadlineId: string, input: DeadlineUpdateInput) => Promise<void>;
  onCompleteDeadline: (deadlineId: string, completionNote: string) => Promise<void>;
  onDismissDeadline: (deadlineId: string) => Promise<void>;
};

const AUTO_SAVE_DELAY_MS = 500;

function buildInitialState(matter: Matter | null, defaultBoardId: string): MatterFormInput {
  if (!matter) {
    return {
      boardId: defaultBoardId,
      decedentName: "",
      clientName: "",
      fileNumber: "",
      stage: "intake"
    };
  }

  return {
    boardId: matter.boardId,
    decedentName: matter.decedentName,
    clientName: matter.clientName,
    fileNumber: matter.fileNumber,
    stage: matter.stage
  };
}

function serializeMatterInput(input: MatterFormInput): string {
  return JSON.stringify(input);
}

function isMatterInputComplete(input: MatterFormInput): boolean {
  return Boolean(
    input.decedentName.trim() && input.clientName.trim() && input.fileNumber.trim()
  );
}

export function MatterDrawer({
  matter,
  notes,
  accountingPeriods,
  accountingPeriod,
  deadlines,
  deadlineSettings,
  deadlineAnchorIssues,
  accountingError,
  isAccountingLoading,
  deadlineError,
  isCreateMode,
  defaultBoardId = "probate",
  stageLabels,
  onClose,
  onCreateMatter,
  onUpdateMatter,
  onDeleteMatter,
  onArchiveMatter,
  onAddNote,
  onSelectAccountingPeriod,
  onCreateAccountingPeriod,
  onUpdateAccountingPeriod,
  onFinalizeAccountingPeriod,
  onCreateAccountingEntry,
  onUpdateAccountingEntry,
  onDeleteAccountingEntry,
  onCreateAccountingHeldAsset,
  onUpdateAccountingHeldAsset,
  onDeleteAccountingHeldAsset,
  onCreateAccountingProofLink,
  onUpdateAccountingProofLink,
  onDeleteAccountingProofLink,
  onSaveDeadlineSettings,
  onCreateDeadline,
  onUpdateDeadline,
  onCompleteDeadline,
  onDismissDeadline
}: MatterDrawerProps) {
  const [draft, setDraft] = useState<MatterFormInput>(
    buildInitialState(matter, defaultBoardId)
  );
  const [noteBody, setNoteBody] = useState("");
  const [addNoteToTaskList, setAddNoteToTaskList] = useState(false);
  const [saveTone, setSaveTone] = useState<"neutral" | "success" | "warn">("neutral");
  const [saveMessage, setSaveMessage] = useState(
    isCreateMode ? "Create the matter to save it." : "Changes save automatically."
  );
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const draftRef = useRef(draft);
  const saveTimerRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const shouldSaveAgainRef = useRef(false);
  const lastSavedSnapshotRef = useRef(
    serializeMatterInput(buildInitialState(matter, defaultBoardId))
  );
  const resolvedStageLabels = createStageLabelMap(stageLabels);
  const matterId = matter?.id ?? null;

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    const nextDraft = buildInitialState(matter, defaultBoardId);
    setDraft(nextDraft);
    draftRef.current = nextDraft;
    lastSavedSnapshotRef.current = serializeMatterInput(nextDraft);
    setSaveTone("neutral");
    setSaveMessage(isCreateMode ? "Create the matter to save it." : "Changes save automatically.");
  }, [matterId, isCreateMode, defaultBoardId]);

  useEffect(() => {
    setNoteBody("");
    setAddNoteToTaskList(false);
  }, [matterId, isCreateMode]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, [matterId, isCreateMode]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!matter || isCreateMode) {
      return;
    }

    const nextDraft = buildInitialState(matter, defaultBoardId);
    const incomingSerialized = serializeMatterInput(nextDraft);
    const currentSerialized = serializeMatterInput(draftRef.current);
    const shouldSyncDraft = currentSerialized === lastSavedSnapshotRef.current;

    lastSavedSnapshotRef.current = incomingSerialized;

    if (shouldSyncDraft && currentSerialized !== incomingSerialized) {
      setDraft(nextDraft);
      draftRef.current = nextDraft;
    }
  }, [
    defaultBoardId,
    isCreateMode,
    matter?.boardId,
    matter?.clientName,
    matter?.decedentName,
    matter?.fileNumber,
    matter?.stage
  ]);

  const panelTitle = useMemo(() => {
    if (isCreateMode) {
      return "New Matter";
    }

    return matter ? matter.decedentName : "Matter Details";
  }, [isCreateMode, matter]);

  const panelSubtitle = useMemo(() => {
    if (isCreateMode) {
      return "Add a new matter.";
    }

    if (!matter) {
      return "Review matter details and capture activity.";
    }

    return (
      <div className="matter-drawer__header-meta">
        <span>{matter.clientName}</span>
        <span className="matter-drawer__header-separator" aria-hidden="true">
          |
        </span>
        <span className="matter-drawer__header-file">{matter.fileNumber}</span>
        <span className="matter-drawer__header-separator" aria-hidden="true">
          |
        </span>
        <span className="matter-drawer__header-stage">
          {getStageLabel(matter.stage, resolvedStageLabels)}
        </span>
      </div>
    );
  }, [isCreateMode, matter, resolvedStageLabels]);

  if (!matter && !isCreateMode) {
    return (
      <Drawer title={panelTitle} subtitle={panelSubtitle}>
        <EmptyState
          title="Nothing selected"
          message="Pick a matter from the board to review details, add notes, and keep work moving."
        />
      </Drawer>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isCreateMode) {
      return;
    }

    await onCreateMatter(draft);
  }

  async function handleDelete() {
    if (!matter) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${matter.decedentName} (${matter.fileNumber})? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    await onDeleteMatter(matter.id);
  }

  async function handleArchive() {
    if (!matter) {
      return;
    }

    await onArchiveMatter(matter.id);
  }

  async function handleAddNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!matter || !noteBody.trim()) {
      return;
    }

    await onAddNote(matter.id, noteBody.trim(), addNoteToTaskList);
    setNoteBody("");
    setAddNoteToTaskList(false);
  }

  const runAutoSave = useEffectEvent(async () => {
    if (isCreateMode || !matter) {
      return;
    }

    const nextDraft = draftRef.current;
    const serializedDraft = serializeMatterInput(nextDraft);

    if (serializedDraft === lastSavedSnapshotRef.current) {
      return;
    }

    if (!isMatterInputComplete(nextDraft)) {
      setSaveTone("warn");
      setSaveMessage("Complete all case fields to save.");
      return;
    }

    if (isSavingRef.current) {
      shouldSaveAgainRef.current = true;
      return;
    }

    isSavingRef.current = true;
    setSaveTone("neutral");
    setSaveMessage("Saving changes...");

    try {
      const savedMatter = await onUpdateMatter(matter.id, nextDraft);
      const syncedDraft = buildInitialState(savedMatter, savedMatter.boardId);
      const savedSerialized = serializeMatterInput(syncedDraft);
      const currentSerialized = serializeMatterInput(draftRef.current);

      lastSavedSnapshotRef.current = savedSerialized;

      if (currentSerialized === serializedDraft) {
        setDraft(syncedDraft);
        draftRef.current = syncedDraft;
        setSaveTone("success");
        setSaveMessage("All changes saved.");
      } else if (!isMatterInputComplete(draftRef.current)) {
        setSaveTone("warn");
        setSaveMessage("Complete all case fields to save.");
      } else {
        shouldSaveAgainRef.current = true;
        setSaveTone("neutral");
        setSaveMessage("Saving changes...");
      }
    } catch {
      setSaveTone("warn");
      setSaveMessage("Unable to save changes.");
    } finally {
      isSavingRef.current = false;

      if (shouldSaveAgainRef.current) {
        shouldSaveAgainRef.current = false;
        void runAutoSave();
      }
    }
  });

  useEffect(() => {
    if (isCreateMode || !matter) {
      return;
    }

    const serializedDraft = serializeMatterInput(draft);

    if (serializedDraft === lastSavedSnapshotRef.current) {
      return;
    }

    if (!isMatterInputComplete(draft)) {
      setSaveTone("warn");
      setSaveMessage("Complete all case fields to save.");
      return;
    }

    saveTimerRef.current = window.setTimeout(() => {
      void runAutoSave();
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [draft, isCreateMode, matterId]);

  useEffect(
    () => () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    },
    []
  );

  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <div
        className="drawer-modal matter-drawer-modal"
        role="dialog"
        aria-modal="true"
        aria-label={panelTitle}
        onClick={(event) => event.stopPropagation()}
      >
        <Drawer
          title={panelTitle}
          subtitle={panelSubtitle}
          actions={
            <div className="button-row">
              <button
                ref={closeButtonRef}
                type="button"
                className="button button--ghost button--small"
                onClick={onClose}
              >
                {isCreateMode ? "Cancel" : "Close"}
              </button>
            </div>
          }
        >
          <div className="matter-drawer__content">
            {!isCreateMode && matter ? (
              <section className="matter-drawer__summary" aria-label="Matter summary">
                <div className="matter-drawer__summary-item">
                  <span>Created</span>
                  <strong>{formatDateTime(matter.createdAt)}</strong>
                </div>
                <div className="matter-drawer__summary-item">
                  <span>Last activity</span>
                  <strong>{formatDateTime(matter.lastActivityAt)}</strong>
                </div>
                <div className="matter-drawer__summary-item matter-drawer__summary-item--status">
                  <span>Status</span>
                  <strong className="matter-drawer__summary-status">
                    {matter.archived ? "Archived" : "Active"}
                  </strong>
                  {matter.archivedAt ? (
                    <small>{formatDateTime(matter.archivedAt)}</small>
                  ) : null}
                </div>
              </section>
            ) : null}

            <form className="matter-drawer__form" onSubmit={handleSubmit}>
              <div className="drawer-form-grid matter-drawer__form-grid">
                <label className="field">
                  <span>Decedent name</span>
                  <input
                    required
                    value={draft.decedentName}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, decedentName: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Client name</span>
                  <input
                    required
                    value={draft.clientName}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, clientName: event.target.value }))
                    }
                  />
                </label>
                <label className="field matter-drawer__field--wide">
                  <span>File number</span>
                  <input
                    required
                    value={draft.fileNumber}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, fileNumber: event.target.value }))
                    }
                  />
                </label>
                {isCreateMode ? (
                  <label className="field">
                    <span>Stage</span>
                    <select
                      value={draft.stage}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          stage: event.target.value as MatterStage
                        }))
                      }
                    >
                      {STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {getStageLabel(stage, resolvedStageLabels)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              <div className="matter-drawer__action-bar">
                <div className="button-row matter-drawer__action-group">
                  {!isCreateMode && matter?.stage === ARCHIVE_READY_STAGE && !matter.archived ? (
                    <button
                      type="button"
                      className="button button--secondary button--small"
                      onClick={handleArchive}
                    >
                      Archive
                    </button>
                  ) : null}
                  {!isCreateMode && matter ? (
                    <button
                      type="button"
                      className="button button--danger button--small"
                      onClick={handleDelete}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
                <div className="button-row matter-drawer__action-group matter-drawer__action-group--primary">
                  {isCreateMode ? (
                    <button type="submit" className="button">
                      Create matter
                    </button>
                  ) : (
                    <div aria-live="polite">
                      <StatusPill tone={saveTone}>{saveMessage}</StatusPill>
                    </div>
                  )}
                </div>
              </div>
            </form>

            {!isCreateMode && matter ? (
              <MatterAccountingSection
                matter={matter}
                periods={accountingPeriods}
                selectedPeriod={accountingPeriod}
                error={accountingError}
                isLoading={isAccountingLoading}
                onSelectPeriod={onSelectAccountingPeriod}
                onCreatePeriod={onCreateAccountingPeriod}
                onUpdatePeriod={onUpdateAccountingPeriod}
                onFinalizePeriod={onFinalizeAccountingPeriod}
                onCreateEntry={onCreateAccountingEntry}
                onUpdateEntry={onUpdateAccountingEntry}
                onDeleteEntry={onDeleteAccountingEntry}
                onCreateHeldAsset={onCreateAccountingHeldAsset}
                onUpdateHeldAsset={onUpdateAccountingHeldAsset}
                onDeleteHeldAsset={onDeleteAccountingHeldAsset}
                onCreateProofLink={onCreateAccountingProofLink}
                onUpdateProofLink={onUpdateAccountingProofLink}
                onDeleteProofLink={onDeleteAccountingProofLink}
              />
            ) : null}

            {!isCreateMode && matter ? (
              <MatterDeadlinesSection
                matter={matter}
                settings={deadlineSettings}
                deadlines={deadlines}
                anchorIssues={deadlineAnchorIssues}
                error={deadlineError}
                onSaveSettings={onSaveDeadlineSettings}
                onCreateDeadline={onCreateDeadline}
                onUpdateDeadline={onUpdateDeadline}
                onCompleteDeadline={onCompleteDeadline}
                onDismissDeadline={onDismissDeadline}
              />
            ) : null}

            {!isCreateMode && matter ? (
              <section className="drawer-section matter-drawer__activity">
                <div className="section-heading section-heading--split matter-drawer__activity-header">
                  <h3>Activity</h3>
                  <span className="matter-drawer__activity-count">
                    {notes.length} {notes.length === 1 ? "note" : "notes"}
                  </span>
                </div>

                <form className="note-composer matter-drawer__note-composer" onSubmit={handleAddNote}>
                  <label className="field">
                    <span className="sr-only">Activity note</span>
                    <textarea
                      rows={3}
                      placeholder="Enter a case activity note..."
                      value={noteBody}
                      onChange={(event) => setNoteBody(event.target.value)}
                    />
                  </label>
                  <div className="matter-drawer__note-footer">
                    <label className="checkbox-field matter-drawer__task-option">
                      <input
                        type="checkbox"
                        checked={addNoteToTaskList}
                        onChange={(event) => setAddNoteToTaskList(event.target.checked)}
                      />
                      <span className="checkbox-field__copy">
                        <strong>Also add to Tasks</strong>
                      </span>
                    </label>
                    <button type="submit" className="button button--secondary button--small">
                      Save note
                    </button>
                  </div>
                </form>

                <NotesTimeline notes={notes} />
              </section>
            ) : null}
          </div>
        </Drawer>
      </div>
    </div>
  );
}
