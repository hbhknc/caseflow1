export type AppStatus = {
  appName: string;
  runtime: string;
  timestamp: string;
  authMode: string;
};

export type MatterStats = {
  totalCasesOpened: number;
  totalCasesArchived: number;
  averageCasesOpenedPerYear: number;
  averageCasesArchivedPerYear: number;
  averageCaseLengthDays: number | null;
};
