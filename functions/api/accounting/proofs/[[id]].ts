import { requireAuth } from "../../../_lib/auth";
import { badRequest, json, notFound, parseJson, serverError } from "../../../_lib/http";
import {
  deleteAccountingProofLink,
  updateAccountingProofLink
} from "../../../_lib/matterRepository";
import type {
  AccountingProofLinkPatchInput,
  Env,
  RequestContextData
} from "../../../_lib/types";

function getProofLinkId(value: string | string[] | undefined) {
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

    const proofLinkId = getProofLinkId(params.id);
    if (!proofLinkId) {
      return notFound("Proof link id is required.");
    }

    const payload = await parseJson<Partial<AccountingProofLinkPatchInput>>(request);
    const result = await updateAccountingProofLink(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      proofLinkId,
      payload
    );

    return result ? json(result) : notFound("Proof link not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to update proof link.");
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

    const proofLinkId = getProofLinkId(params.id);
    if (!proofLinkId) {
      return notFound("Proof link id is required.");
    }

    const result = await deleteAccountingProofLink(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      proofLinkId
    );

    return result ? json(result) : notFound("Proof link not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to delete proof link.");
  }
};
