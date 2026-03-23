import { useEffect, useMemo, useRef } from "react";
import { Drawer } from "@/components/Drawer";
import { EmptyState } from "@/components/EmptyState";
import { DeadlineCard } from "@/features/deadlines/components/DeadlineCard";
import type {
  Deadline,
  DeadlineDashboardData,
  DeadlineDashboardFilters,
  MatterAnchorAlert
} from "@/types/deadlines";

type DeadlinesModalProps = {
  dashboard: DeadlineDashboardData | null;
  filters: DeadlineDashboardFilters;
  error: string | null;
  onChangeFilters: (filters: DeadlineDashboardFilters) => Promise<void>;
  onOpenMatter: (target: { matterId: string; boardId: string }) => void;
  onClose: () => void;
};

export function DeadlinesModal({
  dashboard,
  filters,
  error,
  onChangeFilters,
  onOpenMatter,
  onClose
}: DeadlinesModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const groups = useMemo(
    () => ({
      overdue: dashboard?.deadlines.filter((deadline) => deadline.reminderState === "overdue") ?? [],
      dueToday:
        dashboard?.deadlines.filter((deadline) => deadline.reminderState === "due_today") ?? [],
      dueTomorrow:
        dashboard?.deadlines.filter((deadline) => deadline.reminderState === "due_tomorrow") ?? [],
      dueIn7Days:
        dashboard?.deadlines.filter((deadline) => deadline.reminderState === "due_in_7_days") ?? [],
      dueIn14Days:
        dashboard?.deadlines.filter((deadline) => deadline.reminderState === "due_in_14_days") ?? [],
      laterUpcoming:
        dashboard?.deadlines.filter(
          (deadline) => deadline.status === "upcoming" && deadline.reminderState === "none"
        ) ?? [],
      completed: dashboard?.deadlines.filter((deadline) => deadline.status === "completed") ?? [],
      dismissed: dashboard?.deadlines.filter((deadline) => deadline.status === "dismissed") ?? []
    }),
    [dashboard]
  );

  function renderGroup(title: string, items: Deadline[]) {
    if (items.length === 0) {
      return null;
    }

    return (
      <section className="deadline-group">
        <div className="section-heading section-heading--split">
          <h3>{title}</h3>
          <span className="matter-drawer__activity-count">
            {items.length} {items.length === 1 ? "deadline" : "deadlines"}
          </span>
        </div>
        <div className="task-list">
          {items.map((deadline) => (
            <DeadlineCard
              key={deadline.id}
              deadline={deadline}
              onOpenMatter={() =>
                onOpenMatter({ matterId: deadline.matterId, boardId: deadline.boardId })
              }
            />
          ))}
        </div>
      </section>
    );
  }

  function renderAnchorIssues(items: MatterAnchorAlert[]) {
    if (items.length === 0) {
      return null;
    }

    const groupedItems = Array.from(
      new Map(
        items.map((issue) => [
          issue.matterId,
          {
            matterId: issue.matterId,
            boardId: issue.boardId,
            matterName: issue.matterName,
            fileNumber: issue.fileNumber,
            severity: items.some(
              (entry) => entry.matterId === issue.matterId && entry.severity === "critical"
            )
              ? "critical"
              : "warning",
            messages: items
              .filter((entry) => entry.matterId === issue.matterId)
              .map((entry) => entry.message)
          }
        ])
      ).values()
    );

    return (
      <section className="deadline-group">
        <div className="section-heading section-heading--split">
          <h3>Anchor Issues</h3>
          <span className="matter-drawer__activity-count">
            {groupedItems.length} {groupedItems.length === 1 ? "matter" : "matters"}
          </span>
        </div>
        <div className="matter-deadlines__alert-list">
          {groupedItems.map((issue) => (
            <article
              key={issue.matterId}
              className={`matter-deadlines__alert matter-deadlines__alert--${issue.severity}`}
            >
              <div className="section-heading section-heading--split">
                <div>
                  <strong>
                    {issue.matterName} | {issue.fileNumber}
                  </strong>
                  <div className="matter-deadlines__alert-copy">
                    {issue.messages.map((message) => (
                      <p key={message}>{message}</p>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => onOpenMatter({ matterId: issue.matterId, boardId: issue.boardId })}
                >
                  Open matter
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <div
        className="drawer-modal task-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Deadlines"
        onClick={(event) => event.stopPropagation()}
      >
        <Drawer
          title="Deadlines"
          subtitle="Firm-wide deadline dashboard across all matters."
          actions={
            <button
              ref={closeButtonRef}
              type="button"
              className="button button--ghost"
              onClick={onClose}
            >
              Close
            </button>
          }
        >
          <div className="stats-section">
            <div className="drawer-form-grid deadline-dashboard__filters">
              <label className="field">
                <span>Assignee</span>
                <select
                  value={filters.assignee}
                  onChange={(event) =>
                    void onChangeFilters({
                      ...filters,
                      assignee: event.target.value
                    })
                  }
                >
                  <option value="">All assignees</option>
                  {(dashboard?.assignees ?? []).map((assignee) => (
                    <option key={assignee} value={assignee}>
                      {assignee}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Matter</span>
                <select
                  value={filters.matterId}
                  onChange={(event) =>
                    void onChangeFilters({
                      ...filters,
                      matterId: event.target.value
                    })
                  }
                >
                  <option value="">All matters</option>
                  {(dashboard?.matters ?? []).map((matter) => (
                    <option key={matter.matterId} value={matter.matterId}>
                      {matter.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Status</span>
                <select
                  value={filters.status}
                  onChange={(event) =>
                    void onChangeFilters({
                      ...filters,
                      status: event.target.value as DeadlineDashboardFilters["status"]
                    })
                  }
                >
                  <option value="all">All statuses</option>
                  <option value="overdue">Overdue</option>
                  <option value="due_today">Due today</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </label>
            </div>
          </div>

          {error ? <p className="stats-empty">{error}</p> : null}

          {!error &&
          (!dashboard ||
            (dashboard.deadlines.length === 0 && dashboard.anchorIssues.length === 0)) ? (
            <EmptyState
              title="No deadlines found"
              message="Adjust the filters or add deadlines from a matter to populate the dashboard."
            />
          ) : (
            <div className="stats-panel">
              {renderGroup("Overdue", groups.overdue)}
              {renderGroup("Due Today", groups.dueToday)}
              {renderGroup("Due Tomorrow", groups.dueTomorrow)}
              {renderGroup("Due Within 7 Days", groups.dueIn7Days)}
              {renderGroup("Due Within 14 Days", groups.dueIn14Days)}
              {renderAnchorIssues(dashboard?.anchorIssues ?? [])}
              {renderGroup("Later Upcoming", groups.laterUpcoming)}
              {renderGroup("Completed", groups.completed)}
              {renderGroup("Dismissed", groups.dismissed)}
            </div>
          )}
        </Drawer>
      </div>
    </div>
  );
}
