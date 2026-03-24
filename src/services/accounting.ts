import { requestJsonWithFallback } from "@/services/apiClient";
import type {
  AccountingPeriodDetail,
  AccountingPeriodInput,
  AccountingPeriodSummary,
  AccountingPeriodUpdateInput,
  HeldAssetInput,
  HeldAssetUpdateInput,
  LedgerEntryInput,
  LedgerEntryUpdateInput,
  ProofLinkInput,
  ProofLinkUpdateInput
} from "@/types/accounting";

export async function listAccountingPeriods(
  matterId: string
): Promise<AccountingPeriodSummary[]> {
  const query = new URLSearchParams({ matterId });
  const response = await requestJsonWithFallback<{ periods: AccountingPeriodSummary[] }>(
    `/accounting?${query.toString()}`,
    {},
    async () => {
      throw new Error("Accounting requires the authenticated API.");
    }
  );

  return response.periods;
}

export async function getAccountingPeriod(
  accountingPeriodId: string
): Promise<AccountingPeriodDetail> {
  return requestJsonWithFallback<AccountingPeriodDetail>(
    `/accounting/periods/${accountingPeriodId}`,
    {},
    async () => {
      throw new Error("Accounting requires the authenticated API.");
    }
  );
}

export async function createAccountingPeriod(
  input: AccountingPeriodInput
): Promise<AccountingPeriodDetail> {
  return requestJsonWithFallback<AccountingPeriodDetail>(
    "/accounting/periods",
    {
      method: "POST",
      body: input
    },
    async () => {
      throw new Error("Accounting requires the authenticated API.");
    }
  );
}

export async function updateAccountingPeriod(
  accountingPeriodId: string,
  input: AccountingPeriodUpdateInput
): Promise<AccountingPeriodDetail> {
  return requestJsonWithFallback<AccountingPeriodDetail>(
    `/accounting/periods/${accountingPeriodId}`,
    {
      method: "PUT",
      body: input
    },
    async () => {
      throw new Error("Accounting requires the authenticated API.");
    }
  );
}

export async function finalizeAccountingPeriod(
  accountingPeriodId: string
): Promise<AccountingPeriodDetail> {
  return requestJsonWithFallback<AccountingPeriodDetail>(
    "/accounting/periods/finalize",
    {
      method: "POST",
      body: { accountingPeriodId }
    },
    async () => {
      throw new Error("Accounting requires the authenticated API.");
    }
  );
}

export async function createAccountingEntry(
  input: LedgerEntryInput
): Promise<AccountingPeriodDetail> {
  return requestJsonWithFallback<AccountingPeriodDetail>(
    "/accounting/entries",
    {
      method: "POST",
      body: input
    },
    async () => {
      throw new Error("Accounting requires the authenticated API.");
    }
  );
}

export async function updateAccountingEntry(
  entryId: string,
  input: LedgerEntryUpdateInput
): Promise<AccountingPeriodDetail> {
  return requestJsonWithFallback<AccountingPeriodDetail>(
    `/accounting/entries/${entryId}`,
    {
      method: "PUT",
      body: input
    },
    async () => {
      throw new Error("Accounting requires the authenticated API.");
    }
  );
}

export async function deleteAccountingEntry(
  entryId: string
): Promise<AccountingPeriodDetail> {
  return requestJsonWithFallback<AccountingPeriodDetail>(
    `/accounting/entries/${entryId}`,
    {
      method: "DELETE"
    },
    async () => {
      throw new Error("Accounting requires the authenticated API.");
    }
  );
}

export async function createAccountingHeldAsset(
  input: HeldAssetInput
): Promise<AccountingPeriodDetail> {
  return requestJsonWithFallback<AccountingPeriodDetail>(
    "/accounting/assets",
    {
      method: "POST",
      body: input
    },
    async () => {
      throw new Error("Accounting requires the authenticated API.");
    }
  );
}

export async function updateAccountingHeldAsset(
  assetId: string,
  input: HeldAssetUpdateInput
): Promise<AccountingPeriodDetail> {
  return requestJsonWithFallback<AccountingPeriodDetail>(
    `/accounting/assets/${assetId}`,
    {
      method: "PUT",
      body: input
    },
    async () => {
      throw new Error("Accounting requires the authenticated API.");
    }
  );
}

export async function deleteAccountingHeldAsset(
  assetId: string
): Promise<AccountingPeriodDetail> {
  return requestJsonWithFallback<AccountingPeriodDetail>(
    `/accounting/assets/${assetId}`,
    {
      method: "DELETE"
    },
    async () => {
      throw new Error("Accounting requires the authenticated API.");
    }
  );
}

export async function createAccountingProofLink(
  input: ProofLinkInput
): Promise<AccountingPeriodDetail> {
  return requestJsonWithFallback<AccountingPeriodDetail>(
    "/accounting/proofs",
    {
      method: "POST",
      body: input
    },
    async () => {
      throw new Error("Accounting requires the authenticated API.");
    }
  );
}

export async function updateAccountingProofLink(
  proofLinkId: string,
  input: ProofLinkUpdateInput
): Promise<AccountingPeriodDetail> {
  return requestJsonWithFallback<AccountingPeriodDetail>(
    `/accounting/proofs/${proofLinkId}`,
    {
      method: "PUT",
      body: input
    },
    async () => {
      throw new Error("Accounting requires the authenticated API.");
    }
  );
}

export async function deleteAccountingProofLink(
  proofLinkId: string
): Promise<AccountingPeriodDetail> {
  return requestJsonWithFallback<AccountingPeriodDetail>(
    `/accounting/proofs/${proofLinkId}`,
    {
      method: "DELETE"
    },
    async () => {
      throw new Error("Accounting requires the authenticated API.");
    }
  );
}
