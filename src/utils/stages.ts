import type { MatterStage } from "@/types/matter";

export const STAGE_DEFINITIONS: Array<{ id: MatterStage; label: string }> = [
  { id: "intake", label: "Intake" },
  { id: "qualified_opened", label: "Qualified / Opened" },
  { id: "notice_admin", label: "Notice / Admin" },
  { id: "inventory_collection", label: "Inventory / Collection" },
  { id: "accounting_closing", label: "Accounting / Closing" }
];

export const STAGES: MatterStage[] = STAGE_DEFINITIONS.map((stage) => stage.id);

export const ARCHIVE_READY_STAGE: MatterStage = "accounting_closing";

export function formatStageLabel(stage: MatterStage): string {
  return STAGE_DEFINITIONS.find((definition) => definition.id === stage)?.label ?? stage;
}
