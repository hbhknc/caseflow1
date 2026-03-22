import type { MatterStage } from "@/types/matter";

export type AppStatus = {
  appName: string;
  runtime: string;
  timestamp: string;
  authMode: string;
};

export type CurrentUser = {
  email: string;
  displayName: string | null;
  userId: string | null;
  subject: string | null;
  authSource: "cloudflare-access" | "local-dev-bypass";
};

export type CurrentUserResponse = {
  authenticated: boolean;
  user: CurrentUser | null;
};

export type BoardSettings = {
  columnCount: number;
  stageLabels: Record<MatterStage, string>;
};

export type MatterStats = {
  totalCasesOpened: number;
  totalCasesArchived: number;
  averageCasesOpenedPerYear: number;
  averageCasesArchivedPerYear: number;
  averageCaseLengthDays: number | null;
};

export type MatterImportRowInput = {
  rowNumber: number;
  decedentName: string;
  clientName: string;
  fileNumber: string;
  stage: MatterStage;
  createdAt?: string;
  lastActivityAt?: string;
};

export type MatterImportIssue = {
  rowNumber: number;
  fileNumber: string;
  message: string;
};

export type MatterImportSummary = {
  importedCount: number;
  skippedCount: number;
  invalidCount: number;
  importedFileNumbers: string[];
  skippedRows: MatterImportIssue[];
  invalidRows: MatterImportIssue[];
};
