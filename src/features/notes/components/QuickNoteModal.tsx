import { useEffect, useRef, useState } from "react";
import { Drawer } from "@/components/Drawer";
import type { Matter } from "@/types/matter";

type QuickNoteModalProps = {
  matter: Matter;
  onClose: () => void;
  onSubmit: (body: string, addToTaskList: boolean) => Promise<void>;
};

export function QuickNoteModal({ matter, onClose, onSubmit }: QuickNoteModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [body, setBody] = useState("");
  const [addToTaskList, setAddToTaskList] = useState(false);

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) {
      return;
    }

    await onSubmit(body.trim(), addToTaskList);
    onClose();
  }

  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <div
        className="drawer-modal task-modal quick-note-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Add note for ${matter.decedentName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <Drawer
          title="Add Note"
          subtitle={`${matter.decedentName} | ${matter.clientName}`}
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
          <form className="stack" onSubmit={handleSubmit}>
            <label className="field">
              <span className="sr-only">Activity note</span>
              <textarea
                rows={4}
                placeholder="Enter a case activity note..."
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </label>
            <div className="matter-drawer__note-footer">
              <label className="checkbox-field matter-drawer__task-option">
                <input
                  type="checkbox"
                  checked={addToTaskList}
                  onChange={(event) => setAddToTaskList(event.target.checked)}
                />
                <span className="checkbox-field__copy">
                  <strong>Also add to Tasks</strong>
                  <small>Keeps the note here and adds it to the task list.</small>
                </span>
              </label>
              <button type="submit" className="button button--secondary">
                Add Note
              </button>
            </div>
          </form>
        </Drawer>
      </div>
    </div>
  );
}
