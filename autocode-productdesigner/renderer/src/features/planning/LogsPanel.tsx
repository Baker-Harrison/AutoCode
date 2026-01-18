import { memo, useEffect, useState } from "react";
import type { EventLog } from "@autocode/types";
import { Trash2, Info, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogsPanelProps {
  sessionId: string | null;
  className?: string;
}

const levelIcons = {
  info: Info,
  warn: AlertTriangle,
  error: XCircle,
};

const levelColors = {
  info: "text-blue-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

export const LogsPanel = memo(function LogsPanel({
  sessionId,
  className
}: LogsPanelProps) {
  const [logs, setLogs] = useState<EventLog[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const events = await window.ide.listEvents(sessionId);
        setLogs(events);
      } catch (error) {
        console.error("Failed to fetch logs", error);
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleClear = async () => {
    try {
      await window.ide.clearLogs();
      setLogs([]);
    } catch (error) {
      console.error("Failed to clear logs", error);
    }
  };

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="flex items-center justify-between border-b border-zed-border-alt px-3 py-1">
        <span className="text-[11px] uppercase tracking-wide text-zed-text-muted">Logs</span>
        <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 px-2 text-xs">
          <Trash2 size={12} className="mr-1" />
          Clear
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-1">
        {logs.length === 0 ? (
          <div className="text-xs text-zed-text-muted text-center py-4">No logs yet</div>
        ) : (
          logs.map((log) => {
            const Icon = levelIcons[log.level as keyof typeof levelIcons] || Info;
            return (
              <div key={log.id} className="flex items-start gap-2 text-xs">
                <Icon size={12} className={levelColors[log.level as keyof typeof levelColors] || "text-zed-text-muted"} />
                <div>
                  <span className="text-zed-text-muted">[{log.created_at.split("T")[1].split(".")[0]}]</span>
                  <span className="ml-2 text-zed-text">{log.message}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
