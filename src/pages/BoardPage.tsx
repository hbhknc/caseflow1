import { EmptyState } from "@/components/EmptyState";
import { SearchField } from "@/components/SearchField";
import { BoardColumn } from "@/features/board/components/BoardColumn";
import { MatterDrawer } from "@/features/matters/components/MatterDrawer";
import { useMattersBoard } from "@/hooks/useMattersBoard";
import { STAGES, formatStageLabel } from "@/utils/stages";

export function BoardPage() {
  const board = useMattersBoard();

  return (
    <div className="board-page">
      <section className="toolbar panel">
        <div className="section-heading">
          <h2>Probate Board</h2>
          <p>
            Active probate matters stay visible until they are moved to Closed and archived.
          </p>
        </div>
        <div className="toolbar__actions">
          <SearchField value={board.searchTerm} onChange={board.setSearchTerm} />
          <button type="button" className="button" onClick={board.openCreateMatter}>
            New Case
          </button>
        </div>
      </section>

      {board.error ? (
        <section className="panel">
          <EmptyState title="Unable to load data" message={board.error} />
        </section>
      ) : null}

      <div className="board-layout">
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

        <MatterDrawer
          matter={board.selectedMatter}
          notes={board.selectedMatterNotes}
          isCreateMode={board.isCreateMode}
          onCloseCreateMode={board.closeCreateMatter}
          onCreateMatter={board.createMatter}
          onUpdateMatter={board.updateMatter}
          onDeleteMatter={board.deleteMatter}
          onArchiveMatter={board.archiveMatter}
          onAddNote={board.addNote}
        />
      </div>

      <section className="panel board-legend">
        <div className="section-heading">
          <h2>Workflow Stages</h2>
          <p>These labels are centralized so the board, database, and API stay aligned.</p>
        </div>
        <div className="legend-grid">
          {STAGES.map((stage) => (
            <div key={stage} className="legend-item">
              <strong>{formatStageLabel(stage)}</strong>
              <span>{stage}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

