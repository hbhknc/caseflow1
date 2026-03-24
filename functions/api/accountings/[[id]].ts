import { requireAuth } from "../../_lib/auth";
import { badRequest, json, notFound, parseJson, serverError } from "../../_lib/http";
import {
  deleteProbateAccounting,
  getProbateAccountingDetail,
  saveProbateAccounting
} from "../../_lib/accountingRepository";
import type {
  Env,
  ProbateAccountingInput,
  RequestContextData
} from "../../_lib/types";

function getAccountingId(value: string | string[] | undefined) {
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

    const accountingId = getAccountingId(params.id);
    if (!accountingId) {
      return notFound("Accounting id is required.");
    }

    const accounting = await getProbateAccountingDetail(env.DB, auth.auth.accountId, accountingId);
    return accounting ? json({ accounting }) : notFound("Accounting not found.");
  } catch (error) {
    console.error(error);
    return serverError("Unable to load accounting.");
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

    const accountingId = getAccountingId(params.id);
    if (!accountingId) {
      return notFound("Accounting id is required.");
    }

    const payload = await parseJson<Partial<ProbateAccountingInput>>(request);
    const accounting = await saveProbateAccounting(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      accountingId,
      payload
    );
    return accounting ? json({ accounting }) : notFound("Accounting not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to save accounting.");
  }
};

export const onRequestDelete: PagesFunction<Env, string, RequestContextData> = async ({
  data,
  env,
  params
}) => {
  try {
    const auth = requireAuth(data);
    if ("response" in auth) {
      return auth.response;
    }

    const accountingId = getAccountingId(params.id);
    if (!accountingId) {
      return notFound("Accounting id is required.");
    }

    const deleted = await deleteProbateAccounting(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      accountingId
    );

    return deleted ? json({ success: true }) : notFound("Accounting not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to delete accounting.");
  }
};
