import { IpcMain } from "electron";
import { WorkspaceState } from "./workspace";
import { TerminalManager } from "../services/terminal";
import { createGitService } from "../services/git";
import { createWorkspaceHandlers } from "./workspace";
import { createFileSystemHandlers } from "./fileSystem";
import { createGitHandlers } from "./git";
import { createTerminalHandlers } from "./terminal";
import { createPlanningHandlers } from "./planning";
import { createSearchHandlers } from "./search";

export type HandlerMap = Record<string, (...args: unknown[]) => Promise<unknown> | void>;

export function withErrorHandling<T extends HandlerMap>(handlers: T): T {
  return new Proxy(handlers, {
    get(target, prop) {
      const handler = target[prop as keyof T];
      if (typeof handler === "function") {
        return async (...args: Parameters<typeof handler>) => {
          try {
            return await (handler as (...args: unknown[]) => Promise<unknown>)(...args);
          } catch (error) {
            console.error(`IPC handler "${String(prop)}" failed`, error);
            throw error;
          }
        };
      }
      return handler;
    }
  }) as T;
}

export function registerAllIpcHandlers(
  ipcMain: IpcMain,
  state: WorkspaceState,
  terminalManager: TerminalManager
): void {
  const gitService = createGitService();

  const workspaceHandlers = withErrorHandling(createWorkspaceHandlers(state, terminalManager));
  const fileSystemHandlers = withErrorHandling(createFileSystemHandlers(state));
  const gitHandlers = withErrorHandling(createGitHandlers(state, gitService));
  const terminalHandlers = withErrorHandling(createTerminalHandlers(state, terminalManager));
  const planningHandlers = withErrorHandling(createPlanningHandlers(state));
  const searchHandlers = withErrorHandling(createSearchHandlers(state));

  const allHandlers = {
    ...workspaceHandlers,
    ...fileSystemHandlers,
    ...gitHandlers,
    ...terminalHandlers,
    ...planningHandlers,
    ...searchHandlers
  };

  Object.entries(allHandlers).forEach(([channel, handler]) => {
    if (channel.startsWith("terminal:") && (channel === "terminal:input" || channel === "terminal:resize" || channel === "terminal:dispose")) {
      ipcMain.on(channel, handler as (...args: unknown[]) => void);
    } else {
      ipcMain.handle(channel, handler as (...args: unknown[]) => Promise<unknown>);
    }
  });

  console.log(`Registered ${Object.keys(allHandlers).length} IPC handlers`);
}
