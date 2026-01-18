import { IpcMainEvent, dialog, BrowserWindow, shell } from "electron";
import { TerminalManager } from "../services/terminal";
import { insertEvent, initDatabase } from "../services/db";

export interface WorkspaceState {
  workspacePath: string | null;
  mainWindow: BrowserWindow | null;
}

export function createWorkspaceHandlers(
  state: WorkspaceState,
  terminalManager: TerminalManager
) {
  function ensureWorkspace(): string {
    if (!state.workspacePath) {
      throw new Error("Workspace not selected");
    }
    return state.workspacePath;
  }

  async function selectWorkspace(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    state.workspacePath = result.filePaths[0];
    terminalManager.disposeAll();
    await initDatabase(state.workspacePath);
    insertEvent(null, "info", `Workspace selected: ${state.workspacePath}`);
    return state.workspacePath;
  }

  return {
    "workspace:select": async (): Promise<string | null> => {
      return selectWorkspace();
    },
    "workspace:get": (): string | null => {
      return state.workspacePath;
    },
    "workspace:ensure": (): string => {
      return ensureWorkspace();
    }
  };
}
