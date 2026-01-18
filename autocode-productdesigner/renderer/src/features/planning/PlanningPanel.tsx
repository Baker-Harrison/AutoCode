import { memo, useCallback, useEffect, useState } from "react";
import type { PlanningSpec, TaskItem, PlanningQuestion } from "@autocode/types";
import { Play, CheckCircle2, Circle, ArrowRight, Loader2, Folder, FileText, GitBranch, Users, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface PlanningPanelProps {
  spec: PlanningSpec | null;
  tasks: TaskItem[];
  onSessionStart: (id: string) => void;
  onSpecReady: (spec: PlanningSpec) => void;
  className?: string;
}

export const PlanningPanel = memo(function PlanningPanel({
  spec,
  tasks,
  onSessionStart,
  onSpecReady,
  className
}: PlanningPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleStart = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const result = await window.ide.startPlanning(prompt);
      onSessionStart(result.sessionId);
      onSpecReady(result.spec);
    } catch (error) {
      showToast("Failed to start planning", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [prompt, onSessionStart, onSpecReady, showToast]);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {!spec ? (
        <div className="flex flex-1 flex-col p-4">
          <h2 className="text-sm font-semibold text-zed-text mb-4">Project Planning</h2>
          <p className="text-xs text-zed-text-muted mb-4">
            Describe what you want to build and AI will help plan the architecture and tasks.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your project..."
            className="flex-1 rounded-md border border-zed-border bg-zed-element p-3 text-xs text-zed-text placeholder:text-zed-text-placeholder resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
          />
          <Button
            onClick={handleStart}
            disabled={loading || !prompt.trim()}
            className="mt-4"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Planning...
              </>
            ) : (
              <>
                <Play size={14} className="mr-2" />
                Start Planning
              </>
            )}
          </Button>
        </div>
      ) : (
        <PlanningResults spec={spec} tasks={tasks} />
      )}
    </div>
  );
});

interface PlanningResultsProps {
  spec: PlanningSpec;
  tasks: TaskItem[];
}

const PlanningResults = memo(function PlanningResults({
  spec,
  tasks
}: PlanningResultsProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-zed-border-alt p-3">
        <h3 className="text-xs font-semibold text-zed-text">Architecture Plan</h3>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div className="mb-4">
          <h4 className="text-[11px] font-medium text-zed-text-muted uppercase tracking-wide mb-2">Summary</h4>
          <p className="text-xs text-zed-text">{spec.summary}</p>
        </div>

        {spec.assumptions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-[11px] font-medium text-zed-text-muted uppercase tracking-wide mb-2">Assumptions</h4>
            <ul className="space-y-1">
              {spec.assumptions.map((assumption, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zed-text">
                  <ArrowRight size={12} className="mt-0.5 text-zed-text-muted shrink-0" />
                  {assumption}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h4 className="text-[11px] font-medium text-zed-text-muted uppercase tracking-wide mb-2">Tasks</h4>
          <div className="space-y-1">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-1.5 text-xs",
                  task.status === "completed" ? "text-zed-text-muted line-through" : "text-zed-text"
                )}
              >
                {task.status === "completed" ? (
                  <CheckCircle2 size={14} className="text-green-400" />
                ) : (
                  <Circle size={14} className="text-zed-text-muted" />
                )}
                {task.title}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
