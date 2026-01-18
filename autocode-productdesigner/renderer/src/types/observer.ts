export type Team = {
  id: string;
  name: string;
  status: "active" | "idle" | "paused";
  leadAgent: string;
  subAgents: string[];
  activityCount: number;
};

export type AgentStream = {
  id: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  type: "monologue" | "message" | "decision";
  content: string;
  confidence?: number;
};

export type TeamActivity = {
  teamId: string;
  leadMonologue: AgentStream;
  subAgentStreams: AgentStream[];
  taskQueue: TaskQueueItem[];
  recentCommits: RecentCommit[];
};

export type TaskQueueItem = {
  id: string;
  title: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  assignedTo: string;
  priority: "low" | "medium" | "high" | "critical";
  estimatedDuration?: string;
  createdAt: string;
};

export type RecentCommit = {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  timestamp: string;
  files: string[];
};

export type ApprovalItem = {
  id: string;
  type: "escalation" | "lead_approval" | "task_completion";
  title: string;
  description: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  teamId: string;
  teamName: string;
  requester: string;
  createdAt: string;
  requiresAction: boolean;
  canAutoApprove: boolean;
  metadata?: Record<string, unknown>;
};

export type LogEntry = {
  id: string;
  source: "terminal" | "agent" | "task" | "run";
  timestamp: string;
  level: "info" | "warning" | "error" | "debug";
  message: string;
  metadata?: {
    teamId?: string;
    agentId?: string;
    taskId?: string;
    runId?: string;
    command?: string;
    exitCode?: number;
  };
};

export type ObserverMode = "autonomous" | "editor";
