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
  startTerminal: () => Promise<{ terminalId: string; usePty: boolean; error?: string; shell?: string }>;
  createTerminal: (payload: { shell?: string }) => Promise<{ terminalId: string; usePty: boolean; error?: string; shell?: string }>;
  listTerminals: () => Promise<{ id: string; name: string; isRunning: boolean; shell: string }[]>;
  renameTerminal: (payload: { terminalId: string; name: string }) => Promise<{ ok: boolean }>;
  killTerminal: (payload: { terminalId: string }) => Promise<{ ok: boolean }>;
  getAvailableShells: () => Promise<{ name: string; path: string }[]>;
  sendTerminalInput: (payload: { terminalId: string; data: string }) => void;
  resizeTerminal: (payload: { terminalId: string; cols: number; rows: number }) => void;
  disposeTerminal: (payload: { terminalId: string }) => void;
  onTerminalData: (callback: (data: { terminalId: string; data: string }) => void) => () => void;
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
  approvalAssessRisk: (payload: { actionType: string; actionData?: any }) => Promise<ApprovalRiskAssessment>;
  approvalCreate: (payload: ApprovalCreatePayload) => Promise<string>;
  approvalApprove: (payload: ApprovalApprovePayload) => Promise<{ recordId: string; status: string }>;
  approvalReject: (payload: ApprovalRejectPayload) => Promise<{ recordId: string; status: string }>;
  approvalEscalate: (payload: ApprovalEscalatePayload) => Promise<{ escalationId: string; newRiskLevel: RiskLevel }>;
  approvalGetPending: (limit?: number) => Promise<ApprovalQueueItem[]>;
  approvalGetHistory: (filters?: ApprovalHistoryFilters) => Promise<ApprovalRecord[]>;
  approvalGetEscalations: (filters?: EscalationFilters) => Promise<EscalationRecord[]>;
  approvalResolveEscalation: (escalationId: string) => Promise<{ ok: boolean }>;
  approvalGetRules: () => Promise<ApprovalRule[]>;
  approvalCreateRule: (payload: ApprovalCreateRulePayload) => Promise<string>;
  approvalUpdateRule: (payload: ApprovalUpdateRulePayload) => Promise<{ ok: boolean }>;
  approvalDeleteRule: (ruleId: string) => Promise<{ ok: boolean }>;
  approvalGetBundle: (bundleId: string) => Promise<ApprovalQueueItem[]>;
  approvalBulkApprove: (payload: BulkApprovePayload) => Promise<Array<{ id: string; status: string; recordId?: string }>>;
  approvalBulkReject: (payload: BulkRejectPayload) => Promise<Array<{ id: string; status: string; recordId?: string }>>;
  approvalGetRiskLevels: () => Promise<Record<RiskLevel, RiskLevelInfo>>;
  pluginList: () => Promise<Plugin[]>;
  pluginGet: (pluginId: string) => Promise<Plugin>;
  pluginActivate: (pluginId: string) => Promise<{ success: boolean; pluginId: string }>;
  pluginDeactivate: (pluginId: string) => Promise<{ success: boolean; pluginId: string }>;
  pluginInstall: (manifestUrl: string) => Promise<{ success: boolean; pluginId: string }>;
  pluginUninstall: (pluginId: string) => Promise<{ success: boolean; pluginId: string }>;
  pluginUpdate: (pluginId: string) => Promise<{ success: boolean; pluginId: string }>;
  pluginGetHooks: () => Promise<string[]>;
  pluginGetTools: () => Promise<PluginToolDefinition[]>;
  pluginGetInstruments: () => Promise<PluginInstrumentDefinition[]>;
  pluginGetActivePlugins: () => Promise<Plugin[]>;
  buildPrompt: (options?: PromptBuildOptions) => Promise<PromptBuildResult>;
  getPromptFiles: () => Promise<PromptFile[]>;
  readPromptFile: (path: string) => Promise<PromptFileContent>;
  writePromptFile: (payload: PromptWritePayload) => Promise<{ ok: boolean }>;
  createProjectDirectory: (name: string) => Promise<{ ok: boolean; path: string }>;
  workflowCreateSession: (prompt: string) => Promise<string>;
  workflowCreateTask: (payload: any) => Promise<any>;
  workflowGetTasks: (sessionId: string) => Promise<any[]>;
  workflowUpdateTaskStatus: (taskId: string, status: string) => Promise<any>;
  workflowPauseTask: (taskId: string) => Promise<any>;
  workflowResumeTask: (taskId: string) => Promise<any>;
  workflowRegisterAgent: (agentId: string, config: any) => Promise<any>;
  workflowUpdateAgentStatus: (agentId: string, status: string, currentTaskId?: string) => Promise<any>;
  workflowAddMonologue: (agentId: string, message: string) => Promise<any>;
  workflowGetMonologue: (agentId: string, limit?: number) => Promise<any[]>;
  workflowRecordToolExecution: (toolName: string, status: string, result: any, metadata?: any) => Promise<any>;
  workflowUpdateToolExecution: (executionId: string, status: string, result: any) => Promise<any>;
  workflowGetToolExecutions: (sessionId: string, limit?: number) => Promise<any[]>;
  workflowBroadcastIntervention: (sessionId: string, level: string, message: string) => Promise<any>;
  workflowGetSessionState: (sessionId: string) => Promise<any>;
  workflowPersistSession: (sessionId: string) => Promise<any>;
  workflowCloseSession: (sessionId: string) => Promise<{ ok: boolean }>;
  workflowGetAllAgents: () => Promise<any[]>;
}

interface Window {
  ide: IdeApi;
}

import type {
  FileEntry,
  PlanningOption,
  PlanningQuestion,
  PlanningSpec,
  EventLog,
  SearchResult,
  TaskItem,
  GitStatus,
  GitCommit,
  GitDiff,
  GitBranch,
  GitRemote,
  GitCommitDetails,
  DiffHunk,
  RiskLevel,
  RiskLevelInfo,
  ApprovalRiskAssessment,
  ApprovalCreatePayload,
  ApprovalQueueItem,
  ApprovalApprovePayload,
  ApprovalRejectPayload,
  ApprovalEscalatePayload,
  ApprovalRecord,
  ApprovalHistoryFilters,
  EscalationRecord,
  EscalationFilters,
  ApprovalRule,
  ApprovalCreateRulePayload,
  ApprovalUpdateRulePayload,
  BulkApprovePayload,
  BulkRejectPayload,
  Plugin,
  PluginToolDefinition,
  PluginInstrumentDefinition,
  PromptBuildOptions,
  PromptBuildResult,
  PromptFile,
  PromptFileContent,
  PromptWritePayload
} from './ipc';
