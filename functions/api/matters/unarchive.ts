import { requireAuth } from "../../_lib/auth";
import { badRequest, json, notFound, parseJson, serverError } from "../../_lib/http";
import { unarchiveMatter } from "../../_lib/matterRepository";
import type { Env, RequestContextData } from "../../_lib/types";

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

    const payload = await parseJson<{ matterId?: string }>(request);

    if (!payload.matterId) {
      return badRequest("Matter id is required.");
    }

    const matter = await unarchiveMatter(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      payload.matterId
    );
    return matter ? json({ matter }) : notFound("Matter not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to unarchive matter.");
  }
};
