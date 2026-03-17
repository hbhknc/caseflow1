import { useEffect, useState } from "react";
import { useAppChrome } from "@/app/AppChrome";
import { EmptyState } from "@/components/EmptyState";
import { SearchField } from "@/components/SearchField";
import { BoardColumn } from "@/features/board/components/BoardColumn";
import { MatterDrawer } from "@/features/matters/components/MatterDrawer";
import { TaskListModal } from "@/features/tasks/components/TaskListModal";
import { useMattersBoard } from "@/hooks/useMattersBoard";
import { STAGES } from "@/utils/stages";
import type { Matter, MatterStage } from "@/types/matter";

export function BoardPage() {
  const board = useMattersBoard();
  const { setHeaderToolbar } = useAppChrome();
  const [draggingMatterId, setDraggingMatterId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<MatterStage | null>(null);

  useEffect(() => {
    setHeaderToolbar(
      <>
        <SearchField value={board.searchTerm} onChange={board.setSearchTerm} />
        <button type="button" className="button button--ghost" onClick={() => void board.openTaskList()}>
          <span>Tasks</span>
        </button>
        <button type="button" className="button" onClick={board.openCreateMatter}>
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
  }, [board.searchTerm, board.setSearchTerm, setHeaderToolbar]);

  return (
    <div className="board-page">
      <section className="board panel">
        {board.isLoading ? (
          <EmptyState
            title="Loading matters"
            message="Pulling the latest probate board from the service layer."
          />
        ) : (
          <div className="board-grid">
            {STAGES.map((stage) => (
              <BoardColumn
                key={stage}
                stage={stage}
                matters={board.filteredMatters.filter((matter) => matter.stage === stage)}
                selectedMatterId={board.selectedMatter?.id ?? null}
                draggingMatterId={draggingMatterId}
                isDragTarget={dragOverStage === stage}
                onSelectMatter={board.selectMatter}
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
        {!board.isLoading && board.filteredMatters.length === 0 ? (
          <div className="board-empty-inline">
            No active matters matched the current search. Try a different decedent, client, or file number.
          </div>
        ) : null}
      </section>

      {(board.isCreateMode || board.selectedMatter) && (
        <MatterDrawer
          matter={board.selectedMatter}
          notes={board.selectedMatterNotes}
          isCreateMode={board.isCreateMode}
          onCloseCreateMode={board.closeCreateMatter}
          onClose={() => {
            board.closeCreateMatter();
            board.selectMatter(null);
          }}
          onCreateMatter={board.createMatter}
          onUpdateMatter={board.updateMatter}
          onDeleteMatter={board.deleteMatter}
          onArchiveMatter={board.archiveMatter}
          onAddNote={board.addNote}
        />
      )}

      {board.isTaskListOpen ? (
        <TaskListModal tasks={board.tasks} onClose={board.closeTaskList} />
      ) : null}
    </div>
  );
}
