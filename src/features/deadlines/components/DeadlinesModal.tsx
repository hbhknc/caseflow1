import { useEffect, useMemo, useRef } from "react";
import { Drawer } from "@/components/Drawer";
import { EmptyState } from "@/components/EmptyState";
import { DeadlineCard } from "@/features/deadlines/components/DeadlineCard";
import { getDeadlineDashboardBucket } from "@/lib/deadlineRules";
import type { Deadline, DeadlineDashboardData, DeadlineDashboardFilters } from "@/types/deadlines";

type DeadlinesModalProps = {
  dashboard: DeadlineDashboardData | null;
  filters: DeadlineDashboardFilters;
  error: string | null;
  onChangeFilters: (filters: DeadlineDashboardFilters) => Promise<void>;
  onOpenMatter: (deadline: Deadline) => void;
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
      overdue: dashboard?.deadlines.filter(
        (deadline) => getDeadlineDashboardBucket(deadline) === "overdue"
      ) ?? [],
      dueToday: dashboard?.deadlines.filter(
        (deadline) => getDeadlineDashboardBucket(deadline) === "due_today"
      ) ?? [],
      next7Days: dashboard?.deadlines.filter(
        (deadline) => getDeadlineDashboardBucket(deadline) === "next_7_days"
      ) ?? [],
      next30Days: dashboard?.deadlines.filter(
        (deadline) => getDeadlineDashboardBucket(deadline) === "next_30_days"
      ) ?? [],
      completed: dashboard?.deadlines.filter(
        (deadline) => getDeadlineDashboardBucket(deadline) === "completed"
      ) ?? [],
      dismissed: dashboard?.deadlines.filter(
        (deadline) => getDeadlineDashboardBucket(deadline) === "dismissed"
      ) ?? []
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
              onOpenMatter={() => onOpenMatter(deadline)}
            />
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

          {!error && (!dashboard || dashboard.deadlines.length === 0) ? (
            <EmptyState
              title="No deadlines found"
              message="Adjust the filters or add deadlines from a matter to populate the dashboard."
            />
          ) : (
            <div className="stats-panel">
              {renderGroup("Overdue", groups.overdue)}
              {renderGroup("Due Today", groups.dueToday)}
              {renderGroup("Next 7 Days", groups.next7Days)}
              {renderGroup("Next 30 Days", groups.next30Days)}
              {renderGroup("Completed", groups.completed)}
              {renderGroup("Dismissed", groups.dismissed)}
            </div>
          )}
        </Drawer>
      </div>
    </div>
  );
}
