import { useEffect, useState, useRef, useCallback } from "react";
import type { EventLog } from "@/types/ipc";
import { useToast } from "@/components/ui/toast";
import { Search, Filter, Trash2, Download, ChevronDown, ChevronUp, Pause, Play, Clock } from "lucide-react";

type LogLevel = "info" | "warn" | "error" | "debug" | "all";

interface LogsPanelProps {
  sessionId: string | null;
}

const LOG_LEVELS: LogLevel[] = ["info", "warn", "error", "debug"];

const getLevelColor = (level: string): string => {
  switch (level.toLowerCase()) {
    case "info":
      return "text-blue-400";
    case "warn":
    case "warning":
      return "text-yellow-400";
    case "error":
      return "text-red-400";
    case "debug":
      return "text-purple-400";
    default:
      return "text-zed-text-muted";
  }
};

const getLevelBgColor = (level: string): string => {
  switch (level.toLowerCase()) {
    case "info":
      return "bg-blue-400/10";
    case "warn":
    case "warning":
      return "bg-yellow-400/10";
    case "error":
      return "bg-red-400/10";
    case "debug":
      return "bg-purple-400/10";
    default:
      return "bg-zed-bg-tertiary";
  }
};

export const LogsPanel = ({ sessionId }: LogsPanelProps) => {
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<EventLog[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<LogLevel>("all");
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const fetchLogs = useCallback(async () => {
    try {
      const entries = await window.ide.listEvents(sessionId);
      const sortedLogs = entries.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setLogs(sortedLogs);
    } catch (error) {
      showToast("Failed to load logs", "error");
      console.error(error);
    }
  }, [sessionId, showToast]);

  useEffect(() => {
    let isMounted = true;
    fetchLogs();
    return () => {
      isMounted = false;
    };
  }, [fetchLogs]);

  useEffect(() => {
    let filtered = logs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(query) ||
          log.level.toLowerCase().includes(query)
      );
    }

    if (levelFilter !== "all") {
      filtered = filtered.filter((log) => log.level.toLowerCase() === levelFilter);
    }

    setFilteredLogs(filtered);
  }, [logs, searchQuery, levelFilter]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredLogs, autoScroll]);

  const clearLogs = async () => {
    try {
      await window.ide.clearLogs();
      setLogs([]);
      setFilteredLogs([]);
      showToast("Logs cleared", "success");
    } catch (error) {
      showToast("Failed to clear logs", "error");
      console.error(error);
    }
  };

  const exportLogs = () => {
    const content = filteredLogs
      .map(
        (log) =>
          `[${log.created_at}] [${log.level.toUpperCase()}] ${log.message}`
      )
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast("Logs exported", "success");
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3
      });
    } catch {
      return timestamp;
    }
  };

  const toggleExpanded = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const scrollToBottom = () => {
    setAutoScroll(true);
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleLogClick = (log: EventLog) => {
    if (log.message.length > 200 || log.message.includes("\n")) {
      toggleExpanded(log.id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-zed-bg">
      <div className="flex items-center gap-2 px-3 py-2 bg-zed-bg-tertiary border-b border-zed-border">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-zed-text-muted"
          />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs bg-zed-bg-secondary text-zed-text border border-zed-border rounded focus:outline-none focus:border-zed-primary"
          />
        </div>

        <button
          className={`p-1.5 rounded transition-colors ${
            showFilters ? "bg-zed-bg-secondary" : "hover:bg-zed-bg-secondary"
          }`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={14} className="text-zed-text-muted" />
        </button>

        <button
          className="p-1.5 rounded hover:bg-zed-bg-secondary transition-colors"
          onClick={scrollToBottom}
          title={autoScroll ? "Auto-scroll enabled" : "Click to enable auto-scroll"}
        >
          {autoScroll ? (
            <Play size={14} className="text-green-400" />
          ) : (
            <Pause size={14} className="text-zed-text-muted" />
          )}
        </button>

        <button
          className="p-1.5 rounded hover:bg-zed-bg-secondary transition-colors"
          onClick={exportLogs}
          title="Export logs"
        >
          <Download size={14} className="text-zed-text-muted" />
        </button>

        <button
          className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
          onClick={clearLogs}
          title="Clear logs"
        >
          <Trash2 size={14} className="text-red-400" />
        </button>
      </div>

      {showFilters && (
        <div className="flex items-center gap-3 px-3 py-2 bg-zed-bg-secondary border-b border-zed-border text-xs">
          <span className="text-zed-text-muted">Level:</span>
          <div className="flex gap-1">
            <button
              className={`px-2 py-0.5 rounded ${
                levelFilter === "all"
                  ? "bg-zed-primary text-white"
                  : "text-zed-text-muted hover:text-zed-text"
              }`}
              onClick={() => setLevelFilter("all")}
            >
              All
            </button>
            {LOG_LEVELS.map((level) => (
              <button
                key={level}
                className={`px-2 py-0.5 rounded uppercase ${
                  levelFilter === level
                    ? "bg-zed-primary text-white"
                    : "text-zed-text-muted hover:text-zed-text"
                }`}
                onClick={() => setLevelFilter(level)}
              >
                {level}
              </button>
            ))}
          </div>

          <span className="ml-auto text-zed-text-muted">
            {filteredLogs.length} / {logs.length} entries
          </span>
        </div>
      )}

      <div className="flex-1 overflow-auto p-3">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zed-text-muted text-xs">
            <Clock size={32} className="mb-2 opacity-50" />
            <div>No logs yet.</div>
            {searchQuery || levelFilter !== "all" ? (
              <div className="mt-1 text-zed-text-muted/70">
                Try adjusting your filters
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`group rounded px-2 py-1 cursor-pointer transition-colors ${
                  expandedLogId === log.id
                    ? getLevelBgColor(log.level)
                    : "hover:bg-zed-bg-secondary"
                }`}
                onClick={() => handleLogClick(log)}
              >
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-zed-text-muted font-mono whitespace-nowrap flex items-center gap-1">
                    <Clock size={10} />
                    {formatTimestamp(log.created_at)}
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase whitespace-nowrap ${getLevelColor(
                      log.level
                    )}`}
                  >
                    [{log.level}]
                  </span>
                  {log.session_id && (
                    <span className="text-[9px] text-zed-text-muted/70 font-mono">
                      {log.session_id.slice(0, 8)}
                    </span>
                  )}
                  <span className="text-xs text-zed-text flex-1 break-all font-mono">
                    {expandedLogId === log.id ? log.message : log.message.slice(0, 200)}
                    {expandedLogId !== log.id && log.message.length > 200 && "..."}
                  </span>
                  {log.message.length > 200 && (
                    <span className="text-zed-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      {expandedLogId === log.id ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};
