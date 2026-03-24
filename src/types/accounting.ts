export type ProbateAccountingType = "annual" | "final";

export type ProbateAccountingStatus = "draft" | "review_ready";

export type ProbateAccountingEntryType = "receipt" | "disbursement" | "distribution";

export type ProbateAccountingAssetType =
  | "bank"
  | "securities"
  | "tangible_personal_property"
  | "real_estate_willed_not_sold"
  | "real_estate_acquired"
  | "other";

export type ProbateAccountingReadinessIssueCode =
  | "county_missing"
  | "file_number_missing"
  | "decedent_name_missing"
  | "fiduciary_name_missing"
  | "fiduciary_address_missing"
  | "period_start_missing"
  | "period_end_missing"
  | "period_range_invalid"
  | "ledger_empty"
  | "loss_explanation_missing"
  | "entry_date_missing"
  | "entry_party_missing"
  | "entry_description_missing"
  | "entry_amount_invalid"
  | "entry_proof_missing"
  | "asset_description_missing"
  | "asset_amount_invalid"
  | "asset_proof_missing"
  | "annual_balance_mismatch"
  | "final_balance_nonzero"
  | "final_assets_present";

export type ProbateAccountingMatterOption = {
  id: string;
  label: string;
  boardName: string | null;
  archived: boolean;
  decedentName: string;
  fileNumber: string;
  clientName: string;
};

export type ProbateAccountingLedgerEntry = {
  id: string;
  entryType: ProbateAccountingEntryType;
  entryDate: string | null;
  partyName: string;
  description: string;
  amountCents: number;
  proofReference: string;
  sortOrder: number;
};

export type ProbateAccountingAssetRow = {
  id: string;
  assetType: ProbateAccountingAssetType;
  description: string;
  amountCents: number;
  proofReference: string;
  sortOrder: number;
};

export type ProbateAccountingInput = {
  matterId: string | null;
  accountType: ProbateAccountingType;
  status: ProbateAccountingStatus;
  county: string;
  fileNumber: string;
  decedentName: string;
  fiduciaryName: string;
  fiduciaryAddress: string;
  coFiduciaryName: string;
  coFiduciaryAddress: string;
  dateOfDeath: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  openingPersonalPropertyCents: number;
  lossFromSaleCents: number;
  lossExplanation: string;
  entries: ProbateAccountingLedgerEntry[];
  assets: ProbateAccountingAssetRow[];
};

export type ProbateAccountingTotals = {
  openingSubtotalCents: number;
  lossFromSaleCents: number;
  line3SubtotalCents: number;
  receiptsTotalCents: number;
  line5SubtotalCents: number;
  disbursementsTotalCents: number;
  line7SubtotalCents: number;
  distributionsTotalCents: number;
  line9BalanceCents: number;
  partIiTotalCents: number;
};

export type ProbateAccountingReadinessIssue = {
  code: ProbateAccountingReadinessIssueCode;
  message: string;
};

export type ProbateAccountingComputed = {
  totals: ProbateAccountingTotals;
  readinessIssues: ProbateAccountingReadinessIssue[];
  isReviewReady: boolean;
};

export type ProbateAccountingSummary = {
  id: string;
  matterId: string | null;
  linkedMatterLabel: string | null;
  accountType: ProbateAccountingType;
  status: ProbateAccountingStatus;
  county: string;
  fileNumber: string;
  decedentName: string;
  fiduciaryName: string;
  periodStart: string | null;
  periodEnd: string | null;
  updatedAt: string;
  line9BalanceCents: number;
};

export type ProbateAccountingDetail = ProbateAccountingInput & {
  id: string;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
  matterOptions: ProbateAccountingMatterOption[];
  computed: ProbateAccountingComputed;
};
