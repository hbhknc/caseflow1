import type {
  ProbateAccountingAssetRow,
  ProbateAccountingEntryType,
  ProbateAccountingLedgerEntry
} from "@/types/accounting";

export type OfficialFormAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
};

export type OfficialFormBankLine = {
  description: string;
  balanceCents: number;
};

export type OfficialPartIiSummary = {
  bankLines: OfficialFormBankLine[];
  securitiesTotalCents: number;
  tangibleTotalCents: number;
  realEstateWilledNotSoldTotalCents: number;
  realEstateAcquiredTotalCents: number;
  otherTotalCents: number;
  personalPropertySubtotalCents: number;
  totalBalanceHeldOrInvestedCents: number;
};

function normalizeCents(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function normalizeSignedCents(value: number) {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

export function formatOfficialDate(value: string | null) {
  if (!value) {
    return "";
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

export function formatOfficialAmount(valueCents: number, blankWhenZero = false) {
  const cents = normalizeSignedCents(valueCents);

  if (blankWhenZero && cents === 0) {
    return "";
  }

  const formatted = (Math.abs(cents) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return cents < 0 ? `-${formatted}` : formatted;
}

export function splitAddressForOfficialForm(address: string) {
  const lines = address
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      line1: "",
      line2: "",
      city: "",
      state: "",
      zip: ""
    } satisfies OfficialFormAddress;
  }

  const lastLine = lines.at(-1) ?? "";
  const cityStateZipMatch =
    /^(.*?)(?:,)?\s+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/.exec(lastLine);
  let remainingLines = cityStateZipMatch ? lines.slice(0, -1) : lines;
  let city = cityStateZipMatch?.[1]?.trim() ?? "";

  if (cityStateZipMatch && remainingLines.length === 0) {
    const citySegments = city
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (citySegments.length >= 2) {
      city = citySegments.at(-1) ?? "";
      remainingLines = [citySegments.slice(0, -1).join(", ")];
    }
  }

  return {
    line1: remainingLines[0] ?? "",
    line2: remainingLines.slice(1).join(", "),
    city,
    state: cityStateZipMatch?.[2]?.toUpperCase() ?? "",
    zip: cityStateZipMatch?.[3] ?? ""
  } satisfies OfficialFormAddress;
}

export function chunkOfficialFormRows<T>(rows: T[], baseLimit: number, attachmentLimit: number) {
  const baseRows = rows.slice(0, baseLimit);
  const overflowRows = rows.slice(baseLimit);
  const attachments: T[][] = [];

  for (let index = 0; index < overflowRows.length; index += attachmentLimit) {
    attachments.push(overflowRows.slice(index, index + attachmentLimit));
  }

  return {
    baseRows,
    attachments
  };
}

export function summarizePartIiAssetsForOfficialForm(
  assets: ProbateAccountingAssetRow[]
): OfficialPartIiSummary {
  const bankAssets = assets.filter((asset) => asset.assetType === "bank");
  const bankLines: OfficialFormBankLine[] = [];

  if (bankAssets.length >= 1) {
    bankLines.push({
      description: bankAssets[0]?.description ?? "",
      balanceCents: normalizeCents(bankAssets[0]?.amountCents ?? 0)
    });
  }

  if (bankAssets.length >= 2) {
    bankLines.push({
      description: bankAssets[1]?.description ?? "",
      balanceCents: normalizeCents(bankAssets[1]?.amountCents ?? 0)
    });
  }

  if (bankAssets.length >= 3) {
    const combinedAssets = bankAssets.slice(2);
    bankLines.push({
      description: combinedAssets
        .map((asset) => asset.description.trim())
        .filter(Boolean)
        .join("; "),
      balanceCents: combinedAssets.reduce(
        (total, asset) => total + normalizeCents(asset.amountCents),
        0
      )
    });
  }

  const sumByType = (assetType: ProbateAccountingAssetRow["assetType"]) =>
    assets
      .filter((asset) => asset.assetType === assetType)
      .reduce((total, asset) => total + normalizeCents(asset.amountCents), 0);

  const bankTotalCents = bankAssets.reduce(
    (total, asset) => total + normalizeCents(asset.amountCents),
    0
  );
  const securitiesTotalCents = sumByType("securities");
  const tangibleTotalCents = sumByType("tangible_personal_property");
  const realEstateWilledNotSoldTotalCents = sumByType("real_estate_willed_not_sold");
  const realEstateAcquiredTotalCents = sumByType("real_estate_acquired");
  const otherTotalCents = sumByType("other");
  const personalPropertySubtotalCents =
    bankTotalCents + securitiesTotalCents + tangibleTotalCents;
  const totalBalanceHeldOrInvestedCents =
    personalPropertySubtotalCents +
    realEstateWilledNotSoldTotalCents +
    realEstateAcquiredTotalCents +
    otherTotalCents;

  return {
    bankLines,
    securitiesTotalCents,
    tangibleTotalCents,
    realEstateWilledNotSoldTotalCents,
    realEstateAcquiredTotalCents,
    otherTotalCents,
    personalPropertySubtotalCents,
    totalBalanceHeldOrInvestedCents
  };
}

export function getLedgerRowsByType(
  entries: ProbateAccountingLedgerEntry[],
  entryType: ProbateAccountingEntryType
) {
  return entries
    .filter((entry) => entry.entryType === entryType)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}
