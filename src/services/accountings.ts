import { getApiUrl, requestJsonWithFallback } from "@/services/apiClient";
import type {
  ProbateAccountingDetail,
  ProbateAccountingInput,
  ProbateAccountingStatus,
  ProbateAccountingSummary,
  ProbateAccountingType
} from "@/types/accounting";

export type ProbateAccountingListFilters = {
  search?: string;
  status?: ProbateAccountingStatus | "all";
  accountType?: ProbateAccountingType | "all";
};

function accountingFallbackError<T>(): Promise<T> {
  return Promise.reject(new Error("Accounting requires the authenticated API."));
}

export async function listProbateAccountings(
  filters: ProbateAccountingListFilters = {}
): Promise<ProbateAccountingSummary[]> {
  const query = new URLSearchParams();

  if (filters.search?.trim()) {
    query.set("search", filters.search.trim());
  }

  if (filters.status && filters.status !== "all") {
    query.set("status", filters.status);
  }

  if (filters.accountType && filters.accountType !== "all") {
    query.set("accountType", filters.accountType);
  }

  const response = await requestJsonWithFallback<{ accountings: ProbateAccountingSummary[] }>(
    `/accountings${query.size ? `?${query.toString()}` : ""}`,
    {},
    () => accountingFallbackError()
  );

  return response.accountings;
}

export async function createProbateAccounting(input?: {
  matterId?: string;
  accountType?: ProbateAccountingType;
}) {
  const response = await requestJsonWithFallback<{ accounting: ProbateAccountingDetail }>(
    "/accountings",
    {
      method: "POST",
      body: input ?? {}
    },
    () => accountingFallbackError()
  );

  return response.accounting;
}

export async function getProbateAccounting(accountingId: string) {
  const response = await requestJsonWithFallback<{ accounting: ProbateAccountingDetail }>(
    `/accountings/${accountingId}`,
    {},
    () => accountingFallbackError()
  );

  return response.accounting;
}

export async function saveProbateAccounting(
  accountingId: string,
  input: Partial<ProbateAccountingInput>
) {
  const response = await requestJsonWithFallback<{ accounting: ProbateAccountingDetail }>(
    `/accountings/${accountingId}`,
    {
      method: "PUT",
      body: input
    },
    () => accountingFallbackError()
  );

  return response.accounting;
}

export async function deleteProbateAccounting(accountingId: string) {
  await requestJsonWithFallback<{ success: boolean }>(
    `/accountings/${accountingId}`,
    {
      method: "DELETE"
    },
    () => accountingFallbackError()
  );
}

export function getProbateAccountingOfficialFormUrl(accountingId: string) {
  const query = new URLSearchParams({
    accountingId
  });

  return getApiUrl(`/accountings/official-form?${query.toString()}`);
}
