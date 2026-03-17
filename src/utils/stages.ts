import type { MatterStage } from "@/types/matter";

export const STAGES: MatterStage[] = [
  "intake",
  "qualified_opened",
  "notice_admin",
  "inventory_collection",
  "accounting_closing",
  "closed"
];

const labels: Record<MatterStage, string> = {
  intake: "Intake",
  qualified_opened: "Qualified / Opened",
  notice_admin: "Notice / Admin",
  inventory_collection: "Inventory / Collection",
  accounting_closing: "Accounting / Closing",
  closed: "Closed"
};

export function formatStageLabel(stage: MatterStage): string {
  return labels[stage];
}
