import { json, serverError } from "../_lib/http";
import { getAppStatus } from "../_lib/matterRepository";
import type { Env } from "../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const status = await getAppStatus(env);
    return json({ status });
  } catch (error) {
    console.error(error);
    return serverError("Unable to load app status.");
  }
};
