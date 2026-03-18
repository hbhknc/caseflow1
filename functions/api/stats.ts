import { json, serverError } from "../_lib/http";
import { getMatterStats } from "../_lib/matterRepository";
import type { Env } from "../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const stats = await getMatterStats(env.DB);
    return json({ stats });
  } catch (error) {
    console.error(error);
    return serverError("Unable to load matter stats.");
  }
};
