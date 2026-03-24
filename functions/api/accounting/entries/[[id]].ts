import { requireAuth } from "../../../_lib/auth";
import { badRequest, json, notFound, parseJson, serverError } from "../../../_lib/http";
import {
  deleteAccountingEntry,
  updateAccountingEntry
} from "../../../_lib/matterRepository";
import type {
  AccountingEntryPatchInput,
  Env,
  RequestContextData
} from "../../../_lib/types";

function getEntryId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

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

    const entryId = getEntryId(params.id);
    if (!entryId) {
      return notFound("Accounting entry id is required.");
    }

    const payload = await parseJson<Partial<AccountingEntryPatchInput>>(request);
    const result = await updateAccountingEntry(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      entryId,
      payload
    );

    return result ? json(result) : notFound("Accounting entry not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to update accounting entry.");
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

    const entryId = getEntryId(params.id);
    if (!entryId) {
      return notFound("Accounting entry id is required.");
    }

    const result = await deleteAccountingEntry(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      entryId
    );

    return result ? json(result) : notFound("Accounting entry not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to delete accounting entry.");
  }
};
