import type { MatterStage } from "./types";

export const STAGES: MatterStage[] = [
  "intake",
  "qualified_opened",
  "notice_admin",
  "inventory_collection",
  "accounting_closing",
  "closed"
];

export function isMatterStage(value: string): value is MatterStage {
  return STAGES.includes(value as MatterStage);
}
