import type { DragEvent } from "react";
import { formatDate } from "@/lib/dates";
import type { Matter } from "@/types/matter";

type MatterCardProps = {
  matter: Matter;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onDragStart: (event: DragEvent<HTMLElement>, matter: Matter) => void;
  onDragEnd: () => void;
};

export function MatterCard({
  matter,
  isSelected,
  isDragging,
  onSelect,
  onDragStart,
  onDragEnd
}: MatterCardProps) {
  return (
    <article
      draggable
      className={
        isDragging
          ? "matter-card matter-card--dragging"
          : isSelected
            ? "matter-card matter-card--selected"
            : "matter-card"
      }
      onDragStart={(event) => onDragStart(event, matter)}
      onDragEnd={onDragEnd}
    >
      <button type="button" className="matter-card__button" onClick={onSelect}>
        <div className="matter-card__stack">
          <h4>{matter.decedentName}</h4>
          <p className="matter-card__client">{matter.clientName}</p>
          <p className="matter-card__file-number">{matter.fileNumber}</p>
          <p className="matter-card__activity-line">
            Last activity {formatDate(matter.lastActivityAt)}
          </p>
        </div>
      </button>
    </article>
  );
}
