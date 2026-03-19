import type { DragEvent } from "react";
import { MatterCard } from "@/features/board/components/MatterCard";
import type { Matter, MatterStage } from "@/types/matter";

type BoardColumnProps = {
  stage: MatterStage;
  title: string;
  matters: Matter[];
  selectedMatterId: string | null;
  draggingMatterId: string | null;
  isDragTarget: boolean;
  dropIndicatorBeforeMatterId?: string | null;
  onSelectMatter: (matterId: string) => void;
  onQuickNote: (matterId: string) => void;
  onDragStart: (event: DragEvent<HTMLElement>, matter: Matter) => void;
  onDragEnd: () => void;
  onStageDragEnter: (stage: MatterStage) => void;
  onStageDragLeave: (stage: MatterStage) => void;
  onCardDragOver: (stage: MatterStage, beforeMatterId: string | null) => void;
  onStageDrop: (stage: MatterStage, beforeMatterId: string | null) => Promise<void>;
};

export function BoardColumn({
  stage,
  title,
  matters,
  selectedMatterId,
  draggingMatterId,
  isDragTarget,
  dropIndicatorBeforeMatterId,
  onSelectMatter,
  onQuickNote,
  onDragStart,
  onDragEnd,
  onStageDragEnter,
  onStageDragLeave,
  onCardDragOver,
  onStageDrop
}: BoardColumnProps) {
  function getNextBeforeMatterId(index: number) {
    for (let nextIndex = index + 1; nextIndex < matters.length; nextIndex += 1) {
      const nextMatter = matters[nextIndex];
      if (nextMatter.id !== draggingMatterId) {
        return nextMatter.id;
      }
    }

    return null;
  }

  return (
    <section
      className={isDragTarget ? "board-column board-column--drag-target" : "board-column"}
      onDragEnter={() => onStageDragEnter(stage)}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onStageDragLeave(stage);
        }
      }}
    >
      <header className="board-column__header">
        <div className="board-column__title-group">
          <div className="board-column__heading">
            <h3>{title}</h3>
            <span className="board-column__count">{matters.length}</span>
          </div>
        </div>
      </header>
      <div
        className="board-column__body"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          onStageDragEnter(stage);
          onCardDragOver(stage, null);
        }}
        onDrop={(event) => {
          event.preventDefault();
          void onStageDrop(stage, null);
        }}
      >
        {matters.map((matter, index) => (
          <div
            key={matter.id}
            className={
              dropIndicatorBeforeMatterId === matter.id
                ? "board-column__card-slot board-column__card-slot--drop-before"
                : "board-column__card-slot"
            }
            onDragOver={(event) => {
              if (matter.id === draggingMatterId) {
                return;
              }

              event.preventDefault();
              event.stopPropagation();
              event.dataTransfer.dropEffect = "move";
              onStageDragEnter(stage);
              const cardRect = event.currentTarget.getBoundingClientRect();
              const insertBefore = event.clientY < cardRect.top + cardRect.height / 2;
              onCardDragOver(
                stage,
                insertBefore ? matter.id : getNextBeforeMatterId(index)
              );
            }}
            onDrop={(event) => {
              if (matter.id === draggingMatterId) {
                return;
              }

              event.preventDefault();
              event.stopPropagation();
              const cardRect = event.currentTarget.getBoundingClientRect();
              const insertBefore = event.clientY < cardRect.top + cardRect.height / 2;
              void onStageDrop(
                stage,
                insertBefore ? matter.id : getNextBeforeMatterId(index)
              );
            }}
          >
            <MatterCard
              matter={matter}
              isSelected={matter.id === selectedMatterId}
              isDragging={matter.id === draggingMatterId}
              onSelect={() => onSelectMatter(matter.id)}
              onQuickNote={() => onQuickNote(matter.id)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          </div>
        ))}
        {isDragTarget && dropIndicatorBeforeMatterId === null && matters.length > 0 ? (
          <div className="board-column__drop-indicator" />
        ) : null}
        {matters.length === 0 ? (
          <div className="board-column__empty">No matters in this stage.</div>
        ) : null}
      </div>
    </section>
  );
}
