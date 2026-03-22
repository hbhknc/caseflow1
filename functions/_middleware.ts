import cloudflareAccessPlugin from "@cloudflare/pages-plugin-cloudflare-access";
import {
  createAccessAuthState,
  createLocalDevAuthState,
  getAccessPluginConfig,
  isApiRequest,
  shouldUseLocalDevBypass
} from "./_lib/auth";
import { serverError, unauthorized } from "./_lib/http";
import type { Env, RequestContextData } from "./_lib/types";

const authenticateAccess: PagesFunction<Env, string, RequestContextData> = async (
  context
) => {
  if (!isApiRequest(context.request)) {
    return context.next();
  }

  if (shouldUseLocalDevBypass(context.request, context.env)) {
    context.data.auth = createLocalDevAuthState(context.env);
    return context.next();
  }

  const config = getAccessPluginConfig(context.env);
  if (!config) {
    return serverError("Cloudflare Access is not configured.");
  }

  const response = await cloudflareAccessPlugin(config)(
    context as Parameters<ReturnType<typeof cloudflareAccessPlugin>>[0]
  );

  return response.status === 302
    ? unauthorized("Authentication required.")
    : response;
};

const attachCurrentUser: PagesFunction<Env, string, RequestContextData> = async (
  context
) => {
  if (!isApiRequest(context.request) || context.data.auth) {
    return context.next();
  }

  const auth = createAccessAuthState(context.env, context.data);

  if (!auth) {
    return unauthorized("Authenticated user identity is unavailable.");
  }

  context.data.auth = auth;
  return context.next();
};

export const onRequest = [authenticateAccess, attachCurrentUser] satisfies PagesFunction<
  Env,
  string,
  RequestContextData
>[];
