export type AccountingAccountType = "annual" | "final";

export type AccountingEntryType = "receipt" | "disbursement" | "distribution";

export type HeldAssetType =
  | "bank_deposit"
  | "security"
  | "tangible_personal_property"
  | "real_estate"
  | "other";

export type ProofLinkStatus = "pending" | "received" | "not_required";

export type AccountingEstateType = "decedent" | "minor" | "adult_ward" | "trust";

export type AccountingValidationSeverity = "warning" | "critical";

export type AccountingValidationCode =
  | "required_field_missing"
  | "entry_date_outside_period"
  | "final_balance_non_zero"
  | "annual_missing_held_assets"
  | "held_assets_not_reconciled"
  | "invalid_amount"
  | "form_version_warning";

export type AccountingTotals = {
  beginningBalance: number;
  lossFromSaleAmount: number;
  subtotalAfterLoss: number;
  totalReceipts: number;
  totalAssets: number;
  totalDisbursements: number;
  subtotalBeforeDistributions: number;
  totalDistributions: number;
  endingBalance: number;
  totalHeldAssets: number;
  reconciliationDelta: number;
  isReconciled: boolean;
};

export type AccountingPeriod = {
  id: string;
  matterId: string;
  accountType: AccountingAccountType;
  accountingPeriodStart: string | null;
  accountingPeriodEnd: string | null;
  dateOfDeath: string | null;
  county: string | null;
  fileNumber: string | null;
  estateType: AccountingEstateType | null;
  formVersionLabel: string | null;
  beginningPersonalPropertyValue: number | null;
  lossFromSaleAmount: number | null;
  lossExplanation: string | null;
  isLocked: boolean;
  createdBy: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LedgerEntry = {
  id: string;
  accountingPeriodId: string;
  entryType: AccountingEntryType;
  entryDate: string | null;
  partyName: string | null;
  description: string | null;
  amount: number | null;
  category: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HeldAsset = {
  id: string;
  accountingPeriodId: string;
  assetType: HeldAssetType;
  institutionOrDescription: string | null;
  value: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProofLink = {
  id: string;
  accountingPeriodId: string;
  ledgerEntryId: string | null;
  label: string | null;
  referenceUrl: string | null;
  status: ProofLinkStatus | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountingValidationIssue = {
  id: string;
  accountingPeriodId: string;
  severity: AccountingValidationSeverity;
  code: AccountingValidationCode;
  message: string;
};

export type AccountingWorksheetEntryLine = {
  id: string;
  entryDate: string | null;
  partyName: string | null;
  description: string | null;
  amount: number;
  category: string | null;
  notes: string | null;
};

export type AccountingWorksheetEntryPage = {
  pageNumber: number;
  entryType: AccountingEntryType;
  sectionTitle: string;
  lines: AccountingWorksheetEntryLine[];
  pageTotal: number;
};

export type AccountingWorksheetHeldAssetGroup = {
  assetType: HeldAssetType;
  label: string;
  totalValue: number;
  items: HeldAsset[];
};

export type AccountingWorksheet = {
  formNumber: "AOC-E-506";
  formVersionLabel: string;
  formVersionWarning: string | null;
  matterName: string | null;
  accountType: AccountingAccountType;
  accountingPeriodStart: string | null;
  accountingPeriodEnd: string | null;
  dateOfDeath: string | null;
  county: string | null;
  fileNumber: string | null;
  estateType: AccountingEstateType | null;
  summary: AccountingTotals;
  heldAssetGroups: AccountingWorksheetHeldAssetGroup[];
  receiptsPages: AccountingWorksheetEntryPage[];
  disbursementsPages: AccountingWorksheetEntryPage[];
  distributionsPages: AccountingWorksheetEntryPage[];
};

export type AccountingPeriodSummary = AccountingPeriod & {
  totals: AccountingTotals;
  criticalIssueCount: number;
  warningIssueCount: number;
  proofCount: number;
};

export type AccountingPeriodDetail = {
  period: AccountingPeriod;
  entries: LedgerEntry[];
  heldAssets: HeldAsset[];
  proofLinks: ProofLink[];
  totals: AccountingTotals;
  validationIssues: AccountingValidationIssue[];
  worksheet: AccountingWorksheet;
};

export type AccountingPeriodInput = {
  matterId: string;
  accountType: AccountingAccountType;
  accountingPeriodStart: string | null;
  accountingPeriodEnd: string | null;
  dateOfDeath: string | null;
  county: string | null;
  fileNumber: string | null;
  estateType: AccountingEstateType | null;
  formVersionLabel: string | null;
  beginningPersonalPropertyValue: number | null;
  lossFromSaleAmount: number | null;
  lossExplanation: string | null;
};

export type AccountingPeriodUpdateInput = Omit<AccountingPeriodInput, "matterId">;

export type LedgerEntryInput = {
  accountingPeriodId: string;
  entryType: AccountingEntryType;
  entryDate: string | null;
  partyName: string | null;
  description: string | null;
  amount: number | null;
  category: string | null;
  notes: string | null;
};

export type LedgerEntryUpdateInput = Omit<LedgerEntryInput, "accountingPeriodId">;

export type HeldAssetInput = {
  accountingPeriodId: string;
  assetType: HeldAssetType;
  institutionOrDescription: string | null;
  value: number | null;
  notes: string | null;
};

export type HeldAssetUpdateInput = Omit<HeldAssetInput, "accountingPeriodId">;

export type ProofLinkInput = {
  accountingPeriodId: string;
  ledgerEntryId: string | null;
  label: string | null;
  referenceUrl: string | null;
  status: ProofLinkStatus | null;
  notes: string | null;
};

export type ProofLinkUpdateInput = Omit<ProofLinkInput, "accountingPeriodId">;
