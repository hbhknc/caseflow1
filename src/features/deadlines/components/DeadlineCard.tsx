import { formatDateOnly, formatDateTime } from "@/lib/dates";
import type { Deadline } from "@/types/deadlines";

type DeadlineCardProps = {
  deadline: Deadline;
  onOpenMatter?: () => void;
  onEdit?: () => void;
  onComplete?: () => void;
  onDismiss?: () => void;
};

function getStatusLabel(deadline: Deadline) {
  switch (deadline.status) {
    case "due_today":
      return "Due today";
    case "overdue":
      return "Overdue";
    case "completed":
      return "Completed";
    case "dismissed":
      return "Dismissed";
    default:
      return "Upcoming";
  }
}

function getPriorityLabel(deadline: Deadline) {
  return `${deadline.priority.charAt(0).toUpperCase()}${deadline.priority.slice(1)} priority`;
}

export function DeadlineCard({
  deadline,
  onOpenMatter,
  onEdit,
  onComplete,
  onDismiss
}: DeadlineCardProps) {
  return (
    <article className="task-card deadline-card">
      <div className="task-card__header">
        <div>
          <h3>{deadline.title}</h3>
          <p>
            {deadline.category} | Due {formatDateOnly(deadline.dueDate)}
          </p>
        </div>
        <div className="deadline-card__badges">
          <span className={`deadline-pill deadline-pill--${deadline.status}`}>
            {getStatusLabel(deadline)}
          </span>
          <span className={`deadline-pill deadline-pill--priority-${deadline.priority}`}>
            {getPriorityLabel(deadline)}
          </span>
          <span className="deadline-pill deadline-pill--source">
            {deadline.sourceType === "template" ? "Template" : "Manual"}
          </span>
          {deadline.isOverridden ? (
            <span className="deadline-pill deadline-pill--source">Override</span>
          ) : null}
        </div>
      </div>

      <div className="deadline-card__meta">
        <span>
          Matter {deadline.matterName} | {deadline.fileNumber}
        </span>
        <span>Assignee {deadline.assignee ?? "Unassigned"}</span>
      </div>

      {deadline.notes ? <p className="task-card__body">{deadline.notes}</p> : null}

      {deadline.status === "completed" && deadline.completedAt ? (
        <p className="task-card__meta">
          Completed {formatDateTime(deadline.completedAt)}
          {deadline.completedBy ? ` by ${deadline.completedBy}` : ""}
        </p>
      ) : null}

      {deadline.status === "dismissed" && deadline.dismissedAt ? (
        <p className="task-card__meta">
          Dismissed {formatDateTime(deadline.dismissedAt)}
          {deadline.dismissedBy ? ` by ${deadline.dismissedBy}` : ""}
        </p>
      ) : null}

      {deadline.status !== "completed" && deadline.status !== "dismissed" ? (
        <div className="task-card__actions task-card__actions--inline">
          <p className="task-card__meta">Updated {formatDateTime(deadline.updatedAt)}</p>
          <div className="button-row deadline-card__actions">
            {onOpenMatter ? (
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={onOpenMatter}
              >
                Open matter
              </button>
            ) : null}
            {onEdit ? (
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={onEdit}
              >
                Edit
              </button>
            ) : null}
            {onComplete ? (
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={onComplete}
              >
                Complete
              </button>
            ) : null}
            {onDismiss ? (
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={onDismiss}
              >
                Dismiss
              </button>
            ) : null}
          </div>
        </div>
      ) : onOpenMatter ? (
        <div className="task-card__actions task-card__actions--inline">
          <p className="task-card__meta">Updated {formatDateTime(deadline.updatedAt)}</p>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={onOpenMatter}
          >
            Open matter
          </button>
        </div>
      ) : null}
    </article>
  );
}
