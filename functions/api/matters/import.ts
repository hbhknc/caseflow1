import { requireAuth } from "../../_lib/auth";
import { badRequest, json, parseJson, serverError } from "../../_lib/http";
import { importMatters } from "../../_lib/matterRepository";
import type { Env, MatterImportRowInput, RequestContextData } from "../../_lib/types";

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

    const payload = await parseJson<{
      boardId?: string;
      rows?: MatterImportRowInput[];
    }>(request);

    if (!payload.boardId?.trim()) {
      return badRequest("Board id is required.");
    }

    if (!Array.isArray(payload.rows)) {
      return badRequest("Import rows are required.");
    }

    const summary = await importMatters(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      payload.boardId,
      payload.rows
    );

    return json({ summary }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to import matters.");
  }
};
