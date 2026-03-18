import { requestJsonWithFallback } from "@/services/apiClient";
import {
  createDemoBoard,
  deleteDemoBoard,
  listDemoBoards,
  updateDemoBoard
} from "@/services/demoApi";
import type { PracticeBoard } from "@/types/matter";

export async function listBoards(): Promise<PracticeBoard[]> {
  const response = await requestJsonWithFallback<{ boards: PracticeBoard[] }>(
    "/boards",
    {},
    async () => ({ boards: await listDemoBoards() })
  );

  return response.boards;
}

export async function createBoard(name: string): Promise<PracticeBoard> {
  const response = await requestJsonWithFallback<{ board: PracticeBoard }>(
    "/boards",
    {
      method: "POST",
      body: { name }
    },
    async () => ({ board: await createDemoBoard(name) })
  );

  return response.board;
}

export async function saveBoard(
  boardId: string,
  input: Partial<PracticeBoard>
): Promise<PracticeBoard> {
  const response = await requestJsonWithFallback<{ board: PracticeBoard }>(
    "/boards",
    {
      method: "PUT",
      body: { boardId, ...input }
    },
    async () => ({ board: await updateDemoBoard(boardId, input) })
  );

  return response.board;
}

export async function removeBoard(boardId: string): Promise<PracticeBoard[]> {
  const query = new URLSearchParams({ boardId });
  const response = await requestJsonWithFallback<{ boards: PracticeBoard[] }>(
    `/boards?${query.toString()}`,
    {
      method: "DELETE"
    },
    async () => ({ boards: await deleteDemoBoard(boardId) })
  );

  return response.boards;
}
