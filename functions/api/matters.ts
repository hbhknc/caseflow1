import { badRequest, json, parseJson, serverError } from "../_lib/http";
import { createMatter, listMatters } from "../_lib/matterRepository";
import type { Env, MatterInput } from "../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const matters = await listMatters(env.DB);
    return json({ matters });
  } catch (error) {
    console.error(error);
    return serverError("Unable to list matters.");
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const payload = await parseJson<Partial<MatterInput>>(request);
    const matter = await createMatter(env.DB, payload);
    return json({ matter }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to create matter.");
  }
};

