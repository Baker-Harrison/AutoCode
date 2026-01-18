import { IpcMainEvent } from "electron";
import { searchWorkspace } from "../services/search";
import { WorkspaceState } from "./workspace";

export type SearchHandlers = ReturnType<typeof createSearchHandlers>;

export function createSearchHandlers(state: WorkspaceState) {
  const MAX_QUERY_LENGTH = 200;

  function ensureWorkspace(): string {
    if (!state.workspacePath) {
      throw new Error("Workspace not selected");
    }
    return state.workspacePath;
  }

  return {
    "search:run": async (
      _event: IpcMainEvent,
      query: string
    ): Promise<string[]> => {
      if (typeof query !== "string") {
        throw new Error("Invalid search query");
      }
      if (query.length > MAX_QUERY_LENGTH) {
        throw new Error("Search query too long");
      }
      return searchWorkspace(ensureWorkspace(), query);
    }
  };
}
