import { useEffect, useRef, useState } from "react";
import { Drawer } from "@/components/Drawer";
import { EmptyState } from "@/components/EmptyState";
import type { PracticeBoard } from "@/types/matter";

type BoardsModalProps = {
  boards: PracticeBoard[];
  currentBoardId: string;
  error: string | null;
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: (name: string) => Promise<void>;
  onDeleteBoard: (boardId: string) => Promise<void>;
  onClose: () => void;
};

export function BoardsModal({
  boards,
  currentBoardId,
  error,
  onSelectBoard,
  onCreateBoard,
  onDeleteBoard,
  onClose
}: BoardsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [newBoardName, setNewBoardName] = useState("");

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

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newBoardName.trim()) {
      return;
    }

    await onCreateBoard(newBoardName.trim());
    setNewBoardName("");
  }

  return (
    <div className="drawer-overlay" role="presentation" onClick={onClose}>
      <div
        className="drawer-modal task-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Boards"
        onClick={(event) => event.stopPropagation()}
      >
        <Drawer
          title="Boards"
          subtitle="Switch practice-area workspaces or add a new board."
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
          <form className="stack" onSubmit={handleCreate}>
            <div className="section-heading">
              <h3>Add board</h3>
              <p>Create another practice-area board such as Estate Planning.</p>
            </div>
            <div className="button-row boards-modal__create-row">
              <label className="field boards-modal__input">
                <span>Board name</span>
                <input
                  placeholder="Estate Planning"
                  value={newBoardName}
                  onChange={(event) => setNewBoardName(event.target.value)}
                />
              </label>
              <button type="submit" className="button">
                Add Board
              </button>
            </div>
          </form>

          {error ? <p className="stats-empty">{error}</p> : null}

          {boards.length === 0 ? (
            <EmptyState
              title="No boards"
              message="Add a board to start organizing another practice area."
            />
          ) : (
            <ol className="task-list">
              {boards.map((board) => {
                const isCurrent = board.id === currentBoardId;

                return (
                  <li
                    key={board.id}
                    className={isCurrent ? "task-card task-card--active" : "task-card"}
                  >
                    <div className="task-card__header">
                      <div>
                        <h3>{board.name}</h3>
                        <p>
                          {board.columnCount} {board.columnCount === 1 ? "column" : "columns"} per
                          row
                        </p>
                      </div>
                      <div className="task-card__actions">
                        <button
                          type="button"
                          className="button button--ghost button--small"
                          onClick={() => onSelectBoard(board.id)}
                          disabled={isCurrent}
                        >
                          {isCurrent ? "Current" : "Open"}
                        </button>
                        <button
                          type="button"
                          className="button button--danger button--small"
                          onClick={() => void onDeleteBoard(board.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Drawer>
      </div>
    </div>
  );
}
