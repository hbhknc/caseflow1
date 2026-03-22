import { requireAuth } from "../_lib/auth";
import { getCurrentUser } from "../_lib/currentUser";
import { json, unauthorized } from "../_lib/http";
import type { Env, RequestContextData } from "../_lib/types";

export const onRequestGet: PagesFunction<Env, string, RequestContextData> = async ({
  data
}) => {
  const auth = requireAuth(data);
  if ("response" in auth) {
    return auth.response;
  }

  const user = await getCurrentUser(data, { includeIdentity: true });

  if (!user) {
    return unauthorized("Authentication required.");
  }

  return json({
    authenticated: true,
    user: {
      email: user.email,
      displayName: user.displayName,
      userId: user.id,
      subject: user.subject,
      authSource: user.authSource
    }
  });
};
