import { useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "@/components/Drawer";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
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
      return "Create a new matter and place it on the board.";
    }

    if (!matter) {
      return "Review matter details, update its stage, and capture follow-up activity.";
    }

    return `${matter.clientName} | ${matter.fileNumber}`;
  }, [isCreateMode, matter]);

  if (!matter && !isCreateMode) {
    return (
      <Drawer title={panelTitle} subtitle={panelSubtitle}>
        <EmptyState
          title="Nothing selected"
          message="Pick a matter from the board to review activity, edit stage details, and add notes."
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
        className="drawer-modal"
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
                className="button button--ghost"
                onClick={onClose}
              >
                {isCreateMode ? "Cancel" : "Close"}
              </button>
            </div>
          }
        >
          {!isCreateMode && matter ? (
            <section className="drawer-meta-list" aria-label="Matter summary">
              <div className="drawer-meta-item">
                <span>Created</span>
                <strong>{formatDateTime(matter.createdAt)}</strong>
              </div>
              <div className="drawer-meta-item">
                <span>Last activity</span>
                <strong>{formatDateTime(matter.lastActivityAt)}</strong>
              </div>
              <div className="drawer-meta-item">
                <span>Status</span>
                <strong>{matter.archived ? "Archived" : "Active"}</strong>
              </div>
            </section>
          ) : null}

          <form className="stack" onSubmit={handleSubmit}>
            <div className="drawer-form-grid">
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
              <label className="field">
                <span>File number</span>
                <input
                  required
                  value={draft.fileNumber}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, fileNumber: event.target.value }))
                  }
                />
              </label>
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
                {!isCreateMode ? (
                  <small className="field-hint">
                    Use this field to move the matter without dragging it on the board.
                  </small>
                ) : null}
              </label>
            </div>

            <div className="button-row">
              <button type="submit" className="button">
                {submitLabel}
              </button>
              {!isCreateMode && matter?.stage === ARCHIVE_READY_STAGE && !matter.archived ? (
                <button type="button" className="button button--secondary" onClick={handleArchive}>
                  Archive
                </button>
              ) : null}
              {!isCreateMode && matter ? (
                <button type="button" className="button button--danger" onClick={handleDelete}>
                  Delete
                </button>
              ) : null}
              {!isCreateMode && matter?.archived ? (
                <StatusPill tone="warn">Archived on {formatDateTime(matter.archivedAt)}</StatusPill>
              ) : null}
            </div>
          </form>

          {!isCreateMode && matter ? (
            <section className="drawer-section stack">
              <div className="section-heading section-heading--split">
                <div>
                  <h3>Activity</h3>
                  <p>Each note is timestamped and stays with the matter history.</p>
                </div>
                <button type="submit" form="note-form" className="button button--secondary">
                  Add Note
                </button>
              </div>

              <form id="note-form" className="stack note-composer" onSubmit={handleAddNote}>
                <label className="field">
                  <span>New activity note</span>
                  <textarea
                    rows={4}
                    placeholder="Enter a case activity note..."
                    value={noteBody}
                    onChange={(event) => setNoteBody(event.target.value)}
                  />
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={addNoteToTaskList}
                    onChange={(event) => setAddNoteToTaskList(event.target.checked)}
                  />
                  <span className="checkbox-field__copy">
                    <strong>Also create a task from this note</strong>
                    <small>The note stays in the activity log and also appears in Tasks.</small>
                  </span>
                </label>
              </form>

              <NotesTimeline notes={notes} />
            </section>
          ) : null}
        </Drawer>
      </div>
    </div>
  );
}
