import { requireAuth } from "../_lib/auth";
import { badRequest, json, notFound, serverError } from "../_lib/http";
import { listAccountingPeriods } from "../_lib/matterRepository";
import type { Env, RequestContextData } from "../_lib/types";

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
