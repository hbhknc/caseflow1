import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { DeadlineCard } from "@/features/deadlines/components/DeadlineCard";
import {
  DeadlineEditor,
  type DeadlineEditorValue
} from "@/features/deadlines/components/DeadlineEditor";
import { formatDateOnly } from "@/lib/dates";
import { applyAnchorDateChangeToDeadlineSettingsDraft } from "@/lib/matterDeadlineSettings";
import type {
  Deadline,
  DeadlineInput,
  MatterAnchorAlert,
  DeadlineUpdateInput,
  MatterDeadlineSettings,
  MatterDeadlineSettingsInput
} from "@/types/deadlines";
import type { Matter } from "@/types/matter";

type MatterDeadlinesSectionProps = {
  matter: Matter;
  settings: MatterDeadlineSettings | null;
  deadlines: Deadline[];
  anchorIssues: MatterAnchorAlert[];
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

function getReminderLabel(
  reminderState: Matter["deadlineSummary"]["nextReminderState"] | Deadline["reminderState"]
) {
  switch (reminderState) {
    case "overdue":
      return "Overdue";
    case "due_today":
      return "Due today";
    case "due_tomorrow":
      return "Due tomorrow";
    case "due_in_7_days":
      return "Due within 7 days";
    case "due_in_14_days":
      return "Due within 14 days";
    default:
      return "No active reminder";
  }
}

function buildDraftAnchorIssues(
  matter: Matter,
  draft: MatterDeadlineSettingsInput
): MatterAnchorAlert[] {
  if (draft.templateKey !== "standard_estate_administration") {
    return [];
  }

  if (!draft.qualificationDate) {
    return [
      {
        id: `${matter.id}:qualification_missing:draft`,
        matterId: matter.id,
        boardId: matter.boardId,
        boardName: null,
        matterName: matter.decedentName,
        clientName: matter.clientName,
        fileNumber: matter.fileNumber,
        type: "qualification_missing",
        severity: "warning",
        message: "Add a qualification date to generate probate deadlines tied to appointment."
      },
      {
        id: `${matter.id}:generated_deadlines_blocked:qualification:draft`,
        matterId: matter.id,
        boardId: matter.boardId,
        boardName: null,
        matterName: matter.decedentName,
        clientName: matter.clientName,
        fileNumber: matter.fileNumber,
        type: "generated_deadlines_blocked",
        severity: "critical",
        message: "Generated probate deadlines are blocked until a qualification date is entered."
      }
    ];
  }

  if (!draft.publicationDate) {
    return [
      {
        id: `${matter.id}:publication_missing:draft`,
        matterId: matter.id,
        boardId: matter.boardId,
        boardName: null,
        matterName: matter.decedentName,
        clientName: matter.clientName,
        fileNumber: matter.fileNumber,
        type: "publication_missing",
        severity: "warning",
        message:
          "Add a publication date to generate notice-to-creditors follow-up deadlines."
      },
      {
        id: `${matter.id}:generated_deadlines_blocked:publication:draft`,
        matterId: matter.id,
        boardId: matter.boardId,
        boardName: null,
        matterName: matter.decedentName,
        clientName: matter.clientName,
        fileNumber: matter.fileNumber,
        type: "generated_deadlines_blocked",
        severity: "critical",
        message: "Generated probate deadlines are blocked until a publication date is entered."
      }
    ];
  }

  return [];
}

export function MatterDeadlinesSection({
  matter,
  settings,
  deadlines,
  anchorIssues,
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
  const draftAnchorIssues = useMemo(
    () => buildDraftAnchorIssues(matter, settingsDraft),
    [matter, settingsDraft]
  );
  const hasUnsavedSettingsChanges =
    serializeSettingsDraft(settingsDraft) !== lastSavedSnapshotRef.current;
  const effectiveAnchorIssues = hasUnsavedSettingsChanges ? draftAnchorIssues : anchorIssues;
  const qualificationWarning = effectiveAnchorIssues.find(
    (issue) => issue.type === "qualification_missing"
  );
  const publicationWarning = effectiveAnchorIssues.find(
    (issue) => issue.type === "publication_missing"
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

  function handleQualificationDateChange(value: string | null) {
    setSettingsDraft((current) =>
      applyAnchorDateChangeToDeadlineSettingsDraft(current, {
        qualificationDate: value
      })
    );
  }

  function handlePublicationDateChange(value: string | null) {
    setSettingsDraft((current) =>
      applyAnchorDateChangeToDeadlineSettingsDraft(current, {
        publicationDate: value
      })
    );
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

      <div className="matter-deadlines__summary-strip" aria-label="Anchor health and reminders">
        <article className="matter-deadlines__summary-card">
          <span>Urgent reminders</span>
          <strong>{matter.deadlineSummary.urgentReminderCount}</strong>
          <small>Overdue, due today, or due tomorrow.</small>
        </article>
        <article className="matter-deadlines__summary-card">
          <span>Next reminder</span>
          <strong>{getReminderLabel(matter.deadlineSummary.nextReminderState)}</strong>
          <small>
            {matter.deadlineSummary.nextDeadlineDueDate
              ? `Next due ${formatDateOnly(matter.deadlineSummary.nextDeadlineDueDate)}`
              : "No active deadlines require attention yet."}
          </small>
        </article>
        <article className="matter-deadlines__summary-card">
          <span>Anchor issues</span>
          <strong>{effectiveAnchorIssues.length}</strong>
          <small>
            {effectiveAnchorIssues.length > 0
              ? "Missing anchor dates are blocking generated deadlines."
              : "Qualification and publication anchors are ready."}
          </small>
        </article>
      </div>

      {effectiveAnchorIssues.length > 0 ? (
        <div className="matter-deadlines__alert-list">
          {effectiveAnchorIssues.map((issue) => (
            <article
              key={issue.id}
              className={`matter-deadlines__alert matter-deadlines__alert--${issue.severity}`}
            >
              <strong>
                {issue.type === "generated_deadlines_blocked"
                  ? "Generated deadlines blocked"
                  : issue.type === "qualification_missing"
                    ? "Qualification date needed"
                    : "Publication date needed"}
              </strong>
              <p>{issue.message}</p>
            </article>
          ))}
        </div>
      ) : null}

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
            onChange={(event) => handleQualificationDateChange(event.target.value || null)}
          />
          {qualificationWarning ? (
            <small className="matter-deadlines__field-hint matter-deadlines__field-hint--warning">
              {qualificationWarning.message}
            </small>
          ) : null}
        </label>
        <label className="field">
          <span>Publication date</span>
          <input
            type="date"
            value={settingsDraft.publicationDate ?? ""}
            onChange={(event) => handlePublicationDateChange(event.target.value || null)}
          />
          {publicationWarning ? (
            <small className="matter-deadlines__field-hint matter-deadlines__field-hint--warning">
              {publicationWarning.message}
            </small>
          ) : null}
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
