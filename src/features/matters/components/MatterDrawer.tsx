import { useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "@/components/Drawer";
import { EmptyState } from "@/components/EmptyState";
import { NotesTimeline } from "@/features/notes/components/NotesTimeline";
import { formatDateTime } from "@/lib/dates";
import { ARCHIVE_READY_STAGE, STAGES, createStageLabelMap, getStageLabel } from "@/utils/stages";
import type { Matter, MatterFormInput, MatterNote, MatterStage } from "@/types/matter";

type MatterDrawerProps = {
  matter: Matter | null;
  notes: MatterNote[];
  isCreateMode: boolean;
  defaultBoardId?: string;
  stageLabels?: Partial<Record<MatterStage, string>>;
  onClose: () => void;
  onCreateMatter: (input: MatterFormInput) => Promise<void>;
  onUpdateMatter: (matterId: string, input: MatterFormInput) => Promise<void>;
  onDeleteMatter: (matterId: string) => Promise<void>;
  onArchiveMatter: (matterId: string) => Promise<void>;
  onAddNote: (matterId: string, body: string, addToTaskList: boolean) => Promise<void>;
};

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

export function MatterDrawer({
  matter,
  notes,
  isCreateMode,
  defaultBoardId = "probate",
  stageLabels,
  onClose,
  onCreateMatter,
  onUpdateMatter,
  onDeleteMatter,
  onArchiveMatter,
  onAddNote
}: MatterDrawerProps) {
  const [draft, setDraft] = useState<MatterFormInput>(
    buildInitialState(matter, defaultBoardId)
  );
  const [noteBody, setNoteBody] = useState("");
  const [addNoteToTaskList, setAddNoteToTaskList] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const resolvedStageLabels = createStageLabelMap(stageLabels);

  useEffect(() => {
    setDraft(buildInitialState(matter, defaultBoardId));
    setNoteBody("");
    setAddNoteToTaskList(false);
  }, [matter, isCreateMode, defaultBoardId]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, [matter, isCreateMode]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

  const submitLabel = isCreateMode ? "Create matter" : "Save changes";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCreateMode) {
      await onCreateMatter(draft);
      return;
    }

    if (!matter) {
      return;
    }

    await onUpdateMatter(matter.id, draft);
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
                <label
                  className={`field${!isCreateMode ? " matter-drawer__field--wide" : ""}`}
                >
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
                  <button type="submit" className="button">
                    {submitLabel}
                  </button>
                </div>
              </div>
            </form>

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
