import { useEffect, useRef } from "react";
import { Drawer } from "@/components/Drawer";
import { EmptyState } from "@/components/EmptyState";
import { formatDate } from "@/lib/dates";
import type { Matter } from "@/types/matter";

type ArchiveModalProps = {
  matters: Matter[];
  error: string | null;
  onClose: () => void;
};

function formatCaseLength(createdAt: string, archivedAt: string | null) {
  if (!archivedAt) {
    return "Not available";
  }

  const days = Math.round(
    (new Date(archivedAt).getTime() - new Date(createdAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return `${days} days`;
}

export function ArchiveModal({ matters, error, onClose }: ArchiveModalProps) {
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
        aria-label="Archive"
        onClick={(event) => event.stopPropagation()}
      >
        <Drawer
          title="Archive"
          subtitle="Archived matters are stored here after they leave the active board."
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
          {error ? <p className="stats-empty">{error}</p> : null}

          {!error && matters.length === 0 ? (
            <EmptyState
              title="No archived matters"
              message="Archived matters will appear here after they are closed out from Accounting / Closing."
            />
          ) : (
            <ol className="task-list">
              {matters.map((matter) => (
                <li key={matter.id} className="task-card">
                  <div className="task-card__header">
                    <div>
                      <h3>{matter.decedentName}</h3>
                      <p>
                        {matter.clientName} | {matter.fileNumber}
                      </p>
                    </div>
                    <span className="task-card__badge">Archived {formatDate(matter.archivedAt)}</span>
                  </div>
                  <p className="task-card__meta">
                    Opened {formatDate(matter.createdAt)} | Case length{" "}
                    {formatCaseLength(matter.createdAt, matter.archivedAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Drawer>
      </div>
    </div>
  );
}
