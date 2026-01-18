import { Terminal, FileText, PlayCircle, CheckCircle2, AlertTriangle, Search } from "lucide-react";
import type { LogEntry } from "@/types/observer";
import { useState } from "react";

type LogSource = "terminal" | "agent" | "task" | "run" | "all";

interface ExecutionLogProps {
  logs: LogEntry[];
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  onClearLogs: () => void;
}

const sourceIcons = {
  terminal: Terminal,
  agent: FileText,
  task: PlayCircle,
  run: CheckCircle2,
};

const sourceLabels: Record<LogSource, string> = {
  terminal: "Terminal",
  agent: "Agent Logs",
  task: "Tasks",
  run: "Runs",
  all: "All Streams",
};

const levelColors = {
  info: "text-zed-text-muted",
  warning: "text-amber-400",
  error: "text-red-400",
  debug: "text-zed-text-muted opacity-60",
};

interface LogLineProps {
  log: LogEntry;
}

function LogLine({ log }: LogLineProps) {
  const SourceIcon = sourceIcons[log.source];
  const LevelIcon =
    log.level === "error" ? AlertTriangle : log.level === "warning" ? AlertTriangle : null;

  return (
    <div className="flex items-start gap-3 px-4 py-2 hover:bg-zed-element/50">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zed-element">
        <SourceIcon size={12} className="text-zed-text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-zed-text-muted">
          <span className="font-mono">{log.timestamp}</span>
          <span className="rounded-full border border-zed-border px-2 py-0.5">{log.source}</span>
          {log.metadata?.teamId && (
            <span className="rounded-full bg-zed-element px-2 py-0.5">{log.metadata.teamId}</span>
          )}
          {log.metadata?.agentId && (
            <span className="rounded-full bg-zed-element px-2 py-0.5">{log.metadata.agentId}</span>
          )}
        </div>
        <div className={`mt-1 text-[12px] ${levelColors[log.level]} flex items-center gap-1`}>
          {LevelIcon && <LevelIcon size={10} />}
          {log.message}
        </div>
        {log.metadata?.command && (
          <div className="mt-1 rounded-md bg-zed-element/70 px-2 py-1 text-[10px] text-zed-text-muted font-mono">
            $ {log.metadata.command}
          </div>
        )}
        {log.metadata?.exitCode !== undefined && (
          <div className={`mt-1 text-[10px] ${log.metadata.exitCode === 0 ? "text-green-400" : "text-red-400"}`}>
            Exit code: {log.metadata.exitCode}
          </div>
        )}
      </div>
    </div>
  );
}

export function ExecutionLog({ logs, autoScroll, onToggleAutoScroll, onClearLogs }: ExecutionLogProps) {
  const [selectedSource, setSelectedSource] = useState<LogSource>("all");
  const [selectedLevel, setSelectedLevel] = useState<LogEntry["level"] | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = logs.filter((log) => {
    if (selectedSource !== "all" && log.source !== selectedSource) return false;
    if (selectedLevel !== "all" && log.level !== selectedLevel) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-zed-border-alt px-4 py-2 text-[10px] text-zed-text-muted">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "terminal", "agent", "task", "run"] as LogSource[]).map((source) => {
            const Icon = source === "all" ? Search : sourceIcons[source];
            return (
              <button
                key={source}
                onClick={() => setSelectedSource(source)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${
                  selectedSource === source
                    ? "bg-zed-element text-zed-text"
                    : "text-zed-text-muted hover:bg-zed-element-hover"
                }`}
              >
                <Icon size={12} />
                {sourceLabels[source]}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs..."
            className="h-7 min-w-[160px] rounded-md border border-zed-border bg-zed-element px-2 text-[10px] text-zed-text placeholder:text-zed-text-placeholder focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zed-border-focused"
          />
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as LogEntry["level"] | "all")}
            className="h-7 rounded-md border border-zed-border bg-zed-element px-2 text-[10px] text-zed-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zed-border-focused"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
          <button
            onClick={onToggleAutoScroll}
            className={`rounded-full px-2 py-1 transition-colors ${
              autoScroll ? "bg-zed-element text-zed-text" : "text-zed-text-muted hover:bg-zed-element-hover"
            }`}
          >
            Auto-scroll
          </button>
          <button
            onClick={onClearLogs}
            className="rounded-full px-2 py-1 text-zed-text-muted hover:bg-zed-element-hover"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-zed-bg">
        {filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-zed-text-muted text-[11px]">
            {logs.length === 0 ? "Waiting for logs..." : "No logs match filters"}
          </div>
        ) : (
          <div className="divide-y divide-zed-border-alt">
            {filteredLogs.map((log) => (
              <LogLine key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
