import type { MatterStage } from "./types";

export const STAGE_DEFINITIONS: Array<{ id: MatterStage; label: string }> = [
  { id: "intake", label: "Intake" },
  { id: "qualified_opened", label: "Qualified / Opened" },
  { id: "notice_admin", label: "Notice / Admin" },
  { id: "inventory_collection", label: "Inventory / Collection" },
  { id: "accounting_closing", label: "Accounting / Closing" }
];

export const STAGES: MatterStage[] = STAGE_DEFINITIONS.map((stage) => stage.id);

export const ARCHIVE_READY_STAGE: MatterStage = "accounting_closing";

export function isMatterStage(value: string): value is MatterStage {
  return STAGES.includes(value as MatterStage);
}
