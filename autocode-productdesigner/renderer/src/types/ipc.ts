export type FileEntry = {
  name: string;
  path: string;
  relativePath: string;
  type: "file" | "directory";
};

export type Tab = {
  id: string;
  file: FileEntry;
  content: string;
  isDirty: boolean;
};

export type PlanningOption = {
  id: string;
  label: string;
  implications: string;
};

export type PlanningQuestion = {
  id: string;
  text: string;
  options: PlanningOption[];
  recommendedOption: string;
};

export type PlanningSpec = {
  prompt: string;
  generatedAt: string;
  summary: string;
  assumptions: string[];
};

export type EventLog = {
  id: string;
  level: string;
  message: string;
  created_at: string;
  session_id?: string;
};

export type SearchResult = {
  path: string;
  relativePath: string;
  line: number;
  preview: string;
};

export type TaskItem = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

export type CreateFilePayload = {
  path: string;
  content?: string;
};

export type CreateDirPayload = {
  path: string;
};

export type DeletePayload = {
  path: string;
};

export type RenamePayload = {
  sourcePath: string;
  targetPath: string;
};

export type ExistsResult = {
  exists: boolean;
  isDirectory: boolean;
};

export type GitFileStatus = {
  path: string;
  status: 'modified' | 'staged' | 'untracked' | 'added' | 'deleted';
  oldPath?: string;
};

export type GitStatus = {
  currentBranch: string;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
  isRepo: boolean;
};

export type GitCommit = {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  body?: string;
};

export type GitCommitDetails = {
  hash: string;
  message: string;
  author: string;
  date: string;
  files: string[];
};

export type GitDiff = {
  diff: string;
  diffStat: string;
  hunks: DiffHunk[];
};

export type DiffHunk = {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
};

export type GitBranch = {
  name: string;
  current: boolean;
  remote?: string;
  upstream?: string;
};

export type GitRemote = {
  name: string;
  url: string;
};

export type GitCommitPayload = {
  message: string;
  workspace?: string;
  amend?: boolean;
  signOff?: boolean;
};

export type GitStagePayload = {
  path: string;
  workspace?: string;
};

export type GitUnstagePayload = {
  path: string;
  workspace?: string;
};

export type GitDiscardPayload = {
  path: string;
  workspace?: string;
};

export type GitDiffPayload = {
  path: string;
  workspace?: string;
};

export type GitCreateBranchPayload = {
  name: string;
  workspace?: string;
};

export type GitCheckoutBranchPayload = {
  name: string;
  workspace?: string;
};

export type GitDeleteBranchPayload = {
  name: string;
  force?: boolean;
  workspace?: string;
};

export type GitRenameBranchPayload = {
  name: string;
  workspace?: string;
};

export type GitMergePayload = {
  sourceBranch: string;
  message?: string;
  workspace?: string;
};

export type GitRebasePayload = {
  branch: string;
  workspace?: string;
};

export type GitFetchPayload = {
  workspace?: string;
};

export type GitPullPayload = {
  rebase?: boolean;
  workspace?: string;
};

export type GitPushPayload = {
  tags?: boolean;
  branch?: string;
  upstream?: boolean;
  workspace?: string;
};

export type GitRemotePayload = {
  name: string;
  url: string;
  workspace?: string;
};

export type GitLogPayload = {
  limit?: number;
  skip?: number;
  workspace?: string;
};

export type Team = {
  name: string;
  leaderBranch: string;
  subBranches: string[];
  createdAt: string;
};

export type TeamBranch = {
  name: string;
  current: boolean;
  isLeader: boolean;
  subBranchName: string | null;
};

export type TeamPR = {
  id: string;
  title: string;
  state: string;
  fromBranch: string;
  toBranch: string;
  url: string;
  createdAt: string;
  author: string;
};

export type TeamCommit = {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  body?: string;
  branch: string;
};

export type CreateTeamPayload = {
  name: string;
};

export type CreateTeamBranchPayload = {
  teamName: string;
  subBranchName: string;
};

export type CreateTeamPRPayload = {
  teamName: string;
  fromBranch: string;
  title: string;
  description?: string;
};

export type MergeTeamPRPayload = {
  teamName: string;
  prId: string;
  approved: boolean;
};

export type ListTeamBranchesPayload = {
  teamName: string;
};

export type ListTeamCommitsPayload = {
  teamName: string;
};

export type ListTeamPRsPayload = {
  teamName: string;
};

export type PromptBuildOptions = {
  variables?: Record<string, string>;
};

export type PromptBuildResult = {
  template: string;
  variables: PromptVariableTrace[];
  systemPrompt: string;
  steps: PromptBuildStep[];
};

export type PromptVariableTrace = {
  var: string;
  before: string;
  after: string;
};

export type PromptBuildStep = {
  name: string;
  content: string;
  trace?: PromptVariableTrace[];
};

export type PromptFile = {
  path: string;
  name: string;
  category: "system" | "behaviour" | "project";
};

export type PromptFileContent = {
  path: string;
  content: string;
};

export type PromptWritePayload = {
  path: string;
  content: string;
};

export type DatabaseTeam = {
  id: string;
  name: string;
  leader_branch: string;
  leader_agent_id: string | null;
  created_at: string;
};

export type DatabaseAgent = {
  id: string;
  team_id: string;
  name: string;
  branch: string;
  role: string;
  created_at: string;
};

export type DatabaseApproval = {
  id: string;
  team_id: string;
  action_id: string;
  action_type: string;
  risk_level: string;
  approver_role: string;
  approver_id: string | null;
  comments: string | null;
  timestamp: string;
  escalated_from: string | null;
};

export type DatabaseAgentTask = {
  id: string;
  agent_id: string;
  title: string;
  status: string;
  parent_task_id: string | null;
  team_id: string;
  branch: string;
  created_at: string;
};

export type DatabaseMemoryDocument = {
  id: string;
  workspace: string;
  area: string;
  content: string;
  embeddings: Buffer | null;
  metadata: string | null;
  timestamp: string;
};

export type DatabaseKnowledgeFile = {
  id: string;
  workspace: string;
  filename: string;
  checksum: string;
  imported_at: string;
  state: string;
};

export type DatabaseHook = {
  id: string;
  name: string;
  handler_file: string;
  priority: number;
  enabled: boolean;
};

export type DatabasePlugin = {
  id: string;
  name: string;
  version: string;
  manifest_json: string;
  enabled: boolean;
  installed_at: string;
};

export type MigrationInfo = {
  currentVersion: number;
  totalMigrations: number;
  appliedMigrations: {
    version: number;
    name: string;
    appliedAt: string;
  }[];
  pendingMigrations: {
    version: number;
    name: string;
  }[];
};

export type DatabaseBackup = {
  filename: string;
  path: string;
  size: number;
  created: Date;
};

export type CreateDatabaseTeamPayload = {
  name: string;
  leaderBranch: string;
  leaderAgentId?: string;
};

export type CreateDatabaseAgentPayload = {
  team_id: string;
  name: string;
  branch: string;
  role: string;
};

export type CreateDatabaseApprovalPayload = {
  team_id: string;
  action_id: string;
  action_type: string;
  risk_level: string;
  approver_role: string;
  approver_id?: string;
  comments?: string;
  escalated_from?: string;
};

export type CreateDatabaseAgentTaskPayload = {
  agent_id: string;
  title: string;
  status: string;
  parent_task_id?: string;
  team_id: string;
  branch: string;
};

export type CreateMemoryDocumentPayload = {
  workspace: string;
  area?: string;
  content: string;
  embeddings?: Buffer;
  metadata?: string;
};

export type CreateKnowledgeFilePayload = {
  workspace: string;
  filename: string;
  checksum: string;
  state?: string;
};

export type CreateHookPayload = {
  name: string;
  handler_file: string;
  priority?: number;
  enabled?: boolean;
};

export type CreatePluginPayload = {
  name: string;
  version: string;
  manifest_json: string;
  enabled?: boolean;
};

export type UpdateDatabaseTaskPayload = {
  id: string;
  status?: string;
  agent_id?: string;
  branch?: string;
  team_id?: string;
};

export type ListBackupsPayload = {
  workspace: string;
};

export type RestoreBackupPayload = {
  backupPath: string;
  targetPath: string;
};

export type RollbackMigrationPayload = {
  targetVersion: number;
};

export type MemoryArea = 'MAIN' | 'FRAGMENTS' | 'SOLUTIONS' | 'INSTRUMENTS' | 'KNOWLEDGE';

export type MemoryItem = {
  id: string;
  text: string;
  metadata: Record<string, any>;
  area: MemoryArea;
  created_at: string;
  score?: number;
};

export type MemorySearchPayload = {
  query: string;
  limit?: number;
  threshold?: number;
  area?: MemoryArea;
};

export type MemoryInsertPayload = {
  texts: string[];
  metadata?: {
    area?: MemoryArea;
    [key: string]: any;
  };
};

export type MemoryDeletePayload = {
  ids: string[];
};

export type MemoryDeleteByQueryPayload = {
  query?: string;
  area?: MemoryArea;
};

export type MemoryStats = {
  [K in MemoryArea]: number;
};

export type KnowledgeImportResult = {
  imported: number;
  skipped: number;
  errors: Array<{ path: string; error: string }>;
};

export type Plugin = {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  scope: "user" | "workspace";
  manifest?: PluginManifest;
};

export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  main?: string;
  contributes?: {
    hooks?: PluginHook[];
    tools?: PluginTool[];
    instruments?: PluginInstrument[];
  };
  permissions?: string[];
  dependencies?: Record<string, string>;
  engines?: {
    node?: string;
    autocode?: string;
  };
  files?: PluginFile[];
};

export type PluginHook = {
  name: string;
  priority?: number;
};

export type PluginTool = {
  id: string;
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  permissions?: string[];
};

export type PluginInstrument = {
  id: string;
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
};

export type PluginFile = {
  path: string;
  url: string;
  sha256?: string;
  size?: number;
};

export type PluginToolDefinition = {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  permissions: string[];
};

export type PluginInstrumentDefinition = {
  id: string;
  name: string;
  description: string;
  procedure: string;
  parameters: Record<string, unknown>;
};

export type PluginInstallResult = {
  success: boolean;
  pluginId?: string;
  error?: string;
};

export type PluginUninstallResult = {
  success: boolean;
  pluginId?: string;
  error?: string;
};

export type WorkflowTaskItem = {
  id: string;
  sessionId: string;
  title: string;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'blocked' | 'awaiting_approval';
  parentTaskId?: string | null;
  agentId?: string | null;
  branch?: string | null;
  teamId?: string | null;
  priority?: number;
  dependencies?: string[];
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type AgentConfig = {
  profile: string;
  level: string;
  context: Record<string, any>;
  superior?: string | null;
  subordinates?: string[];
};

export type AgentState = {
  id: string;
  profile: string;
  level: string;
  context: Record<string, any>;
  superior?: string | null;
  subordinates: string[];
  status: 'idle' | 'active' | 'paused' | 'blocked';
  currentTaskId?: string | null;
  created_at: string;
};

export type MonologueEntry = {
  id: string;
  agentId: string;
  message: string;
  timestamp: string;
};

export type ToolExecution = {
  id: string;
  sessionId?: string | null;
  toolName: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: any;
  metadata: Record<string, any>;
  startedAt: string;
  completedAt?: string | null;
};

export type ToolEvent = {
  id: string;
  sessionId?: string | null;
  toolId: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  metadata: Record<string, any>;
  timestamp: string;
};

export type Intervention = {
  id: string;
  sessionId: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
};

export type WorkflowSession = {
  id: string;
  prompt: string;
  status: 'initialized' | 'active' | 'paused' | 'completed' | 'failed';
  createdAt: string;
  updatedAt?: string | null;
  tasks: WorkflowTaskItem[];
  agents: AgentState[];
  toolExecutions: ToolExecution[];
  broadcastLevel: 'normal' | 'urgent' | 'critical';
};

export type EventFilter = {
  sessionId?: string;
  toolId?: string;
  level?: string;
  startTime?: string;
  endTime?: string;
};

export type EventStats = {
  info?: number;
  warning?: number;
  error?: number;
  debug?: number;
};

export type TimelineEntry = {
  time: string;
  info: number;
  warning: number;
  error: number;
  debug: number;
};

export type CreateTaskPayload = {
  sessionId: string;
  title: string;
  parentTaskId?: string | null;
  agentId?: string | null;
  branch?: string | null;
  teamId?: string | null;
  priority?: number;
  dependencies?: string[];
};

export type LogEventPayload = {
  toolId: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, any>;
  sessionId?: string;
};

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RiskLevelInfo = {
  level: RiskLevel;
  label: string;
  description: string;
  autoApprove: boolean;
  requiredApprover: "lead" | "manager" | "vp" | "user" | null;
  color: string;
};

export type ApprovalRiskAssessment = {
  riskLevel: RiskLevel;
  autoApprove: boolean;
  requiredApprover?: "lead" | "manager" | "vp" | "user" | null;
  matchedIndicator?: any;
  riskInfo?: RiskLevelInfo;
};

export type ApprovalCreatePayload = {
  actionId: string;
  actionType: string;
  actionDescription?: string;
  riskLevel: RiskLevel;
  diffPreview?: string;
  agentRationale?: string;
  bundleId?: string | null;
};

export type ApprovalQueueItem = {
  id: string;
  actionId: string;
  actionType: string;
  actionDescription?: string;
  riskLevel: RiskLevel;
  diffPreview?: string;
  agentRationale?: string;
  bundleId?: string | null;
  created_at: string;
  status: "pending" | "approved" | "rejected" | "escalated";
};

export type ApprovalApprovePayload = {
  approvalId: string;
  approver: string;
  approverRole: "lead" | "manager" | "vp" | "user";
  comments?: string;
};

export type ApprovalRejectPayload = {
  approvalId: string;
  approver: string;
  approverRole: "lead" | "manager" | "vp" | "user";
  comments?: string;
};

export type ApprovalEscalatePayload = {
  approvalId: string;
  escalatedTo: "lead" | "manager" | "vp" | "user";
  reason: string;
  escalatedBy: string;
};

export type ApprovalRecord = {
  id: string;
  actionId: string;
  actionType: string;
  riskLevel: RiskLevel;
  approver: string;
  approverRole: "lead" | "manager" | "vp" | "user";
  approvalLevel: string;
  comments?: string;
  escalatedFrom?: string;
  created_at: string;
};

export type ApprovalHistoryFilters = {
  actionType?: string;
  riskLevel?: RiskLevel;
  approver?: string;
  approverRole?: "lead" | "manager" | "vp" | "user";
  startTime?: string;
  endTime?: string;
  limit?: number;
};

export type EscalationRecord = {
  id: string;
  actionId: string;
  originalRiskLevel: RiskLevel;
  escalatedTo: string;
  reason: string;
  escalatedBy: string;
  created_at: string;
  resolved: number;
};

export type EscalationFilters = {
  actionId?: string;
  includeResolved?: boolean;
  limit?: number;
};

export type ApprovalRule = {
  id: string;
  rule_name: string;
  action_type: string;
  risk_level: RiskLevel;
  auto_approve: number;
  pattern: string | null;
  created_at: string;
  updated_at: string;
};

export type ApprovalCreateRulePayload = {
  ruleName: string;
  actionType: string;
  riskLevel: RiskLevel;
  autoApprove: boolean;
  pattern?: string | null;
};

export type ApprovalUpdateRulePayload = {
  ruleId: string;
  ruleName?: string;
  riskLevel?: RiskLevel;
  autoApprove?: boolean;
  pattern?: string | null;
};

export type BulkApprovePayload = {
  bundleId: string;
  approver: string;
  approverRole: "lead" | "manager" | "vp" | "user";
  comments?: string;
  vetoIds?: string[];
};

export type BulkRejectPayload = {
  bundleId: string;
  approver: string;
  approverRole: "lead" | "manager" | "vp" | "user";
  comments?: string;
};
