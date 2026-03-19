import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { useAppChrome } from "@/app/AppChrome";
import { EmptyState } from "@/components/EmptyState";
import { SearchField } from "@/components/SearchField";
import { ArchiveModal } from "@/features/archive/components/ArchiveModal";
import { BoardColumn } from "@/features/board/components/BoardColumn";
import { BoardSwitcher } from "@/features/board/components/BoardSwitcher";
import { BoardsModal } from "@/features/board/components/BoardsModal";
import { ImportModal } from "@/features/import/components/ImportModal";
import { MatterDrawer } from "@/features/matters/components/MatterDrawer";
import { QuickNoteModal } from "@/features/notes/components/QuickNoteModal";
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
  const [dropTarget, setDropTarget] = useState<{
    stage: MatterStage;
    beforeMatterId: string | null;
  } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [quickNoteMatterId, setQuickNoteMatterId] = useState<string | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const stageLabels = createStageLabelMap(currentBoard.stageLabels);
  const quickNoteMatter =
    board.matters.find((matter) => matter.id === quickNoteMatterId) ?? null;

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

  async function handleCreateBoard(name: string) {
    const created = await createBoard(name);
    setBoards((current) => [...current, created]);
    setCurrentBoardId(created.id);
    setBoardActionError(null);
  }

  async function handleDeleteBoard(boardId: string) {
    const remainingBoards = await removeBoard(boardId);
    setBoards(remainingBoards);
    setCurrentBoardId((current) =>
      current === boardId ? (remainingBoards[0]?.id ?? DEFAULT_BOARD.id) : current
    );
    setBoardActionError(null);
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

  function handleOpenQuickNote(matterId: string) {
    captureFocusOrigin();
    setQuickNoteMatterId(matterId);
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
      <div className="board-header-toolbar">
        <div className="board-header-toolbar__start">
          <BoardSwitcher
            boards={boards}
            currentBoardId={currentBoard.id}
            onSelectBoard={setCurrentBoardId}
            onCreateBoard={handleCreateBoard}
            onManageBoards={handleOpenBoards}
          />
        </div>
        <div className="board-header-toolbar__center">
          <SearchField
            value={board.searchTerm}
            onChange={board.setSearchTerm}
            results={searchResults}
          />
        </div>
        <div className="board-header-toolbar__end">
          <button
            type="button"
            className="button button--icon"
            aria-label="New Case"
            title="New Case"
            onClick={handleOpenCreateMatter}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>
    );

    setSidebarContent(
      <nav className="sidebar-menu" aria-label="Board actions">
        <button
          type="button"
          className="sidebar-menu__item sidebar-menu__item--primary"
          aria-label="Tasks"
          title="Tasks"
          onClick={() => void handleOpenTaskList()}
        >
          <span className="sidebar-menu__icon" aria-hidden="true">
            <svg viewBox="0 0 18 18" fill="none">
              <path
                d="m3.75 4.8 1.05 1.05 1.7-1.9M8.4 5.15h5.1M3.75 8.85 4.8 9.9 6.5 8M8.4 9.2h5.1M3.75 12.9l1.05 1.05 1.7-1.9M8.4 13.25h5.1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
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
    boards,
    board.searchTerm,
    board.setSearchTerm,
    currentBoard.id,
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
                isDragTarget={dropTarget?.stage === stage}
                dropIndicatorBeforeMatterId={
                  dropTarget?.stage === stage ? dropTarget.beforeMatterId : undefined
                }
                onSelectMatter={handleSelectMatter}
                onQuickNote={handleOpenQuickNote}
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
                  setDropTarget(null);
                }}
                onStageDragEnter={(nextStage) =>
                  setDropTarget((current) =>
                    current?.stage === nextStage
                      ? current
                      : { stage: nextStage, beforeMatterId: null }
                  )
                }
                onStageDragLeave={(stageToClear) => {
                  if (dropTarget?.stage === stageToClear) {
                    setDropTarget(null);
                  }
                }}
                onCardDragOver={(nextStage, beforeMatterId) => {
                  setDropTarget({ stage: nextStage, beforeMatterId });
                }}
                onStageDrop={async (nextStage, beforeMatterId) => {
                  if (!draggingMatterId) {
                    return;
                  }

                  const draggedMatter = board.matters.find(
                    (matter: Matter) => matter.id === draggingMatterId
                  );
                  if (
                    !draggedMatter ||
                    (draggedMatter.stage === nextStage &&
                      (beforeMatterId === draggingMatterId ||
                        beforeMatterId === null &&
                          board.matters
                            .filter((matter) => matter.stage === nextStage)
                            .sort((left, right) => left.sortOrder - right.sortOrder)
                            .at(-1)?.id === draggingMatterId))
                  ) {
                    setDraggingMatterId(null);
                    setDropTarget(null);
                    return;
                  }

                  await board.moveMatter(draggingMatterId, nextStage, beforeMatterId);
                  setDraggingMatterId(null);
                  setDropTarget(null);
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

      {quickNoteMatter ? (
        <QuickNoteModal
          matter={quickNoteMatter}
          onSubmit={(body, addToTaskList) =>
            board.quickAddNote(quickNoteMatter.id, body, addToTaskList)
          }
          onClose={() => {
            setQuickNoteMatterId(null);
            restoreFocusOrigin();
          }}
        />
      ) : null}

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
              await handleCreateBoard(name);
            } catch (error) {
              setBoardActionError(
                error instanceof Error ? error.message : "Unable to create board."
              );
            }
          }}
          onDeleteBoard={async (boardId) => {
            try {
              await handleDeleteBoard(boardId);
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
          onOpenImport={() => {
            setIsSettingsOpen(false);
            handleOpenImport();
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
