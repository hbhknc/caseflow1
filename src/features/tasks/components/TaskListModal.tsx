import { Drawer } from "@/components/Drawer";
import { EmptyState } from "@/components/EmptyState";
import { formatDateTime } from "@/lib/dates";
import type { MatterTask } from "@/types/matter";

type TaskListModalProps = {
  tasks: MatterTask[];
  onClose: () => void;
};

export function TaskListModal({ tasks, onClose }: TaskListModalProps) {
  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <div className="drawer-modal task-modal" role="presentation" onClick={(event) => event.stopPropagation()}>
        <Drawer
          title="Task List"
          subtitle="Open follow-up items created from matter activity notes."
          actions={
            <button type="button" className="button button--ghost" onClick={onClose}>
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
                      <p>{task.clientName}</p>
                    </div>
                    <span>{task.fileNumber}</span>
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
