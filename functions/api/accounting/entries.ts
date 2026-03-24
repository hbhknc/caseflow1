import { requireAuth } from "../../_lib/auth";
import { badRequest, json, notFound, parseJson, serverError } from "../../_lib/http";
import { createAccountingEntry } from "../../_lib/matterRepository";
import type {
  AccountingEntryCreateInput,
  Env,
  RequestContextData
} from "../../_lib/types";

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

    const payload = await parseJson<Partial<AccountingEntryCreateInput>>(request);
    const result = await createAccountingEntry(
      env.DB,
      auth.auth.accountId,
      auth.auth.user,
      payload
    );

    return result ? json(result, { status: 201 }) : notFound("Accounting period not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to create accounting entry.");
  }
};
