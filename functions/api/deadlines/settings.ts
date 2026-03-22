import { requireAuth } from "../../_lib/auth";
import { badRequest, json, notFound, parseJson, serverError } from "../../_lib/http";
import { saveMatterDeadlineSettings } from "../../_lib/matterRepository";
import type {
  Env,
  MatterDeadlineSettingsInput,
  RequestContextData
} from "../../_lib/types";

export const onRequestPut: PagesFunction<Env, string, RequestContextData> = async ({
  data,
  env,
  request
}) => {
  try {
    const auth = requireAuth(data);
    if ("response" in auth) {
      return auth.response;
    }

    const payload = await parseJson<Partial<MatterDeadlineSettingsInput>>(request);
    const result = await saveMatterDeadlineSettings(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      payload
    );

    return result ? json(result) : notFound("Matter not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to save deadline settings.");
  }
};
