import { createLogoutCookie } from "../../_lib/auth";
import { json } from "../../_lib/http";
import type { Env } from "../../_lib/types";

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  return json(
    {
      session: {
        authenticated: false,
        user: null
      }
    },
    {
      headers: {
        "Set-Cookie": createLogoutCookie(request)
      }
    }
  );
};
