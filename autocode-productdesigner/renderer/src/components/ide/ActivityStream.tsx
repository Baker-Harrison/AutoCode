import { useState, useEffect } from "react";

interface ActivityStreamProps {
  sessionId?: string;
}

interface ActivityEvent {
  id: string;
  level: "info" | "warning" | "error" | "debug";
  message: string;
  toolId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export function ActivityStream({ sessionId }: ActivityStreamProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<"all" | ActivityEvent["level"]>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 1000);
    return () => clearInterval(interval);
  }, [sessionId, filter]);

  const loadEvents = async () => {
    try {
      const level = filter === "all" ? undefined : filter;
      const data = await window.ide.eventsGetBySession(sessionId || null, level, 100);
      setEvents(data as ActivityEvent[]);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadEvents();
      return;
    }
    try {
      const data = await window.ide.eventsSearch(searchTerm, sessionId || null, 100);
      setEvents(data as ActivityEvent[]);
    } catch (error) {
      console.error("Error searching events:", error);
    }
  };

  const handleExport = async (format: "json" | "csv") => {
    try {
      const data = await window.ide.eventsExport(format, sessionId || null);
      const blob = new Blob([data], { type: format === "csv" ? "text/csv" : "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `events.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting events:", error);
    }
  };

  const handleClearEvents = async () => {
    if (!confirm("Are you sure you want to clear all events?")) {
      return;
    }
    try {
      await window.ide.eventsClear(sessionId || null);
      setEvents([]);
    } catch (error) {
      console.error("Error clearing events:", error);
    }
  };

  const getLevelColor = (level: ActivityEvent["level"]) => {
    const colors: Record<ActivityEvent["level"], string> = {
      info: "text-blue-400",
      warning: "text-amber-400",
      error: "text-red-400",
      debug: "text-zed-text-muted",
    };
    return colors[level];
  };

  const getLevelBg = (level: ActivityEvent["level"]) => {
    const colors: Record<ActivityEvent["level"], string> = {
      info: "bg-blue-900/40",
      warning: "bg-amber-900/40",
      error: "bg-red-900/40",
      debug: "bg-zed-element/60",
    };
    return colors[level];
  };

  useEffect(() => {
    if (autoScroll) {
      const container = document.getElementById("activity-stream-container");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [events, autoScroll]);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-zed-border-alt p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-zed-text-muted">Notifications</div>
            <div className="mt-1 text-sm font-semibold text-zed-text">Activity Stream</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("json")}
              className="rounded-md border border-zed-border-alt bg-zed-element px-3 py-1 text-[10px] text-zed-text-muted hover:bg-zed-element-hover"
            >
              Export JSON
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="rounded-md border border-zed-border-alt bg-zed-element px-3 py-1 text-[10px] text-zed-text-muted hover:bg-zed-element-hover"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] rounded-md border border-zed-border bg-zed-element px-3 py-2 text-xs text-zed-text placeholder:text-zed-text-placeholder focus:outline-none focus-visible:ring-1 focus-visible:ring-zed-border-focused"
          />
          <button
            onClick={handleSearch}
            className="rounded-md border border-zed-border-alt bg-zed-element px-3 py-2 text-xs text-zed-text hover:bg-zed-element-hover"
          >
            Search
          </button>
          <button
            onClick={() => setSearchTerm("")}
            className="rounded-md border border-zed-border-alt bg-zed-element px-3 py-2 text-xs text-zed-text-muted hover:bg-zed-element-hover"
          >
            Clear
          </button>
          <button
            onClick={handleClearEvents}
            className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-[10px] text-red-300 hover:bg-red-500/20"
          >
            Clear All
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["all", "info", "warning", "error", "debug"] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`rounded-full px-3 py-1 text-[10px] transition-colors ${
                filter === level
                  ? "bg-zed-element text-zed-text"
                  : "text-zed-text-muted hover:bg-zed-element-hover"
              }`}
            >
              {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-[10px] text-zed-text-muted">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="h-3 w-3 rounded border-zed-border bg-zed-element text-zed-accent"
            />
            Auto-scroll
          </label>
        </div>
      </div>

      <div
        id="activity-stream-container"
        className="flex-1 overflow-auto space-y-2 p-4"
      >
        {events.length === 0 ? (
          <div className="text-center text-zed-text-muted text-xs py-8">
            No events to display
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className={`${getLevelBg(event.level)} rounded-xl border border-zed-border-alt p-3`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold ${getLevelColor(event.level)}`}>
                      {event.level.toUpperCase()}
                    </span>
                    {event.toolId && (
                      <span className="text-[10px] text-zed-text-muted">
                        {event.toolId}
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-zed-text break-words">{event.message}</div>
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-[10px] text-zed-text-muted cursor-pointer">
                        Metadata
                      </summary>
                      <pre className="mt-1 text-[10px] text-zed-text-muted overflow-auto">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <div className="text-[10px] text-zed-text-muted whitespace-nowrap">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
