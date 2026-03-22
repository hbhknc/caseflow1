import { requireAuth } from "../_lib/auth";
import { badRequest, json, parseJson, serverError } from "../_lib/http";
import {
  getAppStatus,
  getBoardSettings,
  getDeadlineTemplateSettings,
  updateBoardSettings,
  updateDeadlineTemplateSettings
} from "../_lib/matterRepository";
import type { Env, MatterStage, RequestContextData } from "../_lib/types";

export const onRequestGet: PagesFunction<Env, string, RequestContextData> = async ({
  data,
  env
}) => {
  try {
    const auth = requireAuth(data);
    if ("response" in auth) {
      return auth.response;
    }

    const [status, boardSettings, deadlineTemplateSettings] = await Promise.all([
      getAppStatus(env),
      getBoardSettings(env.DB),
      getDeadlineTemplateSettings(env.DB)
    ]);
    return json({ status, boardSettings, deadlineTemplateSettings });
  } catch (error) {
    console.error(error);
    return serverError("Unable to load app status.");
  }
};

export const onRequestPut: PagesFunction<Env, string, RequestContextData> = async ({
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
      boardSettings?: {
        columnCount?: number;
        stageLabels?: Partial<Record<MatterStage, string>>;
      };
      deadlineTemplateSettings?: Parameters<typeof updateDeadlineTemplateSettings>[3];
    }>(request);

    if (!payload.boardSettings && !payload.deadlineTemplateSettings) {
      return badRequest("At least one settings payload is required.");
    }

    const [boardSettings, deadlineTemplateSettings] = await Promise.all([
      payload.boardSettings
        ? updateBoardSettings(env.DB, {
            columnCount: payload.boardSettings.columnCount,
            stageLabels: payload.boardSettings.stageLabels
          })
        : getBoardSettings(env.DB),
      payload.deadlineTemplateSettings
        ? updateDeadlineTemplateSettings(
            env.DB,
            auth.auth.accountId,
            auth.auth.user,
            payload.deadlineTemplateSettings
          )
        : getDeadlineTemplateSettings(env.DB)
    ]);

    return json({ boardSettings, deadlineTemplateSettings });
  } catch (error) {
    console.error(error);
    return serverError("Unable to update settings.");
  }
};
