import { MatterCard } from "@/features/board/components/MatterCard";
import { formatStageLabel } from "@/utils/stages";
import type { Matter, MatterStage } from "@/types/matter";

type BoardColumnProps = {
  stage: MatterStage;
  matters: Matter[];
  selectedMatterId: string | null;
  onSelectMatter: (matterId: string) => void;
  onMoveMatter: (matterId: string, stage: MatterStage) => Promise<void>;
};

export function BoardColumn({
  stage,
  matters,
  selectedMatterId,
  onSelectMatter,
  onMoveMatter
}: BoardColumnProps) {
  return (
    <section className="board-column">
      <header className="board-column__header">
        <div>
          <h3>{formatStageLabel(stage)}</h3>
          <p>{matters.length} matters</p>
        </div>
      </header>
      <div className="board-column__body">
        {matters.map((matter) => (
          <MatterCard
            key={matter.id}
            matter={matter}
            isSelected={matter.id === selectedMatterId}
            onSelect={() => onSelectMatter(matter.id)}
            onMoveMatter={onMoveMatter}
          />
        ))}
        {matters.length === 0 ? (
          <div className="board-column__empty">No matters in this stage.</div>
        ) : null}
      </div>
    </section>
  );
}

