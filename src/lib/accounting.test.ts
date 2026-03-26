import { describe, expect, it } from "vitest";
import {
  createEmptyProbateAccountingAsset,
  createEmptyProbateAccountingEntry,
  formatCurrencyFromCents,
  hasProbateAccountingContentChanges,
  summarizeProbateAccounting
} from "@/lib/accounting";
import type { ProbateAccountingInput } from "@/types/accounting";

function buildValidAnnualAccounting(): ProbateAccountingInput {
  const receipt = createEmptyProbateAccountingEntry("receipt", 1);
  receipt.entryDate = "2026-01-20";
  receipt.partyName = "Estate Checking";
  receipt.description = "Refund from utility deposit";
  receipt.amountCents = 10000;

  const disbursement = createEmptyProbateAccountingEntry("disbursement", 2);
  disbursement.entryDate = "2026-01-25";
  disbursement.partyName = "Clerk of Superior Court";
  disbursement.description = "Court costs";
  disbursement.amountCents = 6000;
  disbursement.proofReference = "Check 101";

  const asset = createEmptyProbateAccountingAsset(1);
  asset.description = "Estate checking balance";
  asset.amountCents = 104000;
  asset.proofReference = "Statement Jan 31";

  return {
    matterId: "matter_001",
    accountType: "annual",
    status: "draft",
    county: "Wake",
    fileNumber: "24 E 123",
    decedentName: "Alex Carter",
    fiduciaryName: "Jordan Carter",
    fiduciaryAddress: "123 Main St\nRaleigh, NC 27601",
    coFiduciaryName: "",
    coFiduciaryAddress: "",
    dateOfDeath: "2025-12-01",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    openingPersonalPropertyCents: 100000,
    lossFromSaleCents: 0,
    lossExplanation: "",
    entries: [receipt, disbursement],
    assets: [asset]
  };
}

describe("summarizeProbateAccounting", () => {
  it("calculates annual totals and accepts a matching Part II balance", () => {
    const result = summarizeProbateAccounting(buildValidAnnualAccounting());

    expect(result.totals.line3SubtotalCents).toBe(100000);
    expect(result.totals.receiptsTotalCents).toBe(10000);
    expect(result.totals.disbursementsTotalCents).toBe(6000);
    expect(result.totals.line9BalanceCents).toBe(104000);
    expect(result.totals.partIiTotalCents).toBe(104000);
    expect(result.readinessIssues).toHaveLength(0);
    expect(result.isReviewReady).toBe(true);
  });

  it("blocks final accounts that do not end at zero", () => {
    const input = buildValidAnnualAccounting();
    input.accountType = "final";
    input.assets = [];

    const result = summarizeProbateAccounting(input);

    expect(result.readinessIssues.some((issue) => issue.code === "final_balance_nonzero")).toBe(
      true
    );
    expect(result.isReviewReady).toBe(false);
  });

  it("applies the loss-from-sale adjustment before receipt totals", () => {
    const input = buildValidAnnualAccounting();
    input.lossFromSaleCents = 5000;
    input.lossExplanation = "Vehicle sold below inventory value.";
    input.assets[0].amountCents = 99000;

    const result = summarizeProbateAccounting(input);

    expect(result.totals.line3SubtotalCents).toBe(95000);
    expect(result.totals.line5SubtotalCents).toBe(105000);
    expect(result.totals.line9BalanceCents).toBe(99000);
  });

  it("flags missing proof references for disbursements and Part II rows", () => {
    const input = buildValidAnnualAccounting();
    input.entries[1].proofReference = "";
    input.assets[0].proofReference = "";

    const result = summarizeProbateAccounting(input);

    expect(result.readinessIssues.some((issue) => issue.code === "entry_proof_missing")).toBe(
      true
    );
    expect(result.readinessIssues.some((issue) => issue.code === "asset_proof_missing")).toBe(
      true
    );
  });
});

describe("hasProbateAccountingContentChanges", () => {
  it("ignores status-only changes and detects substantive edits", () => {
    const original = buildValidAnnualAccounting();
    const next = {
      ...original,
      status: "review_ready"
    } satisfies ProbateAccountingInput;

    expect(hasProbateAccountingContentChanges(original, next)).toBe(false);

    next.entries = next.entries.map((entry) =>
      entry.entryType === "receipt" ? { ...entry, amountCents: 15000 } : entry
    );

    expect(hasProbateAccountingContentChanges(original, next)).toBe(true);
  });
});

describe("formatCurrencyFromCents", () => {
  it("preserves negative computed balances", () => {
    expect(formatCurrencyFromCents(-1234)).toBe("-$12.34");
  });
});
