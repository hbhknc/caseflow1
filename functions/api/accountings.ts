import { requireAuth } from "../_lib/auth";
import { badRequest, json, parseJson, serverError } from "../_lib/http";
import {
  createProbateAccounting,
  listProbateAccountings
} from "../_lib/accountingRepository";
import type {
  Env,
  ProbateAccountingListQuery,
  RequestContextData
} from "../_lib/types";

export const onRequestGet: PagesFunction<Env, string, RequestContextData> = async ({
  data,
  env,
  request
}) => {
  try {
    const auth = requireAuth(data);
    if ("response" in auth) {
      return auth.response;
    }

    const url = new URL(request.url);
    const filters: ProbateAccountingListQuery = {
      search: url.searchParams.get("search") ?? undefined,
      status: (url.searchParams.get("status") as ProbateAccountingListQuery["status"]) ?? undefined,
      accountType:
        (url.searchParams.get("accountType") as ProbateAccountingListQuery["accountType"]) ??
        undefined
    };

    const accountings = await listProbateAccountings(env.DB, auth.auth.accountId, filters);
    return json({ accountings });
  } catch (error) {
    console.error(error);
    return serverError("Unable to load accountings.");
  }
};

export const onRequestPost: PagesFunction<Env, string, RequestContextData> = async ({
  data,
  env,
  request
}) => {
  try {
    const auth = requireAuth(data);
    if ("response" in auth) {
      return auth.response;
    }

    const payload = await parseJson<{
      matterId?: string;
      accountType?: "annual" | "final";
    }>(request);
    const accounting = await createProbateAccounting(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      payload
    );

    return json({ accounting }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to create accounting.");
  }
};
