import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { useAppChrome } from "@/app/AppChrome";
import { EmptyState } from "@/components/EmptyState";
import { SearchField } from "@/components/SearchField";
import { ArchiveModal } from "@/features/archive/components/ArchiveModal";
import { BoardColumn } from "@/features/board/components/BoardColumn";
import { BoardsModal } from "@/features/board/components/BoardsModal";
import { ImportModal } from "@/features/import/components/ImportModal";
import { MatterDrawer } from "@/features/matters/components/MatterDrawer";
import { SettingsModal } from "@/features/settings/components/SettingsModal";
import { StatsModal } from "@/features/stats/components/StatsModal";
import { TaskListModal } from "@/features/tasks/components/TaskListModal";
import { useMattersBoard } from "@/hooks/useMattersBoard";
import {
  createBoard,
  listBoards,
  removeBoard,
  saveBoard
} from "@/services/boards";
import type { BoardSettings } from "@/types/api";
import type { Matter, MatterStage, PracticeBoard } from "@/types/matter";
import { DEFAULT_STAGE_LABELS, STAGES, createStageLabelMap, getStageLabel } from "@/utils/stages";

const DEFAULT_BOARD: PracticeBoard = {
  id: "probate",
  name: "Probate",
  columnCount: 5,
  stageLabels: { ...DEFAULT_STAGE_LABELS }
};

export function BoardPage() {
  const [boards, setBoards] = useState<PracticeBoard[]>([DEFAULT_BOARD]);
  const [currentBoardId, setCurrentBoardId] = useState(DEFAULT_BOARD.id);
  const [isBoardsOpen, setIsBoardsOpen] = useState(false);
  const [boardActionError, setBoardActionError] = useState<string | null>(null);
  const currentBoard = boards.find((board) => board.id === currentBoardId) ?? DEFAULT_BOARD;
  const board = useMattersBoard(currentBoard.id);
  const { setHeaderToolbar, setSidebarContent } = useAppChrome();
  const [draggingMatterId, setDraggingMatterId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<MatterStage | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const stageLabels = createStageLabelMap(currentBoard.stageLabels);

  function captureFocusOrigin() {
    const activeElement = document.activeElement;
    lastFocusedElementRef.current =
      activeElement instanceof HTMLElement ? activeElement : null;
  }

  function restoreFocusOrigin() {
    lastFocusedElementRef.current?.focus();
  }

  async function handleOpenTaskList() {
    captureFocusOrigin();
    await board.openTaskList();
  }

  async function handleOpenArchive() {
    captureFocusOrigin();
    await board.openArchive();
  }

  async function handleOpenStats() {
    captureFocusOrigin();
    await board.openStats();
  }

  function handleOpenBoards() {
    captureFocusOrigin();
    setBoardActionError(null);
    setIsBoardsOpen(true);
  }

  function handleOpenSettings() {
    captureFocusOrigin();
    setIsSettingsOpen(true);
  }

  function handleOpenImport() {
    captureFocusOrigin();
    setIsImportOpen(true);
  }

  function handleOpenCreateMatter() {
    captureFocusOrigin();
    board.openCreateMatter();
  }

  function handleSelectMatter(matterId: string | null) {
    if (matterId) {
      captureFocusOrigin();
    }

    board.selectMatter(matterId);
  }

  useEffect(() => {
    void listBoards()
      .then((items) => {
        setBoards(items);
        setCurrentBoardId((current) =>
          items.some((board) => board.id === current) ? current : (items[0]?.id ?? DEFAULT_BOARD.id)
        );
      })
      .catch(() => {
        setBoards([DEFAULT_BOARD]);
        setCurrentBoardId(DEFAULT_BOARD.id);
      });
  }, []);

  const searchResults = [
    ...board.filteredMatters.slice(0, 6).map((matter) => ({
      id: matter.id,
      title: matter.decedentName,
      subtitle: `${matter.clientName} | ${matter.fileNumber}`,
      meta: "Active matter",
      onSelect: () => {
        handleSelectMatter(matter.id);
        board.setSearchTerm("");
      }
    })),
    ...board.filteredArchivedMatters.slice(0, 4).map((matter) => ({
      id: matter.id,
      title: matter.decedentName,
      subtitle: `${matter.clientName} | ${matter.fileNumber}`,
      meta: "Archived matter",
      tone: "archived" as const,
      onSelect: () => void handleOpenArchive()
    }))
  ];

  useEffect(() => {
    setHeaderToolbar(
      <>
        <SearchField
          value={board.searchTerm}
          onChange={board.setSearchTerm}
          results={searchResults}
        />
        <button type="button" className="button" onClick={handleOpenCreateMatter}>
          New Case
        </button>
      </>
    );

    setSidebarContent(
      <nav className="sidebar-menu" aria-label="Board actions">
        <button
          type="button"
          className="sidebar-menu__item sidebar-menu__item--primary"
          aria-label="Boards"
          title="Boards"
          onClick={handleOpenBoards}
        >
          <span className="sidebar-menu__icon" aria-hidden="true">
            <svg viewBox="0 0 18 18" fill="none">
              <path
                d="M3.5 4.5h4.5v4.5H3.5zm6 0h4.5v4.5H9.5zm-6 6h4.5v4.5H3.5zm6 0h4.5v4.5H9.5z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>Boards</span>
        </button>
        <button
          type="button"
          className="sidebar-menu__item"
          aria-label="Import"
          title="Import"
          onClick={handleOpenImport}
        >
          <span className="sidebar-menu__icon" aria-hidden="true">
            <svg viewBox="0 0 18 18" fill="none">
              <path
                d="M9 3.5v7M6.5 8l2.5 2.5L11.5 8M4.5 13.5h9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>Import</span>
        </button>
        <button
          type="button"
          className="sidebar-menu__item"
          aria-label="Tasks"
          title="Tasks"
          onClick={() => void handleOpenTaskList()}
        >
          <span className="sidebar-menu__icon" aria-hidden="true">
            <svg viewBox="0 0 18 18" fill="none">
              <path
                d="M5 4.5h8M5 9h8M5 13.5h8M3.5 4.5h.01M3.5 9h.01M3.5 13.5h.01"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>Tasks</span>
        </button>
        <button
          type="button"
          className="sidebar-menu__item"
          aria-label="Archive"
          title="Archive"
          onClick={() => void handleOpenArchive()}
        >
          <span className="sidebar-menu__icon" aria-hidden="true">
            <svg viewBox="0 0 18 18" fill="none">
              <path
                d="M4.5 5.5h9v8h-9zM3.5 5.5h11M6.5 3.5h5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>Archive</span>
        </button>
        <button
          type="button"
          className="sidebar-menu__item"
          aria-label="Stats"
          title="Stats"
          onClick={() => void handleOpenStats()}
        >
          <span className="sidebar-menu__icon" aria-hidden="true">
            <svg viewBox="0 0 18 18" fill="none">
              <path
                d="M4 13.5V9.5M9 13.5V5M14 13.5V7.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>Stats</span>
        </button>
        <button
          type="button"
          className="sidebar-menu__item"
          aria-label="Settings"
          title="Settings"
          onClick={handleOpenSettings}
        >
          <span className="sidebar-menu__icon" aria-hidden="true">
            <svg viewBox="0 0 18 18" fill="none">
              <path
                d="M9 4.25a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Zm0 7.1a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8ZM4.25 9a.9.9 0 1 0 1.8 0 .9.9 0 0 0-1.8 0Zm7.7 0a.9.9 0 1 0 1.8 0 .9.9 0 0 0-1.8 0Z"
                fill="currentColor"
              />
              <path
                d="M9 2.75v1.2M9 14.05v1.2M2.75 9h1.2M14.05 9h1.2M4.58 4.58l.85.85M12.57 12.57l.85.85M4.58 13.42l.85-.85M12.57 5.43l.85-.85"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>Settings</span>
        </button>
      </nav>
    );

    return () => {
      setHeaderToolbar(null);
      setSidebarContent(null);
    };
  }, [
    board.searchTerm,
    board.setSearchTerm,
    searchResults,
    setHeaderToolbar,
    setSidebarContent
  ]);

  return (
    <div className="board-page">
      <section className="board panel">
        {board.isLoading ? (
          <EmptyState
            title="Loading matters"
            message="Loading the current probate board."
          />
        ) : (
          <div
            className="board-grid"
            style={{ "--board-column-count": currentBoard.columnCount } as CSSProperties}
          >
            {STAGES.map((stage) => (
              <BoardColumn
                key={stage}
                stage={stage}
                title={getStageLabel(stage, stageLabels)}
                matters={board.matters.filter((matter) => matter.stage === stage)}
                selectedMatterId={board.selectedMatter?.id ?? null}
                draggingMatterId={draggingMatterId}
                isDragTarget={dragOverStage === stage}
                onSelectMatter={handleSelectMatter}
                onDragStart={(event, matter) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", matter.id);
                  event.dataTransfer.setData("application/caseflow-stage", matter.stage);

                  const dragPreview = event.currentTarget.cloneNode(true) as HTMLElement;
                  const { width, height } = event.currentTarget.getBoundingClientRect();
                  dragPreview.style.width = `${width}px`;
                  dragPreview.style.height = `${height}px`;
                  dragPreview.style.position = "fixed";
                  dragPreview.style.top = "-1000px";
                  dragPreview.style.left = "-1000px";
                  dragPreview.style.opacity = "1";
                  dragPreview.style.pointerEvents = "none";
                  dragPreview.style.transform = "none";
                  dragPreview.style.boxShadow = "0 18px 38px rgba(18, 19, 24, 0.16)";
                  document.body.appendChild(dragPreview);
                  event.dataTransfer.setDragImage(dragPreview, width / 2, 24);
                  requestAnimationFrame(() => document.body.removeChild(dragPreview));

                  setDraggingMatterId(matter.id);
                }}
                onDragEnd={() => {
                  setDraggingMatterId(null);
                  setDragOverStage(null);
                }}
                onStageDragEnter={setDragOverStage}
                onStageDragLeave={(stageToClear) => {
                  if (dragOverStage === stageToClear) {
                    setDragOverStage(null);
                  }
                }}
                onStageDrop={async (nextStage) => {
                  if (!draggingMatterId) {
                    return;
                  }

                  const draggedMatter = board.matters.find(
                    (matter: Matter) => matter.id === draggingMatterId
                  );
                  if (!draggedMatter || draggedMatter.stage === nextStage) {
                    setDraggingMatterId(null);
                    setDragOverStage(null);
                    return;
                  }

                  await board.moveMatter(draggingMatterId, nextStage);
                  setDraggingMatterId(null);
                  setDragOverStage(null);
                }}
              />
            ))}
          </div>
        )}
        {!board.isLoading && board.matters.length === 0 ? (
          <div className="board-empty-inline">
            No active matters are currently on the board.
          </div>
        ) : null}
      </section>

      {(board.isCreateMode || board.selectedMatter) && (
        <MatterDrawer
          matter={board.selectedMatter}
          notes={board.selectedMatterNotes}
          isCreateMode={board.isCreateMode}
          defaultBoardId={currentBoard.id}
          stageLabels={stageLabels}
          onClose={() => {
            board.closeCreateMatter();
            handleSelectMatter(null);
            restoreFocusOrigin();
          }}
          onCreateMatter={board.createMatter}
          onUpdateMatter={board.updateMatter}
          onDeleteMatter={board.deleteMatter}
          onArchiveMatter={board.archiveMatter}
          onAddNote={board.addNote}
        />
      )}

      {board.isTaskListOpen ? (
        <TaskListModal
          tasks={board.tasks}
          onClose={() => {
            board.closeTaskList();
            restoreFocusOrigin();
          }}
          onCompleteTask={board.completeTask}
          onOpenMatter={(matterId) => {
            board.closeTaskList();
            board.selectMatter(matterId);
          }}
        />
      ) : null}

      {board.isArchiveOpen ? (
        <ArchiveModal
          matters={
            board.searchTerm.trim() ? board.filteredArchivedMatters : board.archivedMatters
          }
          error={board.archiveError}
          searchTerm={board.searchTerm}
          onUnarchive={board.unarchiveMatter}
          onClose={() => {
            board.closeArchive();
            restoreFocusOrigin();
          }}
        />
      ) : null}

      {board.isStatsOpen ? (
        <StatsModal
          stats={board.stats}
          error={board.statsError}
          onClose={() => {
            board.closeStats();
            restoreFocusOrigin();
          }}
        />
      ) : null}

      {isBoardsOpen ? (
        <BoardsModal
          boards={boards}
          currentBoardId={currentBoard.id}
          error={boardActionError}
          onSelectBoard={(boardId) => {
            setCurrentBoardId(boardId);
            setIsBoardsOpen(false);
            restoreFocusOrigin();
          }}
          onCreateBoard={async (name) => {
            try {
              const created = await createBoard(name);
              setBoards((current) => [...current, created]);
              setCurrentBoardId(created.id);
              setBoardActionError(null);
            } catch (error) {
              setBoardActionError(
                error instanceof Error ? error.message : "Unable to create board."
              );
            }
          }}
          onDeleteBoard={async (boardId) => {
            try {
              const remainingBoards = await removeBoard(boardId);
              setBoards(remainingBoards);
              setCurrentBoardId((current) =>
                current === boardId ? (remainingBoards[0]?.id ?? DEFAULT_BOARD.id) : current
              );
              setBoardActionError(null);
            } catch (error) {
              setBoardActionError(
                error instanceof Error ? error.message : "Unable to delete board."
              );
            }
          }}
          onClose={() => {
            setIsBoardsOpen(false);
            restoreFocusOrigin();
          }}
        />
      ) : null}

      {isSettingsOpen ? (
        <SettingsModal
          boardSettings={{
            columnCount: currentBoard.columnCount,
            stageLabels: currentBoard.stageLabels
          }}
          onSave={async (nextSettings) => {
            const savedBoard = await saveBoard(currentBoard.id, {
              columnCount: nextSettings.columnCount,
              stageLabels: nextSettings.stageLabels
            });
            setBoards((current) =>
              current.map((board) => (board.id === savedBoard.id ? savedBoard : board))
            );
          }}
          onClose={() => {
            setIsSettingsOpen(false);
            restoreFocusOrigin();
          }}
        />
      ) : null}

      {isImportOpen ? (
        <ImportModal
          boardName={currentBoard.name}
          stageLabels={stageLabels}
          onImport={(preview) => board.importMatters(preview.rows)}
          onClose={() => {
            setIsImportOpen(false);
            restoreFocusOrigin();
          }}
        />
      ) : null}
    </div>
  );
}
