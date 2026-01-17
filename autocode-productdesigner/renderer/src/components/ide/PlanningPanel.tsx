import { useMemo, useState } from "react";
import type { PlanningQuestion, PlanningSpec, TaskItem } from "@/types/ipc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

const defaultPrompt = "Build an autonomous agentic IDE";

type PlanningPanelProps = {
  spec: PlanningSpec | null;
  tasks: TaskItem[];
  onSessionStart: (sessionId: string) => void;
  onSpecReady: (spec: PlanningSpec) => void;
};

type GoalStatus = "completed" | "active" | "pending";

type GoalItem = {
  id: string;
  title: string;
  status: GoalStatus;
  description: string;
};

const blockedOptions = [
  {
    id: "retry",
    label: "Retry the last step",
    description: "Attempt the same operation again with more logging."
  },
  {
    id: "alternate",
    label: "Pick an alternative",
    description: "Switch to another implementation approach."
  },
  {
    id: "ask",
    label: "Ask for help",
    description: "Pause and request user guidance."
  }
];

const checkpointOptions = [
  {
    id: "continue",
    label: "Continue to next goal",
    description: "Proceed with the planned roadmap."
  },
  {
    id: "expand",
    label: "Expand scope",
    description: "Add another feature or deeper implementation."
  },
  {
    id: "review",
    label: "Pause for review",
    description: "Let me review progress before continuing."
  }
];

export const PlanningPanel = ({ spec, tasks, onSessionStart, onSpecReady }: PlanningPanelProps) => {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [questions, setQuestions] = useState<PlanningQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checkpointChoice, setCheckpointChoice] = useState(checkpointOptions[0].id);
  const [blockedChoice, setBlockedChoice] = useState(blockedOptions[0].id);
  const { showToast } = useToast();

  const goals = useMemo<GoalItem[]>(() => {
    if (!spec) return [];
    return [
      {
        id: "goal-1",
        title: "Clarify scope and constraints",
        status: "completed",
        description: "Capture requirements and align on constraints."
      },
      {
        id: "goal-2",
        title: "Generate plan & checkpoints",
        status: "active",
        description: "Break work into structured, agent-driven steps."
      },
      {
        id: "goal-3",
        title: "Execute implementation tasks",
        status: "pending",
        description: "Start coding with continuous progress checks."
      }
    ];
  }, [spec]);

  const startPlanning = async () => {
    if (!prompt.trim()) {
      showToast("Prompt is required", "error");
      return;
    }
    setLoading(true);
    try {
      const result = await window.ide.startPlanning(prompt);
      const defaults: Record<string, string> = {};
      result.questions.forEach((q) => {
        defaults[q.id] = q.recommendedOption;
      });
      setQuestions(result.questions);
      setSelectedAnswers(defaults);
      setSessionId(result.sessionId);
      onSpecReady(result.spec);
      onSessionStart(result.sessionId);
    } catch (error) {
      showToast("Planning failed", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateAnswer = async (questionId: string, answer: string) => {
    if (!sessionId) {
      return;
    }
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answer }));
    try {
      await window.ide.updateAnswer({ sessionId, questionId, answer });
    } catch (error) {
      showToast("Failed to update answer", "error");
      console.error(error);
    }
  };

  const statusClasses: Record<GoalStatus, string> = {
    completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    active: "border-zed-border-focused bg-zed-element-selected text-zed-text",
    pending: "border-zed-border-alt bg-zed-element text-zed-text-muted"
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zed-border-alt px-4 py-3">
        <div className="text-[11px] uppercase tracking-wide text-zed-text-muted">Autonomous Agent</div>
        <div className="mt-1 text-xs text-zed-text">
          {spec ? "Running with active goals" : "Awaiting prompt"}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Agent Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-zed-text-muted">
              Provide a high-level request. The agent will ask clarifying questions and
              create goals before executing.
            </div>
            <div className="flex gap-2">
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="flex-1 rounded-md border border-zed-border bg-zed-element px-3 py-2 text-xs text-zed-text placeholder:text-zed-text-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
                placeholder="Describe what you want to build..."
              />
              <Button onClick={startPlanning} disabled={loading} size="sm">
                {loading ? "Planning..." : "Start"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clarifying Questions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-xs">
            {questions.length === 0 ? (
              <div className="text-zed-text-muted">
                No questions yet. The agent will ask here when it needs guidance.
              </div>
            ) : (
              questions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <div className="text-sm text-zed-text">{question.text}</div>
                  <div className="grid gap-2">
                    {question.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => updateAnswer(question.id, option.id)}
                        className={`rounded-md border px-3 py-2 text-left text-xs transition ${
                          selectedAnswers[question.id] === option.id
                            ? "border-zed-border-focused bg-zed-element-selected text-zed-text"
                            : "border-zed-border-alt bg-zed-element text-zed-text-muted hover:border-zed-border"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-zed-text">{option.label}</span>
                          {option.id === question.recommendedOption && (
                            <span className="text-[10px] uppercase text-zed-text-muted">Recommended</span>
                          )}
                        </div>
                        <div className="text-[11px] text-zed-text-muted">{option.implications}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goals & Checkpoints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {goals.length === 0 ? (
              <div className="text-zed-text-muted">
                Goals appear after the agent generates a spec.
              </div>
            ) : (
              goals.map((goal) => (
                <div
                  key={goal.id}
                  className={`rounded-md border px-3 py-2 ${statusClasses[goal.status]}`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{goal.title}</span>
                    <span className="text-[10px] uppercase">
                      {goal.status === "completed"
                        ? "Completed"
                        : goal.status === "active"
                          ? "In progress"
                          : "Pending"}
                    </span>
                  </div>
                  <div className="text-[11px] text-zed-text-muted">{goal.description}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {spec ? (
              <div className="text-zed-text-muted">Current objective: {spec.summary}</div>
            ) : (
              <div className="text-zed-text-muted">Waiting for a prompt to begin.</div>
            )}
            {tasks.length === 0 ? (
              <div className="text-zed-text-muted">No tasks queued yet.</div>
            ) : (
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between">
                    <span className="text-zed-text">{task.title}</span>
                    <span className="text-[11px] text-zed-text-muted">{task.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {spec && (
          <Card>
            <CardHeader>
              <CardTitle>Issue Resolution</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-xs">
              <div className="text-zed-text-muted">
                If the agent hits a blocker, select the best recovery option.
              </div>
              {blockedOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setBlockedChoice(option.id)}
                  className={`rounded-md border px-3 py-2 text-left ${
                    blockedChoice === option.id
                      ? "border-zed-border-focused bg-zed-element-selected text-zed-text"
                      : "border-zed-border-alt bg-zed-element text-zed-text-muted hover:border-zed-border"
                  }`}
                >
                  <div className="font-semibold text-zed-text">{option.label}</div>
                  <div className="text-[11px] text-zed-text-muted">{option.description}</div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {spec && (
          <Card>
            <CardHeader>
              <CardTitle>Checkpoint Prompt</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-xs">
              <div className="text-zed-text-muted">
                Choose how the agent should proceed once the current goal completes.
              </div>
              {checkpointOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCheckpointChoice(option.id)}
                  className={`rounded-md border px-3 py-2 text-left ${
                    checkpointChoice === option.id
                      ? "border-zed-border-focused bg-zed-element-selected text-zed-text"
                      : "border-zed-border-alt bg-zed-element text-zed-text-muted hover:border-zed-border"
                  }`}
                >
                  <div className="font-semibold text-zed-text">{option.label}</div>
                  <div className="text-[11px] text-zed-text-muted">{option.description}</div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
