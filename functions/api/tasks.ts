import { json, serverError } from "../_lib/http";
import { listTasks } from "../_lib/matterRepository";
import type { Env } from "../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const tasks = await listTasks(env.DB);
    return json({ tasks });
  } catch (error) {
    console.error(error);
    return serverError("Unable to list tasks.");
  }
};
