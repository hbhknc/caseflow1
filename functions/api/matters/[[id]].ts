import { badRequest, json, notFound, parseJson, serverError } from "../../_lib/http";
import { deleteMatter, moveMatterStage, updateMatter } from "../../_lib/matterRepository";
import { isMatterStage } from "../../_lib/stages";
import type { Env, MatterInput } from "../../_lib/types";

function getMatterId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const matterId = getMatterId(params.id);
    if (!matterId) {
      return notFound("Matter id is required.");
    }

    const payload = await parseJson<Partial<MatterInput>>(request);
    const matter = await updateMatter(env.DB, matterId, payload);
    return matter ? json({ matter }) : notFound("Matter not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to update matter.");
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const matterId = getMatterId(params.id);
    if (!matterId) {
      return notFound("Matter id is required.");
    }

    const payload = await parseJson<{ stage?: string }>(request);
    if (!payload.stage || !isMatterStage(payload.stage)) {
      return badRequest("A valid stage is required.");
    }

    const matter = await moveMatterStage(env.DB, matterId, payload.stage);
    return matter ? json({ matter }) : notFound("Matter not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to move matter.");
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  try {
    const matterId = getMatterId(params.id);
    if (!matterId) {
      return notFound("Matter id is required.");
    }

    const deleted = await deleteMatter(env.DB, matterId);
    return deleted ? json({ success: true }) : notFound("Matter not found.");
  } catch (error) {
    console.error(error);
    return serverError("Unable to delete matter.");
  }
};
