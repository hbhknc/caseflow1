import { useEffect, useRef, useState } from "react";
import type { PracticeBoard } from "@/types/matter";

type BoardSwitcherProps = {
  boards: PracticeBoard[];
  currentBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: (name: string) => Promise<void>;
  onManageBoards: () => void;
};

export function BoardSwitcher({
  boards,
  currentBoardId,
  onSelectBoard,
  onCreateBoard,
  onManageBoards
}: BoardSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentBoard =
    boards.find((board) => board.id === currentBoardId)?.name ?? "Select board";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleAddBoard() {
    const name = window.prompt("New board name");

    if (!name?.trim()) {
      return;
    }

    try {
      await onCreateBoard(name.trim());
      setIsOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to create board.");
    }
  }

  return (
    <div className="board-switcher" ref={containerRef}>
      <button
        type="button"
        className="button button--ghost board-switcher__trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="board-switcher__label">{currentBoard}</span>
        <span className="sidebar-menu__icon" aria-hidden="true">
          <svg viewBox="0 0 18 18" fill="none">
            <path
              d="m5.5 7 3.5 4 3.5-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {isOpen ? (
        <div className="board-switcher__menu" role="menu" aria-label="Boards">
          <div className="board-switcher__list">
            {boards.map((board) => {
              const isCurrent = board.id === currentBoardId;

              return (
                <button
                  key={board.id}
                  type="button"
                  className={
                    isCurrent
                      ? "board-switcher__item board-switcher__item--current"
                      : "board-switcher__item"
                  }
                  role="menuitemradio"
                  aria-checked={isCurrent}
                  onClick={() => {
                    onSelectBoard(board.id);
                    setIsOpen(false);
                  }}
                >
                  <span>{board.name}</span>
                  {isCurrent ? <span className="board-switcher__meta">Current</span> : null}
                </button>
              );
            })}
          </div>

          <div className="board-switcher__footer">
            <button
              type="button"
              className="board-switcher__item"
              role="menuitem"
              onClick={() => void handleAddBoard()}
            >
              <span>Add Board</span>
            </button>
            <button
              type="button"
              className="board-switcher__item"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onManageBoards();
              }}
            >
              <span>Manage Boards</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
