import { requireAuth } from "../_lib/auth";
import { badRequest, json, notFound, parseJson, serverError } from "../_lib/http";
import {
  createDeadline,
  getMatterDeadlines,
  listDeadlineDashboard
} from "../_lib/matterRepository";
import type { DeadlineStatus } from "../../src/types/deadlines";
import type {
  Env,
  MatterDeadlineDashboardQuery,
  MatterDeadlineInput,
  RequestContextData
} from "../_lib/types";

function isDeadlineStatus(value: string | null | undefined): value is DeadlineStatus {
  return (
    value === "upcoming" ||
    value === "due_today" ||
    value === "overdue" ||
    value === "completed" ||
    value === "dismissed"
  );
}

export const onRequestGet: PagesFunction<Env, string, RequestContextData> = async ({
  data,
  env,
  request
}) => {
  try {
    const auth = requireAuth(data);
    if ("response" in auth) {
      return auth.response;
    }

    const url = new URL(request.url);
    const scope = url.searchParams.get("scope");
    const matterId = url.searchParams.get("matterId")?.trim() || null;

    if (scope === "matter") {
      if (!matterId) {
        return badRequest("Matter id is required.");
      }

      const result = await getMatterDeadlines(env.DB, auth.auth.accountId, matterId);
      return result ? json(result) : notFound("Matter not found.");
    }

    const status = url.searchParams.get("status");
    if (status && status !== "all" && !isDeadlineStatus(status)) {
      return badRequest("A valid deadline status filter is required.");
    }

    const dashboard = await listDeadlineDashboard(env.DB, auth.auth.accountId, {
      assignee: url.searchParams.get("assignee")?.trim() || undefined,
      matterId: matterId ?? undefined,
      status: (status as MatterDeadlineDashboardQuery["status"]) ?? "all"
    });

    return json({ dashboard });
  } catch (error) {
    console.error(error);
    return serverError("Unable to load deadlines.");
  }
};

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

    const payload = await parseJson<Partial<MatterDeadlineInput>>(request);
    const result = await createDeadline(env.DB, auth.auth.accountId, auth.auth.user, payload);
    return result ? json(result, { status: 201 }) : notFound("Matter not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to create deadline.");
  }
};
