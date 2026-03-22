import { useState } from "react";
import type { DeadlinePriority, DeadlineUpdateInput } from "@/types/deadlines";

export type DeadlineEditorValue = DeadlineUpdateInput;

type DeadlineEditorProps = {
  initialValue: DeadlineEditorValue;
  submitLabel: string;
  onSubmit: (value: DeadlineEditorValue) => Promise<void>;
  onCancel: () => void;
};

const PRIORITY_OPTIONS: DeadlinePriority[] = ["high", "medium", "low"];

export function DeadlineEditor({
  initialValue,
  submitLabel,
  onSubmit,
  onCancel
}: DeadlineEditorProps) {
  const [draft, setDraft] = useState<DeadlineEditorValue>(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({
        title: draft.title.trim(),
        category: draft.category.trim(),
        dueDate: draft.dueDate,
        assignee: draft.assignee,
        priority: draft.priority,
        notes: draft.notes
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="deadline-editor" onSubmit={handleSubmit}>
      <div className="drawer-form-grid deadline-editor__grid">
        <label className="field">
          <span>Title</span>
          <input
            required
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>Category</span>
          <input
            required
            value={draft.category}
            onChange={(event) =>
              setDraft((current) => ({ ...current, category: event.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>Due date</span>
          <input
            required
            type="date"
            value={draft.dueDate}
            onChange={(event) =>
              setDraft((current) => ({ ...current, dueDate: event.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>Assignee</span>
          <input
            value={draft.assignee}
            onChange={(event) =>
              setDraft((current) => ({ ...current, assignee: event.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>Priority</span>
          <select
            value={draft.priority}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                priority: event.target.value as DeadlinePriority
              }))
            }
          >
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="field deadline-editor__field--wide">
          <span>Notes</span>
          <textarea
            rows={3}
            value={draft.notes}
            onChange={(event) =>
              setDraft((current) => ({ ...current, notes: event.target.value }))
            }
          />
        </label>
      </div>

      <div className="button-row deadline-editor__actions">
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button type="submit" className="button button--small" disabled={isSubmitting}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
