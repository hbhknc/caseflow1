import { isValidDateOnly } from "@/lib/deadlineRules";
import type {
  ProbateAccountingAssetRow,
  ProbateAccountingAssetType,
  ProbateAccountingComputed,
  ProbateAccountingEntryType,
  ProbateAccountingInput,
  ProbateAccountingLedgerEntry,
  ProbateAccountingReadinessIssue,
  ProbateAccountingStatus,
  ProbateAccountingTotals,
  ProbateAccountingType
} from "@/types/accounting";

export const PROBATE_ACCOUNTING_TYPE_LABELS: Record<ProbateAccountingType, string> = {
  annual: "Annual Account",
  final: "Final Account"
};

export const PROBATE_ACCOUNTING_STATUS_LABELS: Record<ProbateAccountingStatus, string> = {
  draft: "Draft",
  review_ready: "Review Ready"
};

export const PROBATE_ACCOUNTING_ENTRY_TYPE_LABELS: Record<
  ProbateAccountingEntryType,
  string
> = {
  receipt: "Receipt",
  disbursement: "Disbursement",
  distribution: "Distribution"
};

export const PROBATE_ACCOUNTING_ASSET_TYPE_LABELS: Record<
  ProbateAccountingAssetType,
  string
> = {
  bank: "Bank / Savings",
  securities: "Stocks / Bonds / Securities",
  tangible_personal_property: "Other Personal Property",
  real_estate_willed_not_sold: "Real Estate Willed To Estate And Not Sold",
  real_estate_acquired: "Real Estate Acquired By Estate",
  other: "Other Balance Held / Invested"
};

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeDateOnly(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeCents(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.round(parsed));
}

export function createEmptyProbateAccountingInput(): ProbateAccountingInput {
  return {
    matterId: null,
    accountType: "annual",
    status: "draft",
    county: "",
    fileNumber: "",
    decedentName: "",
    fiduciaryName: "",
    fiduciaryAddress: "",
    coFiduciaryName: "",
    coFiduciaryAddress: "",
    dateOfDeath: null,
    periodStart: null,
    periodEnd: null,
    openingPersonalPropertyCents: 0,
    lossFromSaleCents: 0,
    lossExplanation: "",
    entries: [],
    assets: []
  };
}

export function createEmptyProbateAccountingEntry(
  entryType: ProbateAccountingEntryType,
  sortOrder: number
): ProbateAccountingLedgerEntry {
  return {
    id: crypto.randomUUID(),
    entryType,
    entryDate: null,
    partyName: "",
    description: "",
    amountCents: 0,
    proofReference: "",
    sortOrder
  };
}

export function createEmptyProbateAccountingAsset(
  sortOrder: number
): ProbateAccountingAssetRow {
  return {
    id: crypto.randomUUID(),
    assetType: "bank",
    description: "",
    amountCents: 0,
    proofReference: "",
    sortOrder
  };
}

export function parseCurrencyInputToCents(value: string) {
  const normalized = value.trim().replace(/[$,]/g, "");

  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.round(parsed * 100));
}

export function formatCentsForInput(value: number) {
  return (normalizeCents(value) / 100).toFixed(2);
}

export function formatCurrencyFromCents(value: number) {
  const cents = Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

export function normalizeProbateAccountingInput(
  input: ProbateAccountingInput
): ProbateAccountingInput {
  const normalizedEntries = [...input.entries]
    .map((entry, index) => ({
      ...entry,
      entryDate: normalizeDateOnly(entry.entryDate),
      partyName: normalizeText(entry.partyName),
      description: normalizeText(entry.description),
      proofReference: normalizeText(entry.proofReference),
      amountCents: normalizeCents(entry.amountCents),
      sortOrder: index + 1
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const normalizedAssets = [...input.assets]
    .map((asset, index) => ({
      ...asset,
      description: normalizeText(asset.description),
      proofReference: normalizeText(asset.proofReference),
      amountCents: normalizeCents(asset.amountCents),
      sortOrder: index + 1
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return {
    matterId: input.matterId?.trim() || null,
    accountType: input.accountType,
    status: input.status,
    county: normalizeText(input.county),
    fileNumber: normalizeText(input.fileNumber),
    decedentName: normalizeText(input.decedentName),
    fiduciaryName: normalizeText(input.fiduciaryName),
    fiduciaryAddress: normalizeText(input.fiduciaryAddress),
    coFiduciaryName: normalizeText(input.coFiduciaryName),
    coFiduciaryAddress: normalizeText(input.coFiduciaryAddress),
    dateOfDeath: normalizeDateOnly(input.dateOfDeath),
    periodStart: normalizeDateOnly(input.periodStart),
    periodEnd: normalizeDateOnly(input.periodEnd),
    openingPersonalPropertyCents: normalizeCents(input.openingPersonalPropertyCents),
    lossFromSaleCents: normalizeCents(input.lossFromSaleCents),
    lossExplanation: normalizeText(input.lossExplanation),
    entries: normalizedEntries,
    assets: input.accountType === "final" ? [] : normalizedAssets
  };
}

export function calculateProbateAccountingTotals(
  input: ProbateAccountingInput
): ProbateAccountingTotals {
  const normalized = normalizeProbateAccountingInput(input);
  const sumByEntryType = (entryType: ProbateAccountingEntryType) =>
    normalized.entries
      .filter((entry) => entry.entryType === entryType)
      .reduce((total, entry) => total + entry.amountCents, 0);
  const partIiTotalCents = normalized.assets.reduce(
    (total, asset) => total + asset.amountCents,
    0
  );
  const line3SubtotalCents =
    normalized.openingPersonalPropertyCents - normalized.lossFromSaleCents;
  const receiptsTotalCents = sumByEntryType("receipt");
  const line5SubtotalCents = line3SubtotalCents + receiptsTotalCents;
  const disbursementsTotalCents = sumByEntryType("disbursement");
  const line7SubtotalCents = line5SubtotalCents - disbursementsTotalCents;
  const distributionsTotalCents = sumByEntryType("distribution");
  const line9BalanceCents = line7SubtotalCents - distributionsTotalCents;

  return {
    openingSubtotalCents: normalized.openingPersonalPropertyCents,
    lossFromSaleCents: normalized.lossFromSaleCents,
    line3SubtotalCents,
    receiptsTotalCents,
    line5SubtotalCents,
    disbursementsTotalCents,
    line7SubtotalCents,
    distributionsTotalCents,
    line9BalanceCents,
    partIiTotalCents
  };
}

function collectHeaderIssues(
  normalized: ProbateAccountingInput,
  issues: ProbateAccountingReadinessIssue[]
) {
  if (!normalized.county) {
    issues.push({
      code: "county_missing",
      message: "County is required before the accounting is review ready."
    });
  }

  if (!normalized.fileNumber) {
    issues.push({
      code: "file_number_missing",
      message: "File number is required before the accounting is review ready."
    });
  }

  if (!normalized.decedentName) {
    issues.push({
      code: "decedent_name_missing",
      message: "Decedent name is required before the accounting is review ready."
    });
  }

  if (!normalized.fiduciaryName) {
    issues.push({
      code: "fiduciary_name_missing",
      message: "Fiduciary name is required before the accounting is review ready."
    });
  }

  if (!normalized.fiduciaryAddress) {
    issues.push({
      code: "fiduciary_address_missing",
      message: "Fiduciary address is required before the accounting is review ready."
    });
  }

  if (!normalized.periodStart) {
    issues.push({
      code: "period_start_missing",
      message: "Accounting period start is required before the accounting is review ready."
    });
  }

  if (!normalized.periodEnd) {
    issues.push({
      code: "period_end_missing",
      message: "Accounting period end is required before the accounting is review ready."
    });
  }

  if (
    normalized.periodStart &&
    normalized.periodEnd &&
    isValidDateOnly(normalized.periodStart) &&
    isValidDateOnly(normalized.periodEnd) &&
    normalized.periodEnd < normalized.periodStart
  ) {
    issues.push({
      code: "period_range_invalid",
      message: "Accounting period end cannot be earlier than the period start."
    });
  }

  if (normalized.lossFromSaleCents > 0 && !normalized.lossExplanation) {
    issues.push({
      code: "loss_explanation_missing",
      message: "Add an explanation for the reported loss from sale of personal property."
    });
  }
}

function collectEntryIssues(
  normalized: ProbateAccountingInput,
  issues: ProbateAccountingReadinessIssue[]
) {
  if (normalized.entries.length === 0) {
    issues.push({
      code: "ledger_empty",
      message: "Add at least one ledger entry before marking the accounting review ready."
    });
    return;
  }

  normalized.entries.forEach((entry) => {
    if (!entry.entryDate || !isValidDateOnly(entry.entryDate)) {
      issues.push({
        code: "entry_date_missing",
        message: `Each ${PROBATE_ACCOUNTING_ENTRY_TYPE_LABELS[
          entry.entryType
        ].toLowerCase()} needs a valid date.`
      });
    }

    if (!entry.partyName) {
      issues.push({
        code: "entry_party_missing",
        message: `Each ${PROBATE_ACCOUNTING_ENTRY_TYPE_LABELS[
          entry.entryType
        ].toLowerCase()} needs a party name.`
      });
    }

    if (!entry.description) {
      issues.push({
        code: "entry_description_missing",
        message: `Each ${PROBATE_ACCOUNTING_ENTRY_TYPE_LABELS[
          entry.entryType
        ].toLowerCase()} needs a description.`
      });
    }

    if (entry.amountCents <= 0) {
      issues.push({
        code: "entry_amount_invalid",
        message: `Each ${PROBATE_ACCOUNTING_ENTRY_TYPE_LABELS[
          entry.entryType
        ].toLowerCase()} needs an amount greater than zero.`
      });
    }

    if (
      (entry.entryType === "disbursement" || entry.entryType === "distribution") &&
      !entry.proofReference
    ) {
      issues.push({
        code: "entry_proof_missing",
        message: `Add a proof reference for each ${PROBATE_ACCOUNTING_ENTRY_TYPE_LABELS[
          entry.entryType
        ].toLowerCase()}.`
      });
    }
  });
}

function collectAssetIssues(
  normalized: ProbateAccountingInput,
  issues: ProbateAccountingReadinessIssue[]
) {
  if (normalized.accountType === "final") {
    if (normalized.assets.length > 0) {
      issues.push({
        code: "final_assets_present",
        message: "Final accounts cannot include Part II balance-held rows."
      });
    }

    return;
  }

  normalized.assets.forEach((asset) => {
    if (!asset.description) {
      issues.push({
        code: "asset_description_missing",
        message: "Each Part II balance-held row needs a description."
      });
    }

    if (asset.amountCents <= 0) {
      issues.push({
        code: "asset_amount_invalid",
        message: "Each Part II balance-held row needs an amount greater than zero."
      });
    }

    if (!asset.proofReference) {
      issues.push({
        code: "asset_proof_missing",
        message: "Add a proof reference for each Part II balance-held row."
      });
    }
  });
}

export function getProbateAccountingReadinessIssues(
  input: ProbateAccountingInput
): ProbateAccountingReadinessIssue[] {
  const normalized = normalizeProbateAccountingInput(input);
  const totals = calculateProbateAccountingTotals(normalized);
  const issues: ProbateAccountingReadinessIssue[] = [];

  collectHeaderIssues(normalized, issues);
  collectEntryIssues(normalized, issues);
  collectAssetIssues(normalized, issues);

  if (normalized.accountType === "annual" && totals.partIiTotalCents !== totals.line9BalanceCents) {
    issues.push({
      code: "annual_balance_mismatch",
      message: "Annual accounts require Part II to equal the ending balance on line 9."
    });
  }

  if (normalized.accountType === "final" && totals.line9BalanceCents !== 0) {
    issues.push({
      code: "final_balance_nonzero",
      message: "Final accounts must end with a zero balance on line 9."
    });
  }

  return issues;
}

export function summarizeProbateAccounting(
  input: ProbateAccountingInput
): ProbateAccountingComputed {
  const totals = calculateProbateAccountingTotals(input);
  const readinessIssues = getProbateAccountingReadinessIssues(input);

  return {
    totals,
    readinessIssues,
    isReviewReady: readinessIssues.length === 0
  };
}

export function hasProbateAccountingContentChanges(
  previousInput: ProbateAccountingInput,
  nextInput: ProbateAccountingInput
) {
  const previousNormalized = normalizeProbateAccountingInput(previousInput);
  const nextNormalized = normalizeProbateAccountingInput(nextInput);

  return (
    JSON.stringify({ ...previousNormalized, status: "draft" }) !==
    JSON.stringify({ ...nextNormalized, status: "draft" })
  );
}
