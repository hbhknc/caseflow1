import { unauthorized } from "./http";
import type { Env, RequestAuthState, RequestContextData } from "./types";

const DEFAULT_ACCOUNT_ID = "account_hbhklaw";
const DEFAULT_DEV_USER_EMAIL = "developer@caseflow.local";
const DEFAULT_DEV_USER_NAME = "CaseFlow Developer";

function parseBooleanFlag(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function isLoopbackHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

export function isApiRequest(request: Request) {
  return new URL(request.url).pathname.startsWith("/api/");
}

export function getAccessPluginConfig(env: Env) {
  const domain = env.CLOUDFLARE_ACCESS_DOMAIN?.trim();
  const aud = env.CLOUDFLARE_ACCESS_AUD?.trim();

  if (!domain || !aud) {
    return null;
  }

  return {
    domain: domain as `https://${string}.cloudflareaccess.com`,
    aud
  };
}

export function getCaseflowAccountId(env: Env) {
  return env.CASEFLOW_ACCOUNT_ID?.trim() || DEFAULT_ACCOUNT_ID;
}

export function shouldUseLocalDevBypass(request: Request, env: Env) {
  if (!parseBooleanFlag(env.ACCESS_DEV_BYPASS)) {
    return false;
  }

  return isLoopbackHostname(new URL(request.url).hostname);
}

export function createLocalDevAuthState(env: Env): RequestAuthState {
  const email = env.ACCESS_DEV_USER_EMAIL?.trim() || DEFAULT_DEV_USER_EMAIL;
  const displayName = env.ACCESS_DEV_USER_NAME?.trim() || DEFAULT_DEV_USER_NAME;
  const subject = env.ACCESS_DEV_USER_ID?.trim() || `dev:${email}`;

  return {
    accountId: getCaseflowAccountId(env),
    user: {
      email,
      displayName,
      id: subject,
      subject,
      authenticated: true,
      authSource: "local-dev-bypass"
    }
  };
}

export function createAccessAuthState(
  env: Env,
  data: RequestContextData
): RequestAuthState | null {
  const payload = data.cloudflareAccess?.JWT.payload;

  if (!payload?.email) {
    return null;
  }

  const subject = payload.sub?.trim() ? payload.sub : null;

  return {
    accountId: getCaseflowAccountId(env),
    user: {
      email: payload.email,
      displayName: null,
      id: subject,
      subject,
      authenticated: true,
      authSource: "cloudflare-access"
    },
    accessIdentity: {
      getIdentity: data.cloudflareAccess?.JWT.getIdentity,
      jwtPayload: payload,
      loaded: false,
      value: null
    }
  };
}

export function requireAuth(
  data: RequestContextData
): { auth: RequestAuthState } | { response: Response } {
  if (!data.auth) {
    return { response: unauthorized("Authentication required.") };
  }

  return { auth: data.auth };
}
