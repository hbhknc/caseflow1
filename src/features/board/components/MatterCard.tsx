import { useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/dates";
import { STAGES, formatStageLabel } from "@/utils/stages";
import type { Matter, MatterStage } from "@/types/matter";

type MatterCardProps = {
  matter: Matter;
  isSelected: boolean;
  onSelect: () => void;
  onMoveMatter: (matterId: string, stage: MatterStage) => Promise<void>;
};

export function MatterCard({
  matter,
  isSelected,
  onSelect,
  onMoveMatter
}: MatterCardProps) {
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
  const moveMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMoveMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!moveMenuRef.current?.contains(event.target as Node)) {
        setIsMoveMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMoveMenuOpen]);

  return (
    <article
      className={isSelected ? "matter-card matter-card--selected" : "matter-card"}
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
      <div className="matter-card__actions" ref={moveMenuRef}>
        <button
          type="button"
          className="matter-card__move-button"
          aria-expanded={isMoveMenuOpen}
          onClick={() => setIsMoveMenuOpen((current) => !current)}
        >
          Move Matter
        </button>
        {isMoveMenuOpen ? (
          <div className="matter-card__move-menu" role="menu" aria-label="Move matter">
            {STAGES.filter((stage) => stage !== matter.stage).map((stage) => (
              <button
                key={stage}
                type="button"
                className="matter-card__move-option"
                onClick={async () => {
                  setIsMoveMenuOpen(false);
                  await onMoveMatter(matter.id, stage);
                }}
              >
                {formatStageLabel(stage)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
