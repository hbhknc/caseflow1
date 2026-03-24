import { requireAuth } from "../../../_lib/auth";
import { badRequest, json, notFound, parseJson, serverError } from "../../../_lib/http";
import {
  getAccountingPeriod,
  updateAccountingPeriod
} from "../../../_lib/matterRepository";
import type {
  AccountingPeriodPatchInput,
  Env,
  RequestContextData
} from "../../../_lib/types";

function getAccountingPeriodId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const onRequestGet: PagesFunction<Env, string, RequestContextData> = async ({
  data,
  env,
  params
}) => {
  try {
    const auth = requireAuth(data);
    if ("response" in auth) {
      return auth.response;
    }

    const accountingPeriodId = getAccountingPeriodId(params.id);
    if (!accountingPeriodId) {
      return notFound("Accounting period id is required.");
    }

    const result = await getAccountingPeriod(
      env.DB,
      auth.auth.accountId,
      accountingPeriodId
    );
    return result ? json(result) : notFound("Accounting period not found.");
  } catch (error) {
    console.error(error);
    return serverError("Unable to load accounting period.");
  }
};

export const onRequestPut: PagesFunction<Env, string, RequestContextData> = async ({
  data,
  env,
  params,
  request
}) => {
  try {
    const auth = requireAuth(data);
    if ("response" in auth) {
      return auth.response;
    }

    const accountingPeriodId = getAccountingPeriodId(params.id);
    if (!accountingPeriodId) {
      return notFound("Accounting period id is required.");
    }

    const payload = await parseJson<Partial<AccountingPeriodPatchInput>>(request);
    const result = await updateAccountingPeriod(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      accountingPeriodId,
      payload
    );

    return result ? json(result) : notFound("Accounting period not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to update accounting period.");
  }
};
