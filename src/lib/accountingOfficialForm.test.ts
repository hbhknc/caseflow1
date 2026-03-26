import { describe, expect, it } from "vitest";
import {
  chunkOfficialFormRows,
  formatOfficialAmount,
  formatOfficialDate,
  splitAddressForOfficialForm,
  summarizePartIiAssetsForOfficialForm
} from "@/lib/accountingOfficialForm";

describe("formatOfficialDate", () => {
  it("formats date-only values for the official form", () => {
    expect(formatOfficialDate("2026-03-25")).toBe("03/25/2026");
    expect(formatOfficialDate(null)).toBe("");
  });
});

describe("splitAddressForOfficialForm", () => {
  it("splits multiline addresses into line, city, state, and zip parts", () => {
    expect(
      splitAddressForOfficialForm("451 Glenwood Ave\nSuite 200\nRaleigh, NC 27603")
    ).toEqual({
      line1: "451 Glenwood Ave",
      line2: "Suite 200",
      city: "Raleigh",
      state: "NC",
      zip: "27603"
    });
  });

  it("parses single-line street, city, state, and zip addresses", () => {
    expect(splitAddressForOfficialForm("123 Main St, Raleigh, NC 27601")).toEqual({
      line1: "123 Main St",
      line2: "",
      city: "Raleigh",
      state: "NC",
      zip: "27601"
    });
  });
});

describe("chunkOfficialFormRows", () => {
  it("keeps base rows separate from continuation attachments", () => {
    const rows = Array.from({ length: 13 }, (_, index) => index + 1);

    expect(chunkOfficialFormRows(rows, 10, 34)).toEqual({
      baseRows: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      attachments: [[11, 12, 13]]
    });
  });
});

describe("summarizePartIiAssetsForOfficialForm", () => {
  it("groups bank rows and aggregates category totals", () => {
    const result = summarizePartIiAssetsForOfficialForm([
      {
        id: "a1",
        assetType: "bank",
        description: "Capital Bank",
        amountCents: 10000,
        proofReference: "",
        sortOrder: 1
      },
      {
        id: "a2",
        assetType: "bank",
        description: "First Citizen",
        amountCents: 20000,
        proofReference: "",
        sortOrder: 2
      },
      {
        id: "a3",
        assetType: "bank",
        description: "PNC",
        amountCents: 30000,
        proofReference: "",
        sortOrder: 3
      },
      {
        id: "a4",
        assetType: "bank",
        description: "Truist",
        amountCents: 40000,
        proofReference: "",
        sortOrder: 4
      },
      {
        id: "a5",
        assetType: "securities",
        description: "Brokerage",
        amountCents: 25000,
        proofReference: "",
        sortOrder: 5
      }
    ]);

    expect(result.bankLines).toEqual([
      { description: "Capital Bank", balanceCents: 10000 },
      { description: "First Citizen", balanceCents: 20000 },
      { description: "PNC; Truist", balanceCents: 70000 }
    ]);
    expect(result.securitiesTotalCents).toBe(25000);
    expect(result.personalPropertySubtotalCents).toBe(125000);
    expect(result.totalBalanceHeldOrInvestedCents).toBe(125000);
  });
});

describe("formatOfficialAmount", () => {
  it("formats cents without adding a currency symbol", () => {
    expect(formatOfficialAmount(123456)).toBe("1,234.56");
    expect(formatOfficialAmount(0, true)).toBe("");
    expect(formatOfficialAmount(-1234)).toBe("-12.34");
  });
});
