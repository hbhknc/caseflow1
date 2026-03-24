import { describe, expect, it } from "vitest";
import type {
  AccountingPeriod,
  HeldAsset,
  LedgerEntry
} from "@/types/accounting";
import {
  ACCOUNTING_FORM_VERSION_SWITCH_DATE,
  CURRENT_ACCOUNTING_FORM_VERSION_LABEL,
  WORKSHEET_ENTRY_PAGE_SIZE,
  buildAccountingTotals,
  buildAccountingValidationIssues,
  buildAccountingWorksheet,
  getAccountingFormVersionInfo
} from "@/lib/accountingRules";

function createPeriod(overrides: Partial<AccountingPeriod> = {}): AccountingPeriod {
  return {
    id: "period_001",
    matterId: "matter_001",
    accountType: "annual",
    accountingPeriodStart: "2026-01-01",
    accountingPeriodEnd: "2026-12-31",
    dateOfDeath: "2026-01-15",
    county: "Wake",
    fileNumber: "26 E 123",
    estateType: "decedent",
    formVersionLabel: CURRENT_ACCOUNTING_FORM_VERSION_LABEL,
    beginningPersonalPropertyValue: 1000,
    lossFromSaleAmount: 100,
    lossExplanation: "Sold an asset below inventory value.",
    isLocked: false,
    createdBy: "Probate Team",
    lockedAt: null,
    lockedBy: null,
    createdAt: "2026-01-20T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
    ...overrides
  };
}

function createEntry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: "entry_001",
    accountingPeriodId: "period_001",
    entryType: "receipt",
    entryDate: "2026-03-01",
    partyName: "First Citizens",
    description: "Interest",
    amount: 250,
    category: "Income",
    notes: null,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    ...overrides
  };
}

function createHeldAsset(overrides: Partial<HeldAsset> = {}): HeldAsset {
  return {
    id: "asset_001",
    accountingPeriodId: "period_001",
    assetType: "bank_deposit",
    institutionOrDescription: "Estate checking",
    value: 850,
    notes: null,
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-01T10:00:00.000Z",
    ...overrides
  };
}

describe("buildAccountingTotals", () => {
  it("calculates summary math across receipts, disbursements, and distributions", () => {
    const totals = buildAccountingTotals(
      createPeriod(),
      [
        createEntry({ entryType: "receipt", amount: 250 }),
        createEntry({ id: "entry_002", entryType: "disbursement", amount: 200 }),
        createEntry({ id: "entry_003", entryType: "distribution", amount: 100 })
      ],
      [createHeldAsset()]
    );

    expect(totals.beginningBalance).toBe(1000);
    expect(totals.subtotalAfterLoss).toBe(900);
    expect(totals.totalReceipts).toBe(250);
    expect(totals.totalAssets).toBe(1150);
    expect(totals.totalDisbursements).toBe(200);
    expect(totals.subtotalBeforeDistributions).toBe(950);
    expect(totals.totalDistributions).toBe(100);
    expect(totals.endingBalance).toBe(850);
    expect(totals.totalHeldAssets).toBe(850);
    expect(totals.reconciliationDelta).toBe(0);
    expect(totals.isReconciled).toBe(true);
  });
});

describe("buildAccountingValidationIssues", () => {
  it("flags final accounts with non-zero ending balances", () => {
    const issues = buildAccountingValidationIssues({
      period: createPeriod({ accountType: "final" }),
      entries: [],
      heldAssets: []
    });

    expect(issues.map((issue) => issue.code)).toContain("final_balance_non_zero");
  });

  it("flags annual accounts that have a remaining balance but no held-asset detail", () => {
    const issues = buildAccountingValidationIssues({
      period: createPeriod(),
      entries: [],
      heldAssets: []
    });

    expect(issues.map((issue) => issue.code)).toContain("annual_missing_held_assets");
  });

  it("flags held-asset totals that do not reconcile to the ending balance", () => {
    const issues = buildAccountingValidationIssues({
      period: createPeriod(),
      entries: [],
      heldAssets: [createHeldAsset({ value: 700 })]
    });

    expect(issues.map((issue) => issue.code)).toContain("held_assets_not_reconciled");
  });

  it("flags entry dates outside the accounting period", () => {
    const issues = buildAccountingValidationIssues({
      period: createPeriod(),
      entries: [createEntry({ entryDate: "2027-01-02" })],
      heldAssets: [createHeldAsset()]
    });

    expect(issues.map((issue) => issue.code)).toContain("entry_date_outside_period");
  });

  it("flags negative or invalid amounts", () => {
    const issues = buildAccountingValidationIssues({
      period: createPeriod({ beginningPersonalPropertyValue: -1, lossFromSaleAmount: -5 }),
      entries: [createEntry({ amount: -25 })],
      heldAssets: [createHeldAsset({ value: 0 })]
    });

    expect(issues.filter((issue) => issue.code === "invalid_amount")).toHaveLength(4);
  });

  it("warns when the current form version may not apply based on date of death", () => {
    const issues = buildAccountingValidationIssues({
      period: createPeriod({ dateOfDeath: "2012-12-31" }),
      entries: [],
      heldAssets: []
    });

    expect(issues.map((issue) => issue.code)).toContain("form_version_warning");
  });
});

describe("getAccountingFormVersionInfo", () => {
  it("keeps the current form version for modern estates and warns for older ones", () => {
    expect(getAccountingFormVersionInfo("2026-01-01")).toEqual({
      formVersionLabel: CURRENT_ACCOUNTING_FORM_VERSION_LABEL,
      warning: null
    });

    expect(getAccountingFormVersionInfo("2012-12-31")).toEqual(
      expect.objectContaining({
        formVersionLabel: CURRENT_ACCOUNTING_FORM_VERSION_LABEL,
        warning: expect.stringContaining(ACCOUNTING_FORM_VERSION_SWITCH_DATE)
      })
    );
  });
});

describe("buildAccountingWorksheet", () => {
  it("creates continuation-page chunks for long entry lists", () => {
    const receipts = Array.from({ length: WORKSHEET_ENTRY_PAGE_SIZE + 3 }, (_, index) =>
      createEntry({
        id: `receipt_${index + 1}`,
        entryType: "receipt",
        entryDate: `2026-03-${String((index % 28) + 1).padStart(2, "0")}`,
        amount: 10 + index
      })
    );

    const worksheet = buildAccountingWorksheet({
      period: createPeriod(),
      entries: receipts,
      heldAssets: []
    });

    expect(worksheet.receiptsPages).toHaveLength(2);
    expect(worksheet.receiptsPages[0]?.lines).toHaveLength(WORKSHEET_ENTRY_PAGE_SIZE);
    expect(worksheet.receiptsPages[1]?.lines).toHaveLength(3);
  });
});
