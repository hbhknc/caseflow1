import type { MatterStage } from "@/types/matter";
import type { MatterImportRowInput } from "@/types/api";

export const IMPORT_TEMPLATE_HEADERS = [
  "decedentName",
  "clientName",
  "fileNumber",
  "stage",
  "createdAt",
  "lastActivityAt"
] as const;

export type ImportTemplateHeader = (typeof IMPORT_TEMPLATE_HEADERS)[number];

export type ParsedImportRow = {
  rowNumber: number;
  decedentName: string;
  clientName: string;
  fileNumber: string;
  stage: string;
  createdAt: string;
  lastActivityAt: string;
};

export type ParsedImportError = {
  rowNumber: number;
  fileNumber: string;
  message: string;
};

export type ParsedImportPreview = {
  rows: MatterImportRowInput[];
  errors: ParsedImportError[];
};

export type StageAliasMap = Record<string, MatterStage>;
