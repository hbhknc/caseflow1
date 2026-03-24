import { formatDateOnly } from "@/lib/dates";
import {
  getHeldAssetTypeLabel
} from "@/lib/accountingRules";
import type {
  AccountingAccountType,
  AccountingEntryType,
  AccountingEstateType,
  HeldAssetType,
  ProofLinkStatus
} from "@/types/accounting";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export const ESTATE_TYPE_OPTIONS: Array<{
  value: AccountingEstateType;
  label: string;
}> = [
  { value: "decedent", label: "Decedent" },
  { value: "minor", label: "Minor" },
  { value: "adult_ward", label: "Adult ward" },
  { value: "trust", label: "Trust" }
];

export const HELD_ASSET_TYPE_OPTIONS: Array<{
  value: HeldAssetType;
  label: string;
}> = [
  { value: "bank_deposit", label: getHeldAssetTypeLabel("bank_deposit") },
  { value: "security", label: getHeldAssetTypeLabel("security") },
  {
    value: "tangible_personal_property",
    label: getHeldAssetTypeLabel("tangible_personal_property")
  },
  { value: "real_estate", label: getHeldAssetTypeLabel("real_estate") },
  { value: "other", label: getHeldAssetTypeLabel("other") }
];

export const PROOF_STATUS_OPTIONS: Array<{
  value: ProofLinkStatus;
  label: string;
}> = [
  { value: "pending", label: "Pending" },
  { value: "received", label: "Received" },
  { value: "not_required", label: "Not required" }
];

export const ENTRY_CATEGORY_OPTIONS: Record<AccountingEntryType, string[]> = {
  receipt: [
    "Sale proceeds",
    "Refund or reimbursement",
    "Interest or dividend",
    "Deposit transfer",
    "Other receipt"
  ],
  disbursement: [
    "Court costs",
    "Attorney fees",
    "Taxes",
    "Debt payment",
    "Administrative expense",
    "Other expense"
  ],
  distribution: [
    "Cash distribution",
    "In-kind distribution",
    "Real property distribution",
    "Beneficiary advance",
    "Other distribution"
  ]
};

export function formatCurrency(value: number | null | undefined) {
  return currencyFormatter.format(value ?? 0);
}

export function toAmountInputValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : value.toFixed(2);
}

export function formatAccountType(accountType: AccountingAccountType) {
  return accountType === "annual" ? "Annual account" : "Final account";
}

export function formatPeriodRange(start: string | null, end: string | null) {
  if (!start && !end) {
    return "Dates not set";
  }

  if (!start) {
    return `Ends ${formatDateOnly(end)}`;
  }

  if (!end) {
    return `Starts ${formatDateOnly(start)}`;
  }

  return `${formatDateOnly(start)} - ${formatDateOnly(end)}`;
}
