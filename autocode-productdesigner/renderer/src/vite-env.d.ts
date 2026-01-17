/// <reference types="vite/client" />

import type {
  CreateFilePayload,
  CreateDirPayload,
  DeletePayload,
  EventLog,
  FileEntry,
  GitBranch,
  GitCommit,
  GitDiff,
  GitFileStatus,
  GitStatus,
  PlanningQuestion,
  PlanningSpec,
  RenamePayload,
  SearchResult,
  Tab,
  TaskItem
} from "./types/ipc";

declare global {
  interface Window {
    ide: {
      selectWorkspace: () => Promise<string | null>;
      getWorkspace: () => Promise<string | null>;
      listDir: (targetPath: string) => Promise<FileEntry[]>;
      readFile: (targetPath: string) => Promise<string>;
      writeFile: (payload: { path: string; content: string }) => Promise<{ ok: boolean }>;
      createFile: (payload: CreateFilePayload) => Promise<{ ok: boolean; path?: string }>;
      createDir: (payload: CreateDirPayload) => Promise<{ ok: boolean; path?: string }>;
      deletePath: (payload: DeletePayload) => Promise<{ ok: boolean; error?: string }>;
      renamePath: (payload: RenamePayload) => Promise<{ ok: boolean; newPath?: string; error?: string }>;
      pathExists: (path: string) => Promise<{ exists: boolean; isDirectory: boolean }>;
      revealPath: (path: string) => Promise<{ success: boolean }>;
      refreshFileTree: () => Promise<void>;
      search: (query: string) => Promise<SearchResult[]>;
      startPlanning: (prompt: string) => Promise<{
        sessionId: string;
        questions: PlanningQuestion[];
        spec: PlanningSpec;
      }>;
      updateAnswer: (payload: {
        sessionId: string;
        questionId: string;
        answer: string;
      }) => Promise<{ ok: boolean }>;
      listEvents: (sessionId: string | null) => Promise<EventLog[]>;
      listTasks: (sessionId: string) => Promise<TaskItem[]>;
      startTerminal: () => Promise<{ terminalId: string }>;
      sendTerminalInput: (payload: { terminalId: string; data: string }) => void;
      resizeTerminal: (payload: { terminalId: string; cols: number; rows: number }) => void;
      disposeTerminal: (payload: { terminalId: string }) => void;
      onTerminalData: (callback: (data: { terminalId: string; data: string }) => void) => () => void;
      gitStatus: (workspace?: string) => Promise<GitStatus>;
      gitStage: (payload: { path: string; workspace?: string }) => Promise<void>;
      gitUnstage: (payload: { path: string; workspace?: string }) => Promise<void>;
      gitDiscard: (payload: { path: string; workspace?: string }) => Promise<void>;
      gitCommit: (payload: { message: string; workspace?: string }) => Promise<void>;
      gitDiff: (payload: { path: string; workspace?: string }) => Promise<GitDiff>;
      gitLog: (limit?: number) => Promise<GitCommit[]>;
      gitBranches: () => Promise<GitBranch[]>;
      gitCreateBranch: (payload: { name: string }) => Promise<void>;
      gitCheckoutBranch: (payload: { name: string }) => Promise<void>;
      gitIsRepo: (workspace?: string) => Promise<boolean>;
      gitInit: () => Promise<void>;
    };
  }
}
