import { requireAuth } from "../_lib/auth";
import { badRequest, json, notFound, parseJson, serverError } from "../_lib/http";
import { completeTask, listTasks } from "../_lib/matterRepository";
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

    const url = new URL(request.url);
    const boardId = url.searchParams.get("boardId");
    if (!boardId) {
      return badRequest("Board id is required.");
    }

    const tasks = await listTasks(env.DB, auth.auth.accountId, boardId);
    return json({ tasks });
  } catch (error) {
    console.error(error);
    return serverError("Unable to list tasks.");
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

    const payload = await parseJson<{ taskId?: string }>(request);
    if (!payload.taskId?.trim()) {
      return badRequest("Task id is required.");
    }

    const success = await completeTask(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      payload.taskId
    );
    return success ? json({ success: true }) : notFound("Task not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to complete task.");
  }
};
