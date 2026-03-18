import { requireAuth } from "../../_lib/auth";
import { badRequest, json, notFound, parseJson, serverError } from "../../_lib/http";
import { unarchiveMatter } from "../../_lib/matterRepository";
import type { Env } from "../../_lib/types";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const auth = await requireAuth(request, env);
    if ("response" in auth) {
      return auth.response;
    }

    const payload = await parseJson<{ matterId?: string }>(request);

    if (!payload.matterId) {
      return badRequest("Matter id is required.");
    }

    const matter = await unarchiveMatter(env.DB, auth.session.accountId, payload.matterId);
    return matter ? json({ matter }) : notFound("Matter not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to unarchive matter.");
  }
};
