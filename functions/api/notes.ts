import { requireAuth } from "../_lib/auth";
import { badRequest, json, notFound, parseJson, serverError } from "../_lib/http";
import { createNote, listNotes } from "../_lib/matterRepository";
import type { Env, MatterNoteInput } from "../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const auth = await requireAuth(request, env);
    if ("response" in auth) {
      return auth.response;
    }

    const matterId = new URL(request.url).searchParams.get("matterId");
    if (!matterId) {
      return badRequest("matterId is required.");
    }

    const notes = await listNotes(env.DB, auth.session.accountId, matterId);
    return json({ notes });
  } catch (error) {
    console.error(error);
    return serverError("Unable to list notes.");
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const auth = await requireAuth(request, env);
    if ("response" in auth) {
      return auth.response;
    }

    const payload = await parseJson<Partial<MatterNoteInput>>(request);
    const note = await createNote(env.DB, auth.session.accountId, payload);
    return note ? json({ note }, { status: 201 }) : notFound("Matter not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to create note.");
  }
};
