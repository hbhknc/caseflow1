import { requireAuth } from "../_lib/auth";
import { badRequest, json, parseJson, serverError } from "../_lib/http";
import { createMatter, listArchivedMatters, listMatters } from "../_lib/matterRepository";
import type { Env, MatterInput, RequestContextData } from "../_lib/types";

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

    const url = new URL(request.url);
    const boardId = url.searchParams.get("boardId");
    if (!boardId) {
      return badRequest("Board id is required.");
    }

    const matters =
      url.searchParams.get("archived") === "1"
        ? await listArchivedMatters(env.DB, auth.auth.accountId, boardId)
        : await listMatters(env.DB, auth.auth.accountId, boardId);
    return json({ matters });
  } catch (error) {
    console.error(error);
    return serverError("Unable to list matters.");
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

    const payload = await parseJson<Partial<MatterInput>>(request);
    const matter = await createMatter(env.DB, auth.auth.accountId, auth.auth.user, payload);
    return json({ matter }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to create matter.");
  }
};
