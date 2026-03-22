import { shouldUseDemoFallback } from "@/services/demoApi";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
const PROTECTED_PREFIXES = [
  "/boards",
  "/matters",
  "/notes",
  "/tasks",
  "/stats",
  "/settings",
  "/deadlines"
];

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function readErrorMessage(response: Response) {
  const text = await response.text();

  if (!text) {
    return "Request failed.";
  }

  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    return parsed.error || parsed.message || text;
  } catch {
    return text;
  }
}

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("caseflow:unauthorized"));
    }
    throw new ApiError(message || "Request failed.", response.status);
  }

  return (await response.json()) as T;
}

export async function requestJsonWithFallback<T>(
  path: string,
  options: RequestOptions,
  fallback: () => Promise<T>
): Promise<T> {
  if (PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return requestJson<T>(path, options);
  }

  try {
    return await requestJson<T>(path, options);
  } catch (error) {
    if (!shouldUseDemoFallback()) {
      throw error;
    }

    return fallback();
  }
}
