import { badRequest, json, notFound, parseJson, serverError } from "../_lib/http";
import { createBoard, deleteBoard, listBoards, updateBoard } from "../_lib/matterRepository";
import type { Env, PracticeBoard } from "../_lib/types";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const boards = await listBoards(env.DB);
    return json({ boards });
  } catch (error) {
    console.error(error);
    return serverError("Unable to load boards.");
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const payload = await parseJson<{ name?: string }>(request);
    if (!payload.name?.trim()) {
      return badRequest("Board name is required.");
    }

    const board = await createBoard(env.DB, payload.name);
    return json({ board }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to create board.");
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const payload = await parseJson<{
      boardId?: string;
      name?: string;
      columnCount?: number;
      stageLabels?: Partial<PracticeBoard["stageLabels"]>;
    }>(request);

    if (!payload.boardId?.trim()) {
      return badRequest("Board id is required.");
    }

    const board = await updateBoard(env.DB, payload.boardId, {
      name: payload.name,
      columnCount: payload.columnCount,
      stageLabels: payload.stageLabels
    });

    return board ? json({ board }) : notFound("Board not found.");
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to update board.");
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const url = new URL(request.url);
    const boardId = url.searchParams.get("boardId");
    if (!boardId) {
      return badRequest("Board id is required.");
    }

    const boards = await deleteBoard(env.DB, boardId);
    return json({ boards });
  } catch (error) {
    if (error instanceof Error) {
      return badRequest(error.message);
    }

    return serverError("Unable to delete board.");
  }
};
