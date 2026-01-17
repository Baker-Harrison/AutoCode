interface IdeApi {
  selectWorkspace: () => Promise<string | null>;
  getWorkspace: () => Promise<string | null>;
  listDir: (targetPath: string) => Promise<FileEntry[]>;
  readFile: (targetPath: string) => Promise<string>;
  writeFile: (payload: { path: string; content: string }) => Promise<{ ok: boolean }>;
  createFile: (payload: { path: string; content?: string }) => Promise<void>;
  createDir: (payload: { path: string }) => Promise<void>;
  deletePath: (payload: { path: string }) => Promise<void>;
  renamePath: (payload: { sourcePath: string; targetPath: string }) => Promise<void>;
  pathExists: (path: string) => Promise<{ exists: boolean; isDirectory: boolean }>;
  refreshFileTree: () => void;
  search: (query: string) => Promise<SearchResult[]>;
  startPlanning: (prompt: string) => Promise<{ sessionId: string; questions: PlanningQuestion[]; spec: PlanningSpec }>;
  updateAnswer: (payload: { sessionId: string; questionId: string; answer: string }) => Promise<{ ok: boolean }>;
  listEvents: (sessionId: string | null) => Promise<EventLog[]>;
  clearLogs: () => Promise<void>;
  runCommand: (payload: { command: string; cwd: string; source?: string }) => Promise<{ success: boolean; output?: string; error?: string }>;
  listTasks: (sessionId: string) => Promise<TaskItem[]>;
  startTerminal: () => Promise<{ terminalId: string }>;
  createTerminal: (payload: { shell?: string }) => Promise<{ terminalId: string }>;
  listTerminals: () => Promise<{ id: string; name: string; isRunning: boolean; shell: string }[]>;
  renameTerminal: (payload: { terminalId: string; name: string }) => Promise<{ ok: boolean }>;
  killTerminal: (payload: { terminalId: string }) => Promise<{ ok: boolean }>;
  getAvailableShells: () => Promise<{ name: string; path: string }[]>;
  sendTerminalInput: (payload: { terminalId: string; data: string }) => void;
  resizeTerminal: (payload: { terminalId: string; cols: number; rows: number }) => void;
  disposeTerminal: (payload: { terminalId: string }) => void;
  onTerminalData: (callback: (data: string) => void) => () => void;
  gitStatus: (workspace?: string) => Promise<GitStatus>;
  gitStage: (payload: { path: string; workspace?: string }) => Promise<void>;
  gitUnstage: (payload: { path: string; workspace?: string }) => Promise<void>;
  gitStageAll: (workspace?: string) => Promise<void>;
  gitUnstageAll: (workspace?: string) => Promise<void>;
  gitDiscard: (payload: { path: string; workspace?: string }) => Promise<void>;
  gitCommit: (payload: { message: string; workspace?: string; amend?: boolean; signOff?: boolean }) => Promise<void>;
  gitDiff: (payload: { path: string; workspace?: string }) => Promise<GitDiff>;
  gitStagedDiff: (workspace?: string) => Promise<GitDiff>;
  gitLog: (payload?: { limit?: number; skip?: number; workspace?: string }) => Promise<GitCommit[]>;
  gitBranches: () => Promise<GitBranch[]>;
  gitRemoteBranches: () => Promise<string[]>;
  gitCreateBranch: (payload: { name: string; workspace?: string }) => Promise<void>;
  gitDeleteBranch: (payload: { name: string; force?: boolean; workspace?: string }) => Promise<void>;
  gitRenameBranch: (payload: { name: string; workspace?: string }) => Promise<void>;
  gitCheckoutBranch: (payload: { name: string; workspace?: string }) => Promise<void>;
  gitMerge: (payload: { sourceBranch: string; message?: string; workspace?: string }) => Promise<void>;
  gitRebase: (payload: { branch: string; workspace?: string }) => Promise<void>;
  gitAbortRebase: (workspace?: string) => Promise<void>;
  gitContinueRebase: (workspace?: string) => Promise<void>;
  gitFetch: (workspace?: string) => Promise<void>;
  gitPull: (payload?: { rebase?: boolean; workspace?: string }) => Promise<void>;
  gitPush: (payload?: { tags?: boolean; branch?: string; upstream?: boolean; workspace?: string }) => Promise<void>;
  gitRemotes: () => Promise<GitRemote[]>;
  gitAddRemote: (payload: { name: string; url: string; workspace?: string }) => Promise<void>;
  gitRemoveRemote: (payload: { name: string; workspace?: string }) => Promise<void>;
  gitIsRepo: (workspace?: string) => Promise<boolean>;
  gitInit: () => Promise<void>;
  gitLastCommitMessage: (workspace?: string) => Promise<string>;
  gitCommitDetails: (hash: string, workspace?: string) => Promise<GitCommitDetails>;
  gitDiffBranches: (branch1: string, branch2: string, workspace?: string) => Promise<string>;
}

interface Window {
  ide: IdeApi;
}

import type { FileEntry, PlanningOption, PlanningQuestion, PlanningSpec, EventLog, SearchResult, TaskItem, GitStatus, GitCommit, GitDiff, GitBranch, GitRemote, GitCommitDetails, DiffHunk } from './ipc';
