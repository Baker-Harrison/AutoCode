import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AgentState = "idle" | "thinking" | "working" | "paused" | "error" | "completed";

interface MonologueEntry {
  id: string;
  timestamp: number;
  content: string;
  agentId: string;
}

interface SubordinateAgent {
  id: string;
  name: string;
  state: AgentState;
  parentId: string;
}

interface AgentStateMachineProps {
  agentId: string;
  state: AgentState;
  monologue: MonologueEntry[];
  subordinates: SubordinateAgent[];
  onPause?: () => void;
  onResume?: () => void;
}

const stateColors: Record<AgentState, { bg: string; text: string; border: string }> = {
  idle: { bg: "bg-gray-500/20", text: "text-gray-300", border: "border-gray-500/30" },
  thinking: { bg: "bg-purple-500/20", text: "text-purple-200", border: "border-purple-500/30" },
  working: { bg: "bg-blue-500/20", text: "text-blue-200", border: "border-blue-500/30" },
  paused: { bg: "bg-amber-500/20", text: "text-amber-200", border: "border-amber-500/30" },
  error: { bg: "bg-red-500/20", text: "text-red-200", border: "border-red-500/30" },
  completed: { bg: "bg-green-500/20", text: "text-green-200", border: "border-green-500/30" }
};

export const AgentStateMachine = ({
  agentId,
  state,
  monologue,
  subordinates,
  onPause,
  onResume
}: AgentStateMachineProps) => {
  const stateColor = stateColors[state];

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>Agent State Machine</CardTitle>
              <span
                className={`px-3 py-1 rounded-md border text-xs font-mono ${stateColor.bg} ${stateColor.text} ${stateColor.border}`}
              >
                {state.toUpperCase()}
              </span>
            </div>
            <div className="flex gap-2">
              {state === "working" || state === "thinking" ? (
                <Button variant="secondary" size="sm" onClick={onPause}>
                  Pause
                </Button>
              ) : state === "paused" ? (
                <Button variant="default" size="sm" onClick={onResume}>
                  Resume
                </Button>
              ) : null}
            </div>
          </div>
          <div className="text-xs text-zed-text-muted font-mono mt-2">Agent ID: {agentId}</div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="border-b border-zed-border-alt pb-4">
                <div className="text-xs text-zed-text-muted font-mono mb-3">MONOLOGUE STREAM</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {monologue.length === 0 ? (
                    <div className="text-sm text-zed-text-muted text-center py-4">
                      No monologue entries
                    </div>
                  ) : (
                    monologue.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 bg-zed-element rounded-md border border-zed-border-alt"
                      >
                        <div className="text-xs text-zed-text-muted font-mono mb-1">
                          {new Date(entry.timestamp).toLocaleTimeString()} · {entry.agentId}
                        </div>
                        <div className="text-sm text-zed-text">{entry.content}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs text-zed-text-muted font-mono mb-3">SUBORDINATES</div>
                {subordinates.length === 0 ? (
                  <div className="text-sm text-zed-text-muted text-center py-4">
                    No subordinate agents
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subordinates.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-3 bg-zed-element rounded-md border border-zed-border-alt"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              sub.state === "working" || sub.state === "thinking"
                                ? "bg-blue-400 animate-pulse"
                                : sub.state === "paused"
                                ? "bg-amber-400"
                                : sub.state === "error"
                                ? "bg-red-400"
                                : sub.state === "completed"
                                ? "bg-green-400"
                                : "bg-gray-400"
                            }`}
                          />
                          <div>
                            <div className="text-sm text-zed-text font-mono">{sub.id}</div>
                            <div className="text-xs text-zed-text-muted">{sub.name}</div>
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-md border ${stateColors[sub.state].bg} ${stateColors[sub.state].text} ${stateColors[sub.state].border}`}
                        >
                          {sub.state.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-zed-element rounded-md">
                <div className="text-xs text-zed-text-muted font-mono mb-3">STATE DIAGRAM</div>
                <div className="relative">
                  <div className="flex flex-wrap gap-3 justify-center">
                    {[
                      { label: "IDLE", state: "idle" },
                      { label: "THINKING", state: "thinking" },
                      { label: "WORKING", state: "working" },
                      { label: "PAUSED", state: "paused" },
                      { label: "ERROR", state: "error" },
                      { label: "COMPLETED", state: "completed" }
                    ].map((s) => (
                      <div
                        key={s.state}
                        className={`
                          px-3 py-2 rounded-md border text-xs font-mono transition-all
                          ${state === s.state ? "scale-110 ring-2 ring-zed-border-focused" : ""}
                          ${stateColors[s.state].bg} ${stateColors[s.state].text} ${stateColors[s.state].border}
                        `}
                      >
                        {s.label}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 text-center">
                    <div className="text-xs text-zed-text-muted mb-2">Current State</div>
                    <div
                      className={`inline-block px-4 py-2 rounded-md border text-sm font-mono ${stateColor.bg} ${stateColor.text} ${stateColor.border}`}
                    >
                      {state.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zed-element rounded-md">
                  <div className="text-xs text-zed-text-muted block">Total Entries</div>
                  <div className="text-lg text-zed-text font-mono">{monologue.length}</div>
                </div>
                <div className="p-3 bg-zed-element rounded-md">
                  <div className="text-xs text-zed-text-muted block">Subordinates</div>
                  <div className="text-lg text-zed-text font-mono">{subordinates.length}</div>
                </div>
                <div className="p-3 bg-zed-element rounded-md">
                  <div className="text-xs text-zed-text-muted block">Active Subordinates</div>
                  <div className="text-lg text-zed-text font-mono">
                    {
                      subordinates.filter((s) => s.state === "working" || s.state === "thinking")
                        .length
                    }
                  </div>
                </div>
                <div className="p-3 bg-zed-element rounded-md">
                  <div className="text-xs text-zed-text-muted block">Completed Subordinates</div>
                  <div className="text-lg text-zed-text font-mono">
                    {subordinates.filter((s) => s.state === "completed").length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
