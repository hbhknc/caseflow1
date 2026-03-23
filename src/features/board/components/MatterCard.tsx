import type { DragEvent } from "react";
import { formatDate, formatDateOnly } from "@/lib/dates";
import type { Matter } from "@/types/matter";

type MatterCardProps = {
  matter: Matter;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onQuickNote: () => void;
  onDragStart: (event: DragEvent<HTMLElement>, matter: Matter) => void;
  onDragEnd: () => void;
};

export function MatterCard({
  matter,
  isSelected,
  isDragging,
  onSelect,
  onQuickNote,
  onDragStart,
  onDragEnd
}: MatterCardProps) {
  const hasOverdueDeadlines = matter.deadlineSummary.overdueCount > 0;
  const hasDueTodayDeadlines = matter.deadlineSummary.dueTodayCount > 0;
  const hasAnchorIssues = matter.deadlineSummary.anchorAlertCount > 0;
  const deadlineSummary = hasOverdueDeadlines
    ? `${matter.deadlineSummary.overdueCount} overdue deadline${
        matter.deadlineSummary.overdueCount === 1 ? "" : "s"
      }`
    : hasDueTodayDeadlines
      ? `${matter.deadlineSummary.dueTodayCount} due today`
      : hasAnchorIssues
        ? "Generated deadlines blocked by missing anchor dates"
        : matter.deadlineSummary.nextDeadlineDueDate
          ? `Next deadline ${formatDateOnly(matter.deadlineSummary.nextDeadlineDueDate)}`
          : "No active deadlines";

  return (
    <article
      draggable
      className={
        isDragging
          ? "matter-card matter-card--dragging"
          : isSelected
            ? "matter-card matter-card--selected"
            : "matter-card"
      }
      onDragStart={(event) => onDragStart(event, matter)}
      onDragEnd={onDragEnd}
    >
      <button type="button" className="matter-card__button" onClick={onSelect}>
        <div className="matter-card__stack">
          <h4>{matter.decedentName}</h4>
        </div>
      </button>
      <div className="matter-card__footer">
        <div className="matter-card__footer-copy">
          <p className="matter-card__activity-line">
            Last activity {formatDate(matter.lastActivityAt)}
          </p>
          <p
            className={
              hasOverdueDeadlines
                ? "matter-card__deadline-line matter-card__deadline-line--overdue"
                : hasDueTodayDeadlines || hasAnchorIssues
                  ? "matter-card__deadline-line matter-card__deadline-line--attention"
                : "matter-card__deadline-line"
            }
          >
            {deadlineSummary}
          </p>
        </div>
        <button
          type="button"
          className="matter-card__note-button"
          aria-label={`Add note for ${matter.decedentName}`}
          title="Add Note"
          draggable={false}
          onMouseDown={(event) => event.stopPropagation()}
          onDragStart={(event) => event.preventDefault()}
          onClick={(event) => {
            event.stopPropagation();
            onQuickNote();
          }}
        >
          <span className="sidebar-menu__icon" aria-hidden="true">
            <svg viewBox="0 0 18 18" fill="none">
              <path
                d="M4.5 3.75h9a.75.75 0 0 1 .75.75v6.72a.75.75 0 0 1-.75.75H8.3l-2.8 2.3v-2.3H4.5a.75.75 0 0 1-.75-.75V4.5a.75.75 0 0 1 .75-.75Zm4.5 2.2v3.9M7.05 7.9h3.9"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </div>
    </article>
  );
}
