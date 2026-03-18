export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    headers: {
      "Cache-Control": "no-store"
    },
    ...init
  });
}

export function badRequest(message: string) {
  return json({ error: message }, { status: 400 });
}

export function unauthorized(message = "Unauthorized.") {
  return json({ error: message }, { status: 401 });
}

export function notFound(message = "Not found.") {
  return json({ error: message }, { status: 404 });
}

export function serverError(message = "Unexpected server error.") {
  return json({ error: message }, { status: 500 });
}

export async function parseJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}
