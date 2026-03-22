import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { DeadlineCard } from "@/features/deadlines/components/DeadlineCard";
import {
  DeadlineEditor,
  type DeadlineEditorValue
} from "@/features/deadlines/components/DeadlineEditor";
import type {
  Deadline,
  DeadlineInput,
  DeadlineUpdateInput,
  MatterDeadlineSettings,
  MatterDeadlineSettingsInput
} from "@/types/deadlines";
import type { Matter } from "@/types/matter";

type MatterDeadlinesSectionProps = {
  matter: Matter;
  settings: MatterDeadlineSettings | null;
  deadlines: Deadline[];
  error: string | null;
  onSaveSettings: (matterId: string, input: MatterDeadlineSettingsInput) => Promise<void>;
  onCreateDeadline: (input: DeadlineInput) => Promise<void>;
  onUpdateDeadline: (deadlineId: string, input: DeadlineUpdateInput) => Promise<void>;
  onCompleteDeadline: (deadlineId: string, completionNote: string) => Promise<void>;
  onDismissDeadline: (deadlineId: string) => Promise<void>;
};

const AUTO_SAVE_DELAY_MS = 500;
const TEMPLATE_OPTIONS: Array<{
  value: MatterDeadlineSettingsInput["templateKey"];
  label: string;
}> = [
  {
    value: "standard_estate_administration",
    label: "Standard estate administration"
  },
  {
    value: "custom_manual_only",
    label: "Custom / manual only"
  }
];

function buildSettingsDraft(
  matter: Matter,
  settings: MatterDeadlineSettings | null
): MatterDeadlineSettingsInput {
  return {
    templateKey: settings?.templateKey ?? matter.deadlineTemplateKey,
    qualificationDate: settings?.qualificationDate ?? matter.qualificationDate,
    publicationDate: settings?.publicationDate ?? matter.publicationDate
  };
}

function serializeSettingsDraft(draft: MatterDeadlineSettingsInput) {
  return JSON.stringify(draft);
}

function createEmptyDeadline(): DeadlineEditorValue {
  return {
    title: "",
    category: "",
    dueDate: "",
    assignee: "",
    priority: "medium",
    notes: ""
  };
}

function buildDeadlineEditorValue(deadline: Deadline): DeadlineEditorValue {
  return {
    title: deadline.title,
    category: deadline.category,
    dueDate: deadline.dueDate,
    assignee: deadline.assignee ?? "",
    priority: deadline.priority,
    notes: deadline.notes ?? ""
  };
}

export function MatterDeadlinesSection({
  matter,
  settings,
  deadlines,
  error,
  onSaveSettings,
  onCreateDeadline,
  onUpdateDeadline,
  onCompleteDeadline,
  onDismissDeadline
}: MatterDeadlinesSectionProps) {
  const [settingsDraft, setSettingsDraft] = useState<MatterDeadlineSettingsInput>(() =>
    buildSettingsDraft(matter, settings)
  );
  const [saveTone, setSaveTone] = useState<"neutral" | "success" | "warn">("neutral");
  const [saveMessage, setSaveMessage] = useState("Changes save automatically.");
  const [isAddingDeadline, setIsAddingDeadline] = useState(false);
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const draftRef = useRef(settingsDraft);
  const saveTimerRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const shouldSaveAgainRef = useRef(false);
  const lastSavedSnapshotRef = useRef(serializeSettingsDraft(buildSettingsDraft(matter, settings)));

  useEffect(() => {
    draftRef.current = settingsDraft;
  }, [settingsDraft]);

  useEffect(() => {
    const nextDraft = buildSettingsDraft(matter, settings);
    const serializedIncoming = serializeSettingsDraft(nextDraft);
    const serializedCurrent = serializeSettingsDraft(draftRef.current);
    const shouldSync = serializedCurrent === lastSavedSnapshotRef.current;

    lastSavedSnapshotRef.current = serializedIncoming;

    if (shouldSync && serializedCurrent !== serializedIncoming) {
      setSettingsDraft(nextDraft);
      draftRef.current = nextDraft;
    }

    setSaveTone("neutral");
    setSaveMessage("Changes save automatically.");
  }, [
    matter.id,
    matter.deadlineTemplateKey,
    matter.qualificationDate,
    matter.publicationDate,
    settings?.templateKey,
    settings?.qualificationDate,
    settings?.publicationDate
  ]);

  const runAutoSave = useEffectEvent(async () => {
    const serializedDraft = serializeSettingsDraft(draftRef.current);

    if (serializedDraft === lastSavedSnapshotRef.current) {
      return;
    }

    if (isSavingRef.current) {
      shouldSaveAgainRef.current = true;
      return;
    }

    isSavingRef.current = true;
    setSaveTone("neutral");
    setSaveMessage("Saving deadlines...");

    try {
      await onSaveSettings(matter.id, draftRef.current);
      lastSavedSnapshotRef.current = serializeSettingsDraft(draftRef.current);
      setSaveTone("success");
      setSaveMessage("Deadline settings saved.");
    } catch {
      setSaveTone("warn");
      setSaveMessage("Unable to save deadline settings.");
    } finally {
      isSavingRef.current = false;

      if (shouldSaveAgainRef.current) {
        shouldSaveAgainRef.current = false;
        void runAutoSave();
      }
    }
  });

  useEffect(() => {
    const serializedDraft = serializeSettingsDraft(settingsDraft);

    if (serializedDraft === lastSavedSnapshotRef.current) {
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
  }, [settingsDraft]);

  useEffect(
    () => () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    },
    []
  );

  const groupedDeadlines = useMemo(
    () => ({
      overdue: deadlines.filter((deadline) => deadline.status === "overdue"),
      dueToday: deadlines.filter((deadline) => deadline.status === "due_today"),
      upcoming: deadlines.filter((deadline) => deadline.status === "upcoming"),
      completed: deadlines.filter((deadline) => deadline.status === "completed"),
      dismissed: deadlines.filter((deadline) => deadline.status === "dismissed")
    }),
    [deadlines]
  );

  async function handleCompleteDeadline(deadlineId: string) {
    const completionNote = window.prompt("Optional completion note", "");

    if (completionNote === null) {
      return;
    }

    await onCompleteDeadline(deadlineId, completionNote);
  }

  async function handleDismissDeadline(deadlineId: string) {
    const confirmed = window.confirm("Dismiss this deadline?");

    if (!confirmed) {
      return;
    }

    await onDismissDeadline(deadlineId);
  }

  async function handleCreateManualDeadline(value: DeadlineEditorValue) {
    await onCreateDeadline({
      matterId: matter.id,
      ...value
    });
    setIsAddingDeadline(false);
  }

  async function handleUpdateExistingDeadline(
    deadlineId: string,
    value: DeadlineEditorValue
  ) {
    await onUpdateDeadline(deadlineId, value);
    setEditingDeadlineId(null);
  }

  function renderGroup(title: string, items: Deadline[]) {
    if (items.length === 0) {
      return null;
    }

    return (
      <section className="deadline-group">
        <div className="section-heading section-heading--split">
          <h4>{title}</h4>
          <span className="matter-drawer__activity-count">
            {items.length} {items.length === 1 ? "deadline" : "deadlines"}
          </span>
        </div>
        <div className="task-list">
          {items.map((deadline) =>
            editingDeadlineId === deadline.id ? (
              <DeadlineEditor
                key={deadline.id}
                initialValue={buildDeadlineEditorValue(deadline)}
                submitLabel="Save deadline"
                onSubmit={(value) => handleUpdateExistingDeadline(deadline.id, value)}
                onCancel={() => setEditingDeadlineId(null)}
              />
            ) : (
              <DeadlineCard
                key={deadline.id}
                deadline={deadline}
                onEdit={
                  deadline.status === "completed" || deadline.status === "dismissed"
                    ? undefined
                    : () => setEditingDeadlineId(deadline.id)
                }
                onComplete={
                  deadline.status === "completed" || deadline.status === "dismissed"
                    ? undefined
                    : () => void handleCompleteDeadline(deadline.id)
                }
                onDismiss={
                  deadline.status === "completed" || deadline.status === "dismissed"
                    ? undefined
                    : () => void handleDismissDeadline(deadline.id)
                }
              />
            )
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="drawer-section matter-deadlines">
      <div className="section-heading section-heading--split">
        <div>
          <h3>Deadlines</h3>
          <p>Track matter-specific due dates and auto-generate probate follow-ups.</p>
        </div>
        <div className="button-row">
          <StatusPill tone={saveTone}>{saveMessage}</StatusPill>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => {
              setEditingDeadlineId(null);
              setIsAddingDeadline((current) => !current);
            }}
          >
            {isAddingDeadline ? "Cancel" : "Add deadline"}
          </button>
        </div>
      </div>

      {error ? <p className="stats-empty">{error}</p> : null}

      <div className="drawer-form-grid matter-deadlines__settings-grid">
        <label className="field">
          <span>Template</span>
          <select
            value={settingsDraft.templateKey}
            onChange={(event) =>
              setSettingsDraft((current) => ({
                ...current,
                templateKey: event.target.value as MatterDeadlineSettingsInput["templateKey"]
              }))
            }
          >
            {TEMPLATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Qualification date</span>
          <input
            type="date"
            value={settingsDraft.qualificationDate ?? ""}
            onChange={(event) =>
              setSettingsDraft((current) => ({
                ...current,
                qualificationDate: event.target.value || null
              }))
            }
          />
        </label>
        <label className="field">
          <span>Publication date</span>
          <input
            type="date"
            value={settingsDraft.publicationDate ?? ""}
            onChange={(event) =>
              setSettingsDraft((current) => ({
                ...current,
                publicationDate: event.target.value || null
              }))
            }
          />
        </label>
      </div>

      {isAddingDeadline ? (
        <DeadlineEditor
          initialValue={createEmptyDeadline()}
          submitLabel="Add deadline"
          onSubmit={handleCreateManualDeadline}
          onCancel={() => setIsAddingDeadline(false)}
        />
      ) : null}

      {deadlines.length === 0 && !isAddingDeadline ? (
        <EmptyState
          title="No deadlines yet"
          message="Create a manual deadline or choose a template to generate the first set."
        />
      ) : null}

      {renderGroup("Overdue", groupedDeadlines.overdue)}
      {renderGroup("Due Today", groupedDeadlines.dueToday)}
      {renderGroup("Upcoming", groupedDeadlines.upcoming)}
      {renderGroup("Completed", groupedDeadlines.completed)}
      {renderGroup("Dismissed", groupedDeadlines.dismissed)}
    </section>
  );
}
