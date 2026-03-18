import { createSessionCookie, verifyCredentials } from "../../_lib/auth";
import { badRequest, json, serverError, unauthorized } from "../../_lib/http";
import { getAccountByUsername } from "../../_lib/matterRepository";
import type { Env } from "../../_lib/types";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const payload = (await request.json()) as { username?: string; password?: string };
    const username = payload.username?.trim() ?? "";
    const password = payload.password ?? "";

    if (!username || !password) {
      return badRequest("Username and password are required.");
    }

    const isValid = await verifyCredentials(env, username, password);
    if (!isValid) {
      return unauthorized("Invalid username or password.");
    }

    const account = await getAccountByUsername(env.DB, username);
    if (!account) {
      return serverError("Authorized account is not provisioned.");
    }

    const sessionCookie = await createSessionCookie(request, env, {
      accountId: account.id,
      username: account.username
    });

    return json(
      {
        session: {
          authenticated: true,
          user: { username: account.username }
        }
      },
      {
        headers: {
          "Set-Cookie": sessionCookie
        }
      }
    );
  } catch (error) {
    console.error(error);
    return serverError("Unable to log in.");
  }
};
