import { useEffect, useRef, useState } from "react";
import { useAppChrome } from "@/app/AppChrome";
import { EmptyState } from "@/components/EmptyState";
import { SearchField } from "@/components/SearchField";
import { ArchiveModal } from "@/features/archive/components/ArchiveModal";
import { BoardColumn } from "@/features/board/components/BoardColumn";
import { MatterDrawer } from "@/features/matters/components/MatterDrawer";
import { StatsModal } from "@/features/stats/components/StatsModal";
import { TaskListModal } from "@/features/tasks/components/TaskListModal";
import { useMattersBoard } from "@/hooks/useMattersBoard";
import { STAGES } from "@/utils/stages";
import type { Matter, MatterStage } from "@/types/matter";

export function BoardPage() {
  const board = useMattersBoard();
  const { setHeaderToolbar } = useAppChrome();
  const [draggingMatterId, setDraggingMatterId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<MatterStage | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

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
        <button type="button" className="button button--ghost" onClick={() => void handleOpenTaskList()}>
          <span>Tasks</span>
        </button>
        <button type="button" className="button button--ghost" onClick={() => void handleOpenArchive()}>
          Archive
        </button>
        <button type="button" className="button button--ghost" onClick={() => void handleOpenStats()}>
          Stats
        </button>
        <button type="button" className="button" onClick={handleOpenCreateMatter}>
          <span className="button__icon" aria-hidden="true">
            <svg viewBox="0 0 18 18" fill="none">
              <path
                d="M9 3.5v11M3.5 9h11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>New Case</span>
        </button>
      </>
    );

    return () => setHeaderToolbar(null);
  }, [board.searchTerm, board.setSearchTerm, searchResults, setHeaderToolbar]);

  return (
    <div className="board-page">
      <section className="board panel">
        {board.isLoading ? (
          <EmptyState
            title="Loading matters"
            message="Loading the current probate board."
          />
        ) : (
          <div className="board-grid">
            {STAGES.map((stage) => (
              <BoardColumn
                key={stage}
                stage={stage}
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
    </div>
  );
}
