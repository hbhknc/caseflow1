import { requestJson } from "@/services/apiClient";
import type { AuthSession } from "@/types/api";

export async function getSession(): Promise<AuthSession> {
  const response = await requestJson<{ session: AuthSession }>("/auth/session");
  return response.session;
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const response = await requestJson<{ session: AuthSession }>("/auth/login", {
    method: "POST",
    body: { username, password }
  });

  return response.session;
}

export async function logout(): Promise<void> {
  await requestJson<{ session: AuthSession }>("/auth/logout", {
    method: "POST"
  });
}
