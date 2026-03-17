import { useEffect } from "react";
import { useAppChrome } from "@/app/AppChrome";
import { EmptyState } from "@/components/EmptyState";
import { SearchField } from "@/components/SearchField";
import { BoardColumn } from "@/features/board/components/BoardColumn";
import { MatterDrawer } from "@/features/matters/components/MatterDrawer";
import { useMattersBoard } from "@/hooks/useMattersBoard";
import { STAGES } from "@/utils/stages";

export function BoardPage() {
  const board = useMattersBoard();
  const { setHeaderToolbar } = useAppChrome();

  useEffect(() => {
    setHeaderToolbar(
      <>
        <SearchField value={board.searchTerm} onChange={board.setSearchTerm} />
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
                onSelectMatter={board.selectMatter}
                onMoveMatter={board.moveMatter}
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
    </div>
  );
}
