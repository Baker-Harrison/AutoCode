import { ChevronRight, GitCommit, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { TeamActivity, AgentStream, TaskQueueItem, RecentCommit } from "@/types/observer";

interface ActivityByTeamProps {
  teamActivity: TeamActivity | null;
}

interface StreamCardProps {
  stream: AgentStream;
  isLead: boolean;
}

function StreamCard({ stream, isLead }: StreamCardProps) {
  return (
    <div
      className={`rounded-xl border ${
        isLead
          ? "border-zed-border bg-zed-element/80"
          : "border-zed-border-alt bg-zed-element/60"
      } p-4`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${isLead ? "text-zed-text" : "text-zed-text-muted"}`}>
            {stream.agentName}
          </span>
          {isLead && (
            <span className="rounded-full bg-zed-accent/20 px-2 py-0.5 text-[10px] text-zed-accent">
              Lead Agent
            </span>
          )}
        </div>
        <span className="text-[10px] text-zed-text-muted">{stream.timestamp}</span>
      </div>
      <div className={`text-sm leading-relaxed ${isLead ? "text-zed-text" : "text-zed-text-muted"}`}>
        {stream.content}
      </div>
      {stream.confidence !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-zed-border">
            <div
              className="h-1.5 rounded-full bg-zed-accent"
              style={{ width: `${stream.confidence * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-zed-text-muted">{Math.round(stream.confidence * 100)}%</span>
        </div>
      )}
    </div>
  );
}

interface TaskItemProps {
  task: TaskQueueItem;
}

function TaskItem({ task }: TaskItemProps) {
  const statusIcons = {
    queued: Clock,
    in_progress: GitCommit,
    completed: CheckCircle2,
    failed: AlertTriangle,
  };
  const StatusIcon = statusIcons[task.status];
  const statusColors = {
    queued: "text-zed-text-muted",
    in_progress: "text-blue-400",
    completed: "text-green-400",
    failed: "text-red-400",
  };
  const priorityBars = {
    low: "bg-zed-border",
    medium: "bg-zed-border-alt",
    high: "bg-amber-400/60",
    critical: "bg-red-400/60",
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-zed-border-alt bg-zed-element/60 px-3 py-2">
      <span className={`mt-1 h-8 w-1 rounded-full ${priorityBars[task.priority]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-zed-text truncate">{task.title}</span>
          {task.estimatedDuration && (
            <span className="text-[10px] text-zed-text-muted flex-shrink-0">{task.estimatedDuration}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <StatusIcon size={12} className={statusColors[task.status]} />
          <span className="text-[10px] text-zed-text-muted">{task.assignedTo}</span>
        </div>
      </div>
    </div>
  );
}

interface CommitCardProps {
  commit: RecentCommit;
}

function CommitCard({ commit }: CommitCardProps) {
  return (
    <div className="rounded-xl border border-zed-border-alt bg-zed-element/60 px-3 py-2">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1">
          <GitCommit size={12} className="text-zed-accent" />
          <span className="text-xs font-mono text-zed-text-muted">{commit.shortHash}</span>
        </div>
        <span className="text-[10px] text-zed-text-muted">{commit.timestamp}</span>
      </div>
      <div className="text-sm text-zed-text truncate">{commit.message}</div>
      <div className="flex items-center gap-1 mt-1">
        <span className="text-[10px] text-zed-text-muted">{commit.author}</span>
        {commit.files.length > 0 && (
          <span className="text-[10px] text-zed-text-muted">· {commit.files.length} files</span>
        )}
      </div>
    </div>
  );
}

export function ActivityByTeam({ teamActivity }: ActivityByTeamProps) {
  if (!teamActivity) {
    return (
      <div className="flex h-full items-center justify-center text-zed-text-muted text-xs">
        Select a team to view activity
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-5 gap-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-zed-text-muted">Lead Agent</div>
          <div className="mt-2 text-lg font-semibold text-zed-text">{teamActivity.leadMonologue.agentName}</div>
        </div>
        <span className="rounded-full border border-zed-border bg-zed-element px-3 py-1 text-[11px] text-zed-text-muted">
          Active Focus
        </span>
      </div>

      <StreamCard stream={teamActivity.leadMonologue} isLead />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zed-text">
            <ChevronRight size={14} />
            <span>Sub-Agent Streams</span>
          </div>
          <div className="space-y-2">
            {teamActivity.subAgentStreams.map((stream) => (
              <div key={stream.id} className="rounded-xl border border-zed-border-alt bg-zed-element/60 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zed-text">{stream.agentName}</span>
                  <span className="text-[10px] text-zed-text-muted">{stream.timestamp}</span>
                </div>
                <div className="mt-1 text-[12px] text-zed-text-muted leading-relaxed">
                  {stream.content}
                </div>
              </div>
            ))}
            {teamActivity.subAgentStreams.length === 0 && (
              <div className="rounded-xl border border-dashed border-zed-border-alt bg-zed-element/40 px-3 py-3 text-[11px] text-zed-text-muted">
                No active sub-agent activity.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zed-text">
              <ChevronRight size={14} />
              <span>Task Queue</span>
              <span className="rounded-full bg-zed-element px-1.5 py-0.5 text-[10px] text-zed-text-muted">
                {teamActivity.taskQueue.length}
              </span>
            </div>
            <div className="space-y-2">
              {teamActivity.taskQueue.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
              {teamActivity.taskQueue.length === 0 && (
                <div className="rounded-xl border border-dashed border-zed-border-alt bg-zed-element/40 px-3 py-3 text-[11px] text-zed-text-muted">
                  No queued tasks.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zed-text">
              <ChevronRight size={14} />
              <span>Recent Commits</span>
            </div>
            <div className="space-y-2">
              {teamActivity.recentCommits.map((commit) => (
                <CommitCard key={commit.hash} commit={commit} />
              ))}
              {teamActivity.recentCommits.length === 0 && (
                <div className="rounded-xl border border-dashed border-zed-border-alt bg-zed-element/40 px-3 py-3 text-[11px] text-zed-text-muted">
                  No recent commits.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
