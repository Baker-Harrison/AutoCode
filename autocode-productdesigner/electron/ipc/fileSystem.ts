import { IpcMainEvent } from "electron";
import path from "path";
import { shell } from "electron";
import {
  listDir,
  readFile,
  writeFile,
  createFile,
  createDir,
  deletePath,
  renamePath,
  pathExists
} from "../services/fileSystem";
import { insertEvent } from "../services/db";
import { WorkspaceState } from "./workspace";

export type FileSystemHandlers = ReturnType<typeof createFileSystemHandlers>;

export function createFileSystemHandlers(state: WorkspaceState) {
  function ensureWorkspace(): string {
    if (!state.workspacePath) {
      throw new Error("Workspace not selected");
    }
    return state.workspacePath;
  }

  return {
    "fs:list": async (
      _event: IpcMainEvent,
      targetPath?: string
    ): Promise<string[]> => {
      return listDir(ensureWorkspace(), targetPath || ".");
    },

    "fs:readFile": async (
      _event: IpcMainEvent,
      targetPath: string
    ): Promise<string> => {
      if (typeof targetPath !== "string") {
        throw new Error("Invalid read path");
      }
      return readFile(ensureWorkspace(), targetPath);
    },

    "fs:writeFile": async (
      _event: IpcMainEvent,
      payload: { path: string; content: string }
    ): Promise<{ ok: boolean }> => {
      if (!payload || typeof payload.path !== "string" || typeof payload.content !== "string") {
        throw new Error("Invalid write payload");
      }
      writeFile(ensureWorkspace(), payload.path, payload.content);
      insertEvent(null, "info", `Saved file: ${payload.path}`);
      return { ok: true };
    },

    "fs:createFile": async (
      _event: IpcMainEvent,
      payload: { path: string; content?: string }
    ): Promise<void> => {
      if (!payload || typeof payload.path !== "string") {
        throw new Error("Invalid create file payload");
      }
      return createFile(ensureWorkspace(), payload.path, payload.content || "");
    },

    "fs:createDir": async (
      _event: IpcMainEvent,
      payload: { path: string }
    ): Promise<void> => {
      if (!payload || typeof payload.path !== "string") {
        throw new Error("Invalid create dir payload");
      }
      return createDir(ensureWorkspace(), payload.path);
    },

    "fs:delete": async (
      _event: IpcMainEvent,
      payload: { path: string }
    ): Promise<void> => {
      if (!payload || typeof payload.path !== "string") {
        throw new Error("Invalid delete payload");
      }
      return deletePath(ensureWorkspace(), payload.path);
    },

    "fs:rename": async (
      _event: IpcMainEvent,
      payload: { sourcePath: string; targetPath: string }
    ): Promise<void> => {
      if (
        !payload ||
        typeof payload.sourcePath !== "string" ||
        typeof payload.targetPath !== "string"
      ) {
        throw new Error("Invalid rename payload");
      }
      return renamePath(ensureWorkspace(), payload.sourcePath, payload.targetPath);
    },

    "fs:exists": async (
      _event: IpcMainEvent,
      pathStr: string
    ): Promise<boolean> => {
      if (typeof pathStr !== "string") {
        throw new Error("Invalid exists path");
      }
      return pathExists(ensureWorkspace(), pathStr);
    },

    "fs:refreshTree": (): void => {
      if (state.mainWindow && !state.mainWindow.isDestroyed()) {
        state.mainWindow.webContents.send("fs:treeRefresh");
      }
    },

    "fs:revealPath": async (
      _event: IpcMainEvent,
      relativePath: string
    ): Promise<{ success: boolean }> => {
      if (typeof relativePath !== "string") {
        throw new Error("Invalid path");
      }
      const workspace = ensureWorkspace();
      const resolved = path.resolve(workspace, relativePath);
      if (!resolved.startsWith(workspace)) {
        throw new Error("Path outside workspace");
      }
      const success = await shell.showItemInFolder(resolved);
      return { success };
    }
  };
}
