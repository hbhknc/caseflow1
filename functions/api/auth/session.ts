import { getSessionFromRequest } from "../../_lib/auth";
import { json, serverError } from "../../_lib/http";
import type { Env } from "../../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const session = await getSessionFromRequest(request, env);

    return json({
      session: session
        ? {
            authenticated: true,
            user: { username: session.username }
          }
        : {
            authenticated: false,
            user: null
          }
    });
  } catch (error) {
    console.error(error);
    return serverError("Unable to load session.");
  }
};
