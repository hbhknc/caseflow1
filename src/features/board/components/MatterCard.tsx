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
  return (
    <article
      className={isSelected ? "matter-card matter-card--selected" : "matter-card"}
    >
      <button type="button" className="matter-card__button" onClick={onSelect}>
        <p className="matter-card__eyebrow">Estate matter</p>
        <div className="matter-card__top">
          <div>
            <h4>{matter.decedentName}</h4>
            <p className="matter-card__client">{matter.clientName}</p>
          </div>
          <span className="matter-card__file">{matter.fileNumber}</span>
        </div>
        <dl className="matter-card__meta">
          <div>
            <dt>Last activity</dt>
            <dd>{formatDate(matter.lastActivityAt)}</dd>
          </div>
          <div>
            <dt>Current stage</dt>
            <dd>{formatStageLabel(matter.stage)}</dd>
          </div>
        </dl>
      </button>
      <label className="matter-card__move">
        <span>Move matter</span>
        <select
          value={matter.stage}
          onChange={(event) =>
            void onMoveMatter(matter.id, event.target.value as MatterStage)
          }
        >
          {STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {formatStageLabel(stage)}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}
