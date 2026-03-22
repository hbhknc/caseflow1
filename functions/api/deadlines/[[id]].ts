import { requireAuth } from "../../_lib/auth";
import { badRequest, json, notFound, parseJson, serverError } from "../../_lib/http";
import { updateDeadline } from "../../_lib/matterRepository";
import type { Env, MatterDeadlineUpdateInput, RequestContextData } from "../../_lib/types";

function getDeadlineId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const onRequestPut: PagesFunction<Env, string, RequestContextData> = async ({
  data,
  env,
  params,
  request
}) => {
  try {
    const auth = requireAuth(data);
    if ("response" in auth) {
      return auth.response;
    }

    const deadlineId = getDeadlineId(params.id);
    if (!deadlineId) {
      return notFound("Deadline id is required.");
    }

    const payload = await parseJson<Partial<MatterDeadlineUpdateInput>>(request);
    const result = await updateDeadline(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      deadlineId,
      payload
    );

    return result ? json(result) : notFound("Deadline not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to update deadline.");
  }
};
