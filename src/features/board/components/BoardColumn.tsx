import type { DragEvent } from "react";
import { MatterCard } from "@/features/board/components/MatterCard";
import { formatStageLabel } from "@/utils/stages";
import type { Matter, MatterStage } from "@/types/matter";

type BoardColumnProps = {
  stage: MatterStage;
  matters: Matter[];
  selectedMatterId: string | null;
  draggingMatterId: string | null;
  isDragTarget: boolean;
  onSelectMatter: (matterId: string) => void;
  onMoveMatter: (matterId: string, stage: MatterStage) => Promise<void>;
  onDragStart: (event: DragEvent<HTMLElement>, matter: Matter) => void;
  onDragEnd: () => void;
  onStageDragEnter: (stage: MatterStage) => void;
  onStageDragLeave: (stage: MatterStage) => void;
  onStageDrop: (stage: MatterStage) => Promise<void>;
};

export function BoardColumn({
  stage,
  matters,
  selectedMatterId,
  draggingMatterId,
  isDragTarget,
  onSelectMatter,
  onMoveMatter,
  onDragStart,
  onDragEnd,
  onStageDragEnter,
  onStageDragLeave,
  onStageDrop
}: BoardColumnProps) {
  return (
    <section
      className={isDragTarget ? "board-column board-column--drag-target" : "board-column"}
      onDragEnter={() => onStageDragEnter(stage)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onStageDragEnter(stage);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onStageDragLeave(stage);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        void onStageDrop(stage);
      }}
    >
      <header className="board-column__header">
        <div className="board-column__title-group">
          <h3>{formatStageLabel(stage)}</h3>
          <p>Probate stage</p>
        </div>
        <span className="board-column__count">{matters.length}</span>
      </header>
      <div className="board-column__body">
        {matters.map((matter) => (
          <MatterCard
            key={matter.id}
            matter={matter}
            isSelected={matter.id === selectedMatterId}
            isDragging={matter.id === draggingMatterId}
            onSelect={() => onSelectMatter(matter.id)}
            onMoveMatter={onMoveMatter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {matters.length === 0 ? (
          <div className="board-column__empty">No matters in this stage.</div>
        ) : null}
      </div>
    </section>
  );
}
