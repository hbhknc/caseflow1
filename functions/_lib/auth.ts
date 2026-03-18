import { unauthorized } from "./http";
import type { AuthSession, Env } from "./types";

const SESSION_COOKIE_NAME = "caseflow_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();
const DEFAULT_AUTH_USERNAME = "hbhklaw";
const DEFAULT_AUTH_PASSWORD = "barnes";
const DEFAULT_SESSION_SECRET = "caseflow-temporary-session-secret-change-me";

function getAuthConfig(env: Env) {
  return {
    username: env.AUTH_USERNAME || DEFAULT_AUTH_USERNAME,
    password: env.AUTH_PASSWORD || DEFAULT_AUTH_PASSWORD,
    sessionSecret: env.SESSION_SECRET || DEFAULT_SESSION_SECRET
  };
}

function toBase64Url(input: ArrayBuffer | string) {
  const bytes =
    typeof input === "string" ? encoder.encode(input) : new Uint8Array(input);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importSessionKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signValue(value: string, secret: string) {
  const key = await importSessionKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(signature);
}

function parseCookies(cookieHeader: string | null) {
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  return new Map(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...rest] = part.split("=");
        return [name, rest.join("=")];
      })
  );
}

function getCookieAttributes(request: Request) {
  const url = new URL(request.url);
  return [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    url.protocol === "https:" ? "Secure" : null
  ]
    .filter(Boolean)
    .join("; ");
}

export async function verifyCredentials(
  env: Env,
  username: string,
  password: string
) {
  const config = getAuthConfig(env);
  return username === config.username && password === config.password;
}

export async function createSessionCookie(
  request: Request,
  env: Env,
  session: Pick<AuthSession, "accountId" | "username">
) {
  const config = getAuthConfig(env);
  const payload = {
    accountId: session.accountId,
    username: session.username,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  };
  const payloadString = JSON.stringify(payload);
  const encodedPayload = toBase64Url(payloadString);
  const signature = await signValue(encodedPayload, config.sessionSecret);

  return `${SESSION_COOKIE_NAME}=${encodedPayload}.${signature}; Max-Age=${SESSION_MAX_AGE_SECONDS}; ${getCookieAttributes(
    request
  )}`;
}

export function createLogoutCookie(request: Request) {
  return `${SESSION_COOKIE_NAME}=; Max-Age=0; ${getCookieAttributes(request)}`;
}

export async function getSessionFromRequest(
  request: Request,
  env: Env
): Promise<AuthSession | null> {
  const config = getAuthConfig(env);
  const cookies = parseCookies(request.headers.get("Cookie"));
  const cookieValue = cookies.get(SESSION_COOKIE_NAME);

  if (!cookieValue) {
    return null;
  }

  const [encodedPayload, signature] = cookieValue.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await signValue(encodedPayload, config.sessionSecret);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encodedPayload))
    ) as AuthSession;

    if (!payload.accountId || !payload.username || payload.expiresAt <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function requireAuth(
  request: Request,
  env: Env
): Promise<{ session: AuthSession } | { response: Response }> {
  const session = await getSessionFromRequest(request, env);

  if (!session) {
    return { response: unauthorized("Login required.") };
  }

  return { session };
}
