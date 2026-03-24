import {
  isValidDateOnly,
  normalizeOptionalDateOnly
} from "@/lib/deadlineRules";
import type {
  AccountingEntryType,
  AccountingPeriod,
  AccountingPeriodDetail,
  AccountingPeriodSummary,
  AccountingTotals,
  AccountingValidationIssue,
  AccountingValidationSeverity,
  AccountingWorksheet,
  AccountingWorksheetEntryLine,
  AccountingWorksheetEntryPage,
  AccountingWorksheetHeldAssetGroup,
  HeldAsset,
  HeldAssetType,
  LedgerEntry,
  ProofLink
} from "@/types/accounting";

export const CURRENT_ACCOUNTING_FORM_VERSION_LABEL = "AOC-E-506 Rev. 6/21";
export const LEGACY_ACCOUNTING_FORM_VERSION_LABEL = "AOC-E-506 Rev. 12/17";
export const ACCOUNTING_FORM_VERSION_SWITCH_DATE = "2013-01-01";
export const WORKSHEET_ENTRY_PAGE_SIZE = 12;

const EPSILON = 0.005;
const ENTRY_TYPE_LABELS: Record<AccountingEntryType, string> = {
  receipt: "Receipts",
  disbursement: "Disbursements",
  distribution: "Distributions"
};
const HELD_ASSET_TYPE_LABELS: Record<HeldAssetType, string> = {
  bank_deposit: "On Deposit in Banks, etc.",
  security: "Invested in Securities, etc.",
  tangible_personal_property: "Tangible Personal Property",
  real_estate: "Real Estate",
  other: "Other"
};
const HELD_ASSET_TYPE_ORDER: HeldAssetType[] = [
  "bank_deposit",
  "security",
  "tangible_personal_property",
  "real_estate",
  "other"
];

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function amountOrZero(value: number | null | undefined) {
  return Number.isFinite(value) ? roundCurrency(Number(value)) : 0;
}

function compareOptionalText(left: string | null | undefined, right: string | null | undefined) {
  return (left ?? "").localeCompare(right ?? "", undefined, {
    sensitivity: "base"
  });
}

function issueSortRank(severity: AccountingValidationSeverity) {
  return severity === "critical" ? 0 : 1;
}

function createIssue(
  accountingPeriodId: string,
  idSuffix: string,
  severity: AccountingValidationSeverity,
  code: AccountingValidationIssue["code"],
  message: string
): AccountingValidationIssue {
  return {
    id: `${accountingPeriodId}:${idSuffix}`,
    accountingPeriodId,
    severity,
    code,
    message
  };
}

function chunkItems<T>(items: T[], size: number) {
  if (size <= 0) {
    return [items];
  }

  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export function getAccountingEntryTypeLabel(entryType: AccountingEntryType) {
  return ENTRY_TYPE_LABELS[entryType];
}

export function getHeldAssetTypeLabel(assetType: HeldAssetType) {
  return HELD_ASSET_TYPE_LABELS[assetType];
}

export function getAccountingFormVersionInfo(dateOfDeath: string | null | undefined) {
  const normalizedDateOfDeath = normalizeOptionalDateOnly(dateOfDeath);

  if (!normalizedDateOfDeath) {
    return {
      formVersionLabel: CURRENT_ACCOUNTING_FORM_VERSION_LABEL,
      warning: null
    };
  }

  if (normalizedDateOfDeath < ACCOUNTING_FORM_VERSION_SWITCH_DATE) {
    return {
      formVersionLabel: CURRENT_ACCOUNTING_FORM_VERSION_LABEL,
      warning:
        "Date of death is before January 1, 2013 (2013-01-01). Review whether AOC-E-506 Rev. 12/17 should be used instead of the current Rev. 6/21 form."
    };
  }

  return {
    formVersionLabel: CURRENT_ACCOUNTING_FORM_VERSION_LABEL,
    warning: null
  };
}

export function sortLedgerEntries(entries: LedgerEntry[]) {
  return [...entries].sort((left, right) => {
    const dateComparison = (left.entryDate ?? "").localeCompare(right.entryDate ?? "");

    if (dateComparison !== 0) {
      return dateComparison;
    }

    const createdComparison = left.createdAt.localeCompare(right.createdAt);

    if (createdComparison !== 0) {
      return createdComparison;
    }

    return compareOptionalText(left.partyName, right.partyName);
  });
}

export function sortHeldAssets(assets: HeldAsset[]) {
  return [...assets].sort((left, right) => {
    const assetTypeComparison =
      HELD_ASSET_TYPE_ORDER.indexOf(left.assetType) - HELD_ASSET_TYPE_ORDER.indexOf(right.assetType);

    if (assetTypeComparison !== 0) {
      return assetTypeComparison;
    }

    return compareOptionalText(
      left.institutionOrDescription,
      right.institutionOrDescription
    );
  });
}

export function buildAccountingTotals(
  period: Pick<
    AccountingPeriod,
    "beginningPersonalPropertyValue" | "lossFromSaleAmount"
  >,
  entries: LedgerEntry[],
  heldAssets: HeldAsset[]
): AccountingTotals {
  const beginningBalance = amountOrZero(period.beginningPersonalPropertyValue);
  const lossFromSaleAmount = amountOrZero(period.lossFromSaleAmount);
  const subtotalAfterLoss = roundCurrency(beginningBalance - lossFromSaleAmount);
  const totalReceipts = roundCurrency(
    entries
      .filter((entry) => entry.entryType === "receipt")
      .reduce((total, entry) => total + amountOrZero(entry.amount), 0)
  );
  const totalAssets = roundCurrency(subtotalAfterLoss + totalReceipts);
  const totalDisbursements = roundCurrency(
    entries
      .filter((entry) => entry.entryType === "disbursement")
      .reduce((total, entry) => total + amountOrZero(entry.amount), 0)
  );
  const subtotalBeforeDistributions = roundCurrency(totalAssets - totalDisbursements);
  const totalDistributions = roundCurrency(
    entries
      .filter((entry) => entry.entryType === "distribution")
      .reduce((total, entry) => total + amountOrZero(entry.amount), 0)
  );
  const endingBalance = roundCurrency(subtotalBeforeDistributions - totalDistributions);
  const totalHeldAssets = roundCurrency(
    heldAssets.reduce((total, asset) => total + amountOrZero(asset.value), 0)
  );
  const reconciliationDelta = roundCurrency(endingBalance - totalHeldAssets);

  return {
    beginningBalance,
    lossFromSaleAmount,
    subtotalAfterLoss,
    totalReceipts,
    totalAssets,
    totalDisbursements,
    subtotalBeforeDistributions,
    totalDistributions,
    endingBalance,
    totalHeldAssets,
    reconciliationDelta,
    isReconciled: Math.abs(reconciliationDelta) < EPSILON
  };
}

export function buildAccountingValidationIssues(input: {
  period: AccountingPeriod;
  entries: LedgerEntry[];
  heldAssets: HeldAsset[];
}): AccountingValidationIssue[] {
  const { period, entries, heldAssets } = input;
  const totals = buildAccountingTotals(period, entries, heldAssets);
  const issues: AccountingValidationIssue[] = [];
  const requiredFields: Array<{ key: string; label: string; value: unknown }> = [
    {
      key: "accounting_period_start",
      label: "Accounting period start date",
      value: period.accountingPeriodStart
    },
    {
      key: "accounting_period_end",
      label: "Accounting period end date",
      value: period.accountingPeriodEnd
    },
    { key: "date_of_death", label: "Date of death", value: period.dateOfDeath },
    { key: "county", label: "County", value: period.county },
    { key: "file_number", label: "File number", value: period.fileNumber },
    { key: "estate_type", label: "Estate type", value: period.estateType },
    { key: "form_version_label", label: "Form version", value: period.formVersionLabel },
    {
      key: "beginning_personal_property_value",
      label: "Beginning personal property value",
      value: period.beginningPersonalPropertyValue
    }
  ];

  for (const field of requiredFields) {
    const value =
      typeof field.value === "string" ? field.value.trim() : field.value;

    if (value === null || value === undefined || value === "") {
      issues.push(
        createIssue(
          period.id,
          `required:${field.key}`,
          "critical",
          "required_field_missing",
          `${field.label} is required.`
        )
      );
    }
  }

  if (
    amountOrZero(period.lossFromSaleAmount) > 0 &&
    !(period.lossExplanation?.trim())
  ) {
    issues.push(
      createIssue(
        period.id,
        "required:loss_explanation",
        "critical",
        "required_field_missing",
        "Loss explanation is required when a loss from sale amount is entered."
      )
    );
  }

  if (
    period.beginningPersonalPropertyValue !== null &&
    period.beginningPersonalPropertyValue < 0
  ) {
    issues.push(
      createIssue(
        period.id,
        "invalid:beginning_balance",
        "critical",
        "invalid_amount",
        "Beginning personal property value cannot be negative."
      )
    );
  }

  if (period.lossFromSaleAmount !== null && period.lossFromSaleAmount < 0) {
    issues.push(
      createIssue(
        period.id,
        "invalid:loss_from_sale",
        "critical",
        "invalid_amount",
        "Loss from sale amount cannot be negative."
      )
    );
  }

  for (const entry of entries) {
    if (!entry.entryDate) {
      issues.push(
        createIssue(
          period.id,
          `entry:${entry.id}:date_required`,
          "critical",
          "required_field_missing",
          `${getAccountingEntryTypeLabel(entry.entryType)} entry is missing a date.`
        )
      );
    }

    if (!entry.partyName?.trim()) {
      issues.push(
        createIssue(
          period.id,
          `entry:${entry.id}:party_required`,
          "critical",
          "required_field_missing",
          `${getAccountingEntryTypeLabel(entry.entryType)} entry is missing a party name.`
        )
      );
    }

    if (!entry.description?.trim()) {
      issues.push(
        createIssue(
          period.id,
          `entry:${entry.id}:description_required`,
          "critical",
          "required_field_missing",
          `${getAccountingEntryTypeLabel(entry.entryType)} entry is missing a description.`
        )
      );
    }

    if (!entry.category?.trim()) {
      issues.push(
        createIssue(
          period.id,
          `entry:${entry.id}:category_required`,
          "critical",
          "required_field_missing",
          `${getAccountingEntryTypeLabel(entry.entryType)} entry is missing a category.`
        )
      );
    }

    if (entry.amount === null || entry.amount === undefined) {
      issues.push(
        createIssue(
          period.id,
          `entry:${entry.id}:amount_required`,
          "critical",
          "required_field_missing",
          `${getAccountingEntryTypeLabel(entry.entryType)} entry is missing an amount.`
        )
      );
    } else if (entry.amount <= 0) {
      issues.push(
        createIssue(
          period.id,
          `entry:${entry.id}:amount_invalid`,
          "critical",
          "invalid_amount",
          `${getAccountingEntryTypeLabel(entry.entryType)} entry amounts must be greater than zero.`
        )
      );
    }

    if (
      entry.entryDate &&
      isValidDateOnly(entry.entryDate) &&
      period.accountingPeriodStart &&
      isValidDateOnly(period.accountingPeriodStart) &&
      period.accountingPeriodEnd &&
      isValidDateOnly(period.accountingPeriodEnd) &&
      (entry.entryDate < period.accountingPeriodStart ||
        entry.entryDate > period.accountingPeriodEnd)
    ) {
      issues.push(
        createIssue(
          period.id,
          `entry:${entry.id}:outside_period`,
          "critical",
          "entry_date_outside_period",
          `${getAccountingEntryTypeLabel(entry.entryType)} entry dated ${entry.entryDate} falls outside the accounting period.`
        )
      );
    }
  }

  for (const asset of heldAssets) {
    if (!asset.institutionOrDescription?.trim()) {
      issues.push(
        createIssue(
          period.id,
          `asset:${asset.id}:description_required`,
          "critical",
          "required_field_missing",
          `${getHeldAssetTypeLabel(asset.assetType)} detail is missing a description.`
        )
      );
    }

    if (asset.value === null || asset.value === undefined) {
      issues.push(
        createIssue(
          period.id,
          `asset:${asset.id}:value_required`,
          "critical",
          "required_field_missing",
          `${getHeldAssetTypeLabel(asset.assetType)} detail is missing a value.`
        )
      );
    } else if (asset.value <= 0) {
      issues.push(
        createIssue(
          period.id,
          `asset:${asset.id}:value_invalid`,
          "critical",
          "invalid_amount",
          "Held asset values must be greater than zero."
        )
      );
    }
  }

  if (period.accountType === "final" && Math.abs(totals.endingBalance) >= EPSILON) {
    issues.push(
      createIssue(
        period.id,
        "final_balance_non_zero",
        "critical",
        "final_balance_non_zero",
        "Final accounts should end with a zero balance."
      )
    );
  }

  if (
    period.accountType === "annual" &&
    totals.endingBalance > 0 &&
    heldAssets.length === 0
  ) {
    issues.push(
      createIssue(
        period.id,
        "annual_missing_held_assets",
        "critical",
        "annual_missing_held_assets",
        "Annual accounts with assets remaining must include held-asset detail."
      )
    );
  }

  if (
    (period.accountType === "annual" || heldAssets.length > 0) &&
    Math.abs(totals.reconciliationDelta) >= EPSILON
  ) {
    issues.push(
      createIssue(
        period.id,
        "held_assets_not_reconciled",
        "critical",
        "held_assets_not_reconciled",
        "Held assets do not reconcile to the ending balance."
      )
    );
  }

  const formVersionInfo = getAccountingFormVersionInfo(period.dateOfDeath);

  if (formVersionInfo.warning) {
    issues.push(
      createIssue(
        period.id,
        "form_version_warning",
        "warning",
        "form_version_warning",
        formVersionInfo.warning
      )
    );
  }

  return issues.sort((left, right) => {
    const severityComparison = issueSortRank(left.severity) - issueSortRank(right.severity);

    if (severityComparison !== 0) {
      return severityComparison;
    }

    return left.message.localeCompare(right.message, undefined, {
      sensitivity: "base"
    });
  });
}

function buildWorksheetEntryLines(entries: LedgerEntry[]): AccountingWorksheetEntryLine[] {
  return sortLedgerEntries(entries).map((entry) => ({
    id: entry.id,
    entryDate: entry.entryDate,
    partyName: entry.partyName,
    description: entry.description,
    amount: amountOrZero(entry.amount),
    category: entry.category,
    notes: entry.notes
  }));
}

function buildWorksheetPages(
  entryType: AccountingEntryType,
  entries: LedgerEntry[],
  pageSize = WORKSHEET_ENTRY_PAGE_SIZE
): AccountingWorksheetEntryPage[] {
  const lines = buildWorksheetEntryLines(entries.filter((entry) => entry.entryType === entryType));

  if (lines.length === 0) {
    return [];
  }

  return chunkItems(lines, pageSize).map((chunk, index) => ({
    pageNumber: index + 1,
    entryType,
    sectionTitle: getAccountingEntryTypeLabel(entryType),
    lines: chunk,
    pageTotal: roundCurrency(chunk.reduce((total, line) => total + line.amount, 0))
  }));
}

function buildHeldAssetGroups(heldAssets: HeldAsset[]): AccountingWorksheetHeldAssetGroup[] {
  const sortedAssets = sortHeldAssets(heldAssets);

  return HELD_ASSET_TYPE_ORDER.map((assetType) => {
    const items = sortedAssets.filter((asset) => asset.assetType === assetType);

    return {
      assetType,
      label: getHeldAssetTypeLabel(assetType),
      totalValue: roundCurrency(
        items.reduce((total, asset) => total + amountOrZero(asset.value), 0)
      ),
      items
    };
  });
}

export function buildAccountingWorksheet(input: {
  period: AccountingPeriod;
  entries: LedgerEntry[];
  heldAssets: HeldAsset[];
  proofLinks?: ProofLink[];
  matterName?: string | null;
}): AccountingWorksheet {
  const { period, entries, heldAssets } = input;
  const totals = buildAccountingTotals(period, entries, heldAssets);
  const formVersionInfo = getAccountingFormVersionInfo(period.dateOfDeath);

  return {
    formNumber: "AOC-E-506",
    formVersionLabel:
      period.formVersionLabel?.trim() || formVersionInfo.formVersionLabel,
    formVersionWarning: formVersionInfo.warning,
    matterName: input.matterName ?? null,
    accountType: period.accountType,
    accountingPeriodStart: period.accountingPeriodStart,
    accountingPeriodEnd: period.accountingPeriodEnd,
    dateOfDeath: period.dateOfDeath,
    county: period.county,
    fileNumber: period.fileNumber,
    estateType: period.estateType,
    summary: totals,
    heldAssetGroups: buildHeldAssetGroups(heldAssets),
    receiptsPages: buildWorksheetPages("receipt", entries),
    disbursementsPages: buildWorksheetPages("disbursement", entries),
    distributionsPages: buildWorksheetPages("distribution", entries)
  };
}

export function buildAccountingPeriodSummary(
  detail: AccountingPeriodDetail
): AccountingPeriodSummary {
  const criticalIssueCount = detail.validationIssues.filter(
    (issue) => issue.severity === "critical"
  ).length;
  const warningIssueCount = detail.validationIssues.filter(
    (issue) => issue.severity === "warning"
  ).length;

  return {
    ...detail.period,
    totals: detail.totals,
    criticalIssueCount,
    warningIssueCount,
    proofCount: detail.proofLinks.length
  };
}
