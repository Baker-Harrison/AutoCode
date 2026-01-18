import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ToolStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

interface ToolCall {
  id: string;
  toolName: string;
  status: ToolStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  input: string;
  output?: string;
  error?: string;
  agentId: string;
  branchId?: string;
}

interface ToolTimelineProps {
  toolCalls: ToolCall[];
}

const statusColors: Record<ToolStatus, string> = {
  pending: "bg-zed-element text-zed-text-muted border-zed-border",
  running: "bg-blue-500/20 text-blue-200 border-blue-500/30",
  completed: "bg-green-500/20 text-green-200 border-green-500/30",
  failed: "bg-red-500/20 text-red-200 border-red-500/30",
  cancelled: "bg-gray-500/20 text-gray-300 border-gray-500/30"
};

const getDurationColor = (duration: number): string => {
  if (duration < 100) return "text-green-400";
  if (duration < 500) return "text-amber-400";
  return "text-red-400";
};

export const ToolTimeline = ({ toolCalls }: ToolTimelineProps) => {
  const [selectedCall, setSelectedCall] = useState<string | null>(null);

  const selectedTool = toolCalls.find((call) => call.id === selectedCall);

  const totalDuration = toolCalls
    .filter((call) => call.duration)
    .reduce((acc, call) => acc + (call.duration || 0), 0);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tool Invocation Timeline</CardTitle>
            <div className="text-xs text-zed-text-muted font-mono">
              Total: {toolCalls.length} calls · {totalDuration.toFixed(2)}ms
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-zed-border" />
              <div className="space-y-2">
                {toolCalls.map((call, index) => (
                  <div
                    key={call.id}
                    onClick={() => setSelectedCall(call.id)}
                    className={`
                      relative pl-10 pr-4 py-3 rounded-md border cursor-pointer transition-all
                      ${selectedCall === call.id ? "bg-zed-element-hover border-zed-border-focused" : "bg-zed-element border-zed-border hover:border-zed-border-alt"}
                    `}
                  >
                    <div className="absolute left-0 top-3 w-4 h-4 rounded-full border-2 flex items-center justify-center bg-zed-panel">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          call.status === "running"
                            ? "bg-blue-400 animate-pulse"
                            : call.status === "completed"
                            ? "bg-green-400"
                            : call.status === "failed"
                            ? "bg-red-400"
                            : "bg-zed-text-muted"
                        }`}
                      />
                    </div>

                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-zed-text">{call.toolName}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md border ${statusColors[call.status]}`}
                        >
                          {call.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-zed-text-muted font-mono">
                        {new Date(call.startTime).toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-zed-text-muted">Agent: {call.agentId}</span>
                      {call.branchId && (
                        <span className="text-zed-text-muted">Branch: {call.branchId}</span>
                      )}
                      {call.duration && (
                        <span className={getDurationColor(call.duration)}>{call.duration.toFixed(2)}ms</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedTool && (
              <div className="border-t border-zed-border-alt pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zed-text-muted font-mono">
                    DETAILS: {selectedTool.toolName}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCall(null)}>
                    Close
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-zed-element rounded-md">
                    <div className="text-xs text-zed-text-muted font-mono mb-2">INPUT</div>
                    <pre className="text-sm text-zed-text overflow-x-auto font-mono whitespace-pre-wrap">
                      {selectedTool.input}
                    </pre>
                  </div>

                  {selectedTool.output && (
                    <div className="p-3 bg-zed-element rounded-md">
                      <div className="text-xs text-zed-text-muted font-mono mb-2">OUTPUT</div>
                      <pre className="text-sm text-zed-text overflow-x-auto font-mono whitespace-pre-wrap">
                        {selectedTool.output}
                      </pre>
                    </div>
                  )}

                  {selectedTool.error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                      <div className="text-xs text-red-300 font-mono mb-2">ERROR</div>
                      <pre className="text-sm text-red-200 overflow-x-auto font-mono whitespace-pre-wrap">
                        {selectedTool.error}
                      </pre>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-4 text-xs p-3 bg-zed-element rounded-md">
                    <div>
                      <span className="text-zed-text-muted block">Status</span>
                      <span className="text-zed-text font-mono">{selectedTool.status}</span>
                    </div>
                    <div>
                      <span className="text-zed-text-muted block">Started</span>
                      <span className="text-zed-text font-mono">
                        {new Date(selectedTool.startTime).toLocaleTimeString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-zed-text-muted block">Ended</span>
                      <span className="text-zed-text font-mono">
                        {selectedTool.endTime
                          ? new Date(selectedTool.endTime).toLocaleTimeString()
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-zed-text-muted block">Duration</span>
                      <span
                        className={`font-mono ${
                          selectedTool.duration ? getDurationColor(selectedTool.duration) : ""
                        }`}
                      >
                        {selectedTool.duration ? `${selectedTool.duration.toFixed(2)}ms` : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
