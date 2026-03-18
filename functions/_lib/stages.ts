import type { MatterStage } from "./types";

export const DEFAULT_STAGE_LABELS: Record<MatterStage, string> = {
  intake: "Intake",
  qualified_opened: "Qualified / Opened",
  notice_admin: "Notice / Admin",
  inventory_collection: "Inventory / Collection",
  accounting_closing: "Accounting / Closing"
};

export const STAGE_DEFINITIONS: Array<{ id: MatterStage; label: string }> = [
  { id: "intake", label: DEFAULT_STAGE_LABELS.intake },
  { id: "qualified_opened", label: DEFAULT_STAGE_LABELS.qualified_opened },
  { id: "notice_admin", label: DEFAULT_STAGE_LABELS.notice_admin },
  { id: "inventory_collection", label: DEFAULT_STAGE_LABELS.inventory_collection },
  { id: "accounting_closing", label: DEFAULT_STAGE_LABELS.accounting_closing }
];

export const STAGES: MatterStage[] = STAGE_DEFINITIONS.map((stage) => stage.id);

export const ARCHIVE_READY_STAGE: MatterStage = "accounting_closing";

export function isMatterStage(value: string): value is MatterStage {
  return STAGES.includes(value as MatterStage);
}
