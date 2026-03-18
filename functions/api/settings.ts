import { requireAuth } from "../_lib/auth";
import { badRequest, json, parseJson, serverError } from "../_lib/http";
import { getAppStatus, getBoardSettings, updateBoardSettings } from "../_lib/matterRepository";
import type { Env, MatterStage } from "../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const auth = await requireAuth(request, env);
    if ("response" in auth) {
      return auth.response;
    }

    const [status, boardSettings] = await Promise.all([
      getAppStatus(env),
      getBoardSettings(env.DB)
    ]);
    return json({ status, boardSettings });
  } catch (error) {
    console.error(error);
    return serverError("Unable to load app status.");
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const auth = await requireAuth(request, env);
    if ("response" in auth) {
      return auth.response;
    }

    const payload = await parseJson<{
      boardSettings?: {
        columnCount?: number;
        stageLabels?: Partial<Record<MatterStage, string>>;
      };
    }>(request);

    if (!payload.boardSettings) {
      return badRequest("Board settings payload is required.");
    }

    const boardSettings = await updateBoardSettings(env.DB, {
      columnCount: payload.boardSettings.columnCount,
      stageLabels: payload.boardSettings.stageLabels
    });

    return json({ boardSettings });
  } catch (error) {
    console.error(error);
    return serverError("Unable to update settings.");
  }
};
