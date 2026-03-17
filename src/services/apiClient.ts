import { shouldUseDemoFallback } from "@/services/demoApi";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(message || "Request failed.", response.status);
  }

  return (await response.json()) as T;
}

export async function requestJsonWithFallback<T>(
  path: string,
  options: RequestOptions,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    return await requestJson<T>(path, options);
  } catch (error) {
    if (!shouldUseDemoFallback()) {
      throw error;
    }

    return fallback();
  }
}

