import { requireAuth } from "../_lib/auth";
import { badRequest, json, serverError } from "../_lib/http";
import { getMatterStats } from "../_lib/matterRepository";
import type { Env } from "../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const auth = await requireAuth(request, env);
    if ("response" in auth) {
      return auth.response;
    }

    const url = new URL(request.url);
    const boardId = url.searchParams.get("boardId");
    if (!boardId) {
      return badRequest("Board id is required.");
    }

    const stats = await getMatterStats(env.DB, auth.session.accountId, boardId);
    return json({ stats });
  } catch (error) {
    console.error(error);
    return serverError("Unable to load matter stats.");
  }
};
