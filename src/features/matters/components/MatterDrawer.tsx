import { useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/Drawer";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { NotesTimeline } from "@/features/notes/components/NotesTimeline";
import { formatDateTime } from "@/lib/dates";
import { STAGES, formatStageLabel } from "@/utils/stages";
import type { Matter, MatterFormInput, MatterNote, MatterStage } from "@/types/matter";

type MatterDrawerProps = {
  matter: Matter | null;
  notes: MatterNote[];
  isCreateMode: boolean;
  onCloseCreateMode: () => void;
  onCreateMatter: (input: MatterFormInput) => Promise<void>;
  onUpdateMatter: (matterId: string, input: MatterFormInput) => Promise<void>;
  onDeleteMatter: (matterId: string) => Promise<void>;
  onArchiveMatter: (matterId: string) => Promise<void>;
  onAddNote: (matterId: string, body: string) => Promise<void>;
};

function buildInitialState(matter: Matter | null): MatterFormInput {
  if (!matter) {
    return {
      decedentName: "",
      clientName: "",
      fileNumber: "",
      stage: "intake"
    };
  }

  return {
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
  onCloseCreateMode,
  onCreateMatter,
  onUpdateMatter,
  onDeleteMatter,
  onArchiveMatter,
  onAddNote
}: MatterDrawerProps) {
  const [draft, setDraft] = useState<MatterFormInput>(buildInitialState(matter));
  const [noteBody, setNoteBody] = useState("");

  useEffect(() => {
    setDraft(buildInitialState(matter));
    setNoteBody("");
  }, [matter, isCreateMode]);

  const panelTitle = useMemo(() => {
    if (isCreateMode) {
      return "New Matter";
    }

    return matter ? matter.decedentName : "Matter Details";
  }, [isCreateMode, matter]);

  const panelSubtitle = useMemo(() => {
    if (isCreateMode) {
      return "Create a new probate matter and place it on the board.";
    }

    if (!matter) {
      return "Select a case card to review and update matter details.";
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

    await onAddNote(matter.id, noteBody.trim());
    setNoteBody("");
  }

  return (
    <Drawer
      title={panelTitle}
      subtitle={panelSubtitle}
      actions={
        isCreateMode ? (
          <button type="button" className="button button--ghost" onClick={onCloseCreateMode}>
            Cancel
          </button>
        ) : matter ? (
          <div className="button-row">
            {matter.stage === "closed" && !matter.archived ? (
              <button type="button" className="button button--secondary" onClick={handleArchive}>
                Archive
              </button>
            ) : null}
            <button type="button" className="button button--danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        ) : null
      }
    >
      <form className="stack" onSubmit={handleSubmit}>
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
                {formatStageLabel(stage)}
              </option>
            ))}
          </select>
        </label>

        <div className="button-row">
          <button type="submit" className="button">
            {submitLabel}
          </button>
          {!isCreateMode && matter?.archived ? (
            <StatusPill tone="warn">Archived on {formatDateTime(matter.archivedAt)}</StatusPill>
          ) : null}
        </div>
      </form>

      {!isCreateMode && matter ? (
        <>
          <section className="info-grid info-grid--inspector">
            <div>
              <span>Created</span>
              <strong>{formatDateTime(matter.createdAt)}</strong>
            </div>
            <div>
              <span>Last activity</span>
              <strong>{formatDateTime(matter.lastActivityAt)}</strong>
            </div>
            <div>
              <span>Stage</span>
              <strong>{formatStageLabel(matter.stage)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{matter.archived ? "Archived" : "Active"}</strong>
            </div>
          </section>

          <section className="drawer-section stack">
            <div className="section-heading section-heading--split">
              <div>
                <h3>Activity Log</h3>
                <p>Notes are stored as separate, timestamped entries.</p>
              </div>
              <button type="submit" form="note-form" className="button button--secondary">
                Add Note
              </button>
            </div>
            <form id="note-form" className="stack note-composer" onSubmit={handleAddNote}>
              <label className="field">
                <span>New activity</span>
                <textarea
                  rows={4}
                  placeholder="Enter a case activity note..."
                  value={noteBody}
                  onChange={(event) => setNoteBody(event.target.value)}
                />
              </label>
            </form>
            <NotesTimeline notes={notes} />
          </section>
        </>
      ) : null}
    </Drawer>
  );
}
