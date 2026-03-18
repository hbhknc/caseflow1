import type { MatterStage } from "@/types/matter";

export type AppStatus = {
  appName: string;
  runtime: string;
  timestamp: string;
  authMode: string;
};

export type AuthUser = {
  username: string;
};

export type AuthSession = {
  authenticated: boolean;
  user: AuthUser | null;
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
