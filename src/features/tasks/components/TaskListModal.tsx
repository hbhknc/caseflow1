import { useEffect, useRef } from "react";
import { Drawer } from "@/components/Drawer";
import { EmptyState } from "@/components/EmptyState";
import { formatDateTime } from "@/lib/dates";
import type { MatterTask } from "@/types/matter";

type TaskListModalProps = {
  tasks: MatterTask[];
  onClose: () => void;
  onOpenMatter: (matterId: string) => void;
};

export function TaskListModal({ tasks, onClose, onOpenMatter }: TaskListModalProps) {
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

  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <div
        className="drawer-modal task-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Task list"
        onClick={(event) => event.stopPropagation()}
      >
        <Drawer
          title="Task List"
          subtitle="Follow-up items created from matter activity."
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
          {tasks.length === 0 ? (
            <EmptyState
              title="No open tasks"
              message="Use the note checkbox to add follow-up items into the shared task list."
            />
          ) : (
            <ol className="task-list">
              {tasks.map((task) => (
                <li key={task.id} className="task-card">
                  <div className="task-card__header">
                    <div>
                      <h3>{task.matterName}</h3>
                      <p>
                        {task.clientName} | {task.fileNumber}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => onOpenMatter(task.matterId)}
                    >
                      Open matter
                    </button>
                  </div>
                  <p className="task-card__body">{task.body}</p>
                  <p className="task-card__meta">Added {formatDateTime(task.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
        </Drawer>
      </div>
    </div>
  );
}
