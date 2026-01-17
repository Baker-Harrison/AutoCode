import type { PlanningSpec, TaskItem } from "@/types/ipc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ExecutionPanelProps = {
  spec: PlanningSpec | null;
  tasks: TaskItem[];
};

export const ExecutionPanel = ({ spec, tasks }: ExecutionPanelProps) => {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zed-text-muted">
          <div className="space-y-2">
            <div className="text-zed-text">Planning mode completed (auto defaults).</div>
            <div>Autonomous research queued.</div>
            <div>Execution pipeline ready.</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zed-text-muted">
            {tasks.length === 0 ? (
              <div>No tasks queued yet.</div>
            ) : (
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between">
                    <span className="text-zed-text">{task.title}</span>
                    <span className="text-xs text-amber-300">{task.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Decisions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zed-text-muted">
            {spec ? (
              <div className="space-y-2">
                <div className="text-zed-text">{spec.summary}</div>
                <ul className="list-disc pl-4">
                  {spec.assumptions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : (
              "No spec generated yet."
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
