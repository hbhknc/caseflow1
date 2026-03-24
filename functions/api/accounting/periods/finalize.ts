import { requireAuth } from "../../../_lib/auth";
import { badRequest, json, notFound, parseJson, serverError } from "../../../_lib/http";
import { finalizeAccountingPeriod } from "../../../_lib/matterRepository";
import type {
  AccountingFinalizeInput,
  Env,
  RequestContextData
} from "../../../_lib/types";

export const onRequestPost: PagesFunction<Env, string, RequestContextData> = async ({
  data,
  env,
  request
}) => {
  try {
    const auth = requireAuth(data);
    if ("response" in auth) {
      return auth.response;
    }

    const payload = await parseJson<AccountingFinalizeInput>(request);
    const result = await finalizeAccountingPeriod(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      payload
    );

    return result ? json(result) : notFound("Accounting period not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to finalize accounting period.");
  }
};
