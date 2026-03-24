import { requireAuth } from "../../_lib/auth";
import { badRequest, json, notFound, parseJson, serverError } from "../../_lib/http";
import {
  createAccountingPeriod,
  listAccountingPeriods
} from "../../_lib/matterRepository";
import type {
  AccountingPeriodCreateInput,
  Env,
  RequestContextData
} from "../../_lib/types";

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

    const matterId = new URL(request.url).searchParams.get("matterId")?.trim();
    if (!matterId) {
      return badRequest("Matter id is required.");
    }

    const periods = await listAccountingPeriods(env.DB, auth.auth.accountId, matterId);
    return periods ? json({ periods }) : notFound("Matter not found.");
  } catch (error) {
    console.error(error);
    return serverError("Unable to load accounting periods.");
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

    const payload = await parseJson<Partial<AccountingPeriodCreateInput>>(request);
    const result = await createAccountingPeriod(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      payload
    );

    return result ? json(result, { status: 201 }) : notFound("Matter not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to create accounting period.");
  }
};
