import { requireAuth } from "../../../_lib/auth";
import { badRequest, json, notFound, parseJson, serverError } from "../../../_lib/http";
import {
  deleteAccountingHeldAsset,
  updateAccountingHeldAsset
} from "../../../_lib/matterRepository";
import type {
  AccountingHeldAssetPatchInput,
  Env,
  RequestContextData
} from "../../../_lib/types";

function getAssetId(value: string | string[] | undefined) {
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

    const assetId = getAssetId(params.id);
    if (!assetId) {
      return notFound("Held asset id is required.");
    }

    const payload = await parseJson<Partial<AccountingHeldAssetPatchInput>>(request);
    const result = await updateAccountingHeldAsset(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      assetId,
      payload
    );

    return result ? json(result) : notFound("Held asset not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to update held asset.");
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

    const assetId = getAssetId(params.id);
    if (!assetId) {
      return notFound("Held asset id is required.");
    }

    const result = await deleteAccountingHeldAsset(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      assetId
    );

    return result ? json(result) : notFound("Held asset not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to delete held asset.");
  }
};
