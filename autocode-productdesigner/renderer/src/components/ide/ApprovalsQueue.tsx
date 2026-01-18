import { CheckCircle2, AlertTriangle, ShieldCheck, Clock, ChevronRight } from "lucide-react";
import type { ApprovalItem } from "@/types/observer";
import { Button } from "@/components/ui/button";

interface ApprovalsQueueProps {
  approvals: ApprovalItem[];
  autoApproveEnabled: boolean;
  onToggleAutoApprove: () => void;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
  onEscalate: (approvalId: string) => void;
}

interface ApprovalCardProps {
  approval: ApprovalItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEscalate: (id: string) => void;
}

function getRiskColor(level: ApprovalItem["riskLevel"]) {
  switch (level) {
    case "critical":
      return "border-red-400/50 bg-red-400/10";
    case "high":
      return "border-amber-400/50 bg-amber-400/10";
    case "medium":
      return "border-zed-border-alt bg-zed-element/60";
    case "low":
      return "border-zed-border bg-zed-element/50";
    default:
      return "border-zed-border bg-zed-element/50";
  }
}

function ApprovalCard({ approval, onApprove, onReject, onEscalate }: ApprovalCardProps) {
  const isEscalation = approval.type === "escalation";
  const isCritical = approval.riskLevel === "critical" || approval.riskLevel === "high";

  return (
    <div className={`rounded-lg border ${getRiskColor(approval.riskLevel)} p-3 ${isCritical ? "shadow-[0_0_20px_rgba(239,68,68,0.1)]" : ""}`}>
      {isEscalation && (
        <div className="flex items-center gap-1.5 mb-2">
          <AlertTriangle size={12} className="text-red-400" />
          <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">
            Escalate to User
          </span>
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <div className="text-xs font-semibold text-zed-text">{approval.title}</div>
          <div className="text-[10px] text-zed-text-muted mt-1">{approval.description}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3 text-[10px] text-zed-text-muted">
        <span>{approval.teamName}</span>
        <span>·</span>
        <span>{approval.requester}</span>
        <span>·</span>
        <span>{approval.createdAt}</span>
      </div>
      {approval.requiresAction && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 py-0 text-[10px]"
            onClick={() => onReject(approval.id)}
          >
            Reject
          </Button>
          {isEscalation && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 py-0 text-[10px] text-amber-400 border-amber-400/50"
              onClick={() => onEscalate(approval.id)}
            >
              Review
            </Button>
          )}
          <Button
            size="sm"
            className="h-7 px-2 py-0 text-[10px]"
            onClick={() => onApprove(approval.id)}
          >
            Approve
          </Button>
        </div>
      )}
    </div>
  );
}

export function ApprovalsQueue({
  approvals,
  autoApproveEnabled,
  onToggleAutoApprove,
  onApprove,
  onReject,
  onEscalate,
}: ApprovalsQueueProps) {
  const escalations = approvals.filter((a) => a.type === "escalation");
  const leadApprovals = approvals.filter((a) => a.type === "lead_approval");
  const taskCompletions = approvals.filter((a) => a.type === "task_completion");

  return (
    <aside className="flex w-[340px] flex-col border-l border-zed-border bg-zed-panel/85">
      <div className="border-b border-zed-border-alt px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-zed-text-muted">Approvals</div>
            <div className="mt-2 text-sm font-semibold text-zed-text">
              {approvals.length} pending
            </div>
          </div>
          <ShieldCheck size={16} className="text-zed-accent" />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-5">
        {escalations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
              <AlertTriangle size={14} />
              <span>Escalations</span>
              <span className="rounded-full bg-red-400/20 px-1.5 py-0.5 text-[10px] text-red-400">
                {escalations.length}
              </span>
            </div>
            <div className="space-y-3">
              {escalations.map((approval) => (
                <div key={approval.id} className="relative overflow-hidden rounded-xl border border-red-400/40 bg-red-400/10 p-3">
                  <span className="absolute left-0 top-0 h-full w-1 bg-red-400/70" />
                  <div className="pl-2">
                    <div className="text-sm font-semibold text-zed-text">{approval.title}</div>
                    <div className="mt-1 text-[11px] text-zed-text-muted">{approval.description}</div>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-zed-text-muted">
                      <span>{approval.teamName}</span>
                      <span>·</span>
                      <span>{approval.requester}</span>
                    </div>
                    <div className="mt-3">
                      <Button size="sm" className="h-7 px-3 text-[10px]">
                        Review escalation
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {leadApprovals.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zed-text">
              <ChevronRight size={14} />
              <span>Lead Approvals</span>
              <span className="rounded-full bg-zed-element px-1.5 py-0.5 text-[10px] text-zed-text-muted">
                {leadApprovals.length}
              </span>
            </div>
            <div className="space-y-2">
              {leadApprovals.map((approval) => (
                <div key={approval.id} className="rounded-xl border border-zed-border-alt bg-zed-element/60 p-3">
                  <div className="text-sm font-semibold text-zed-text">{approval.title}</div>
                  <div className="mt-1 text-[11px] text-zed-text-muted">{approval.description}</div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-zed-text-muted">
                    <span>{approval.teamName}</span>
                    <span>·</span>
                    <span>{approval.requester}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 px-2 py-0 text-[10px]" onClick={() => onReject(approval.id)}>
                      Reject
                    </Button>
                    <Button size="sm" className="h-7 px-2 py-0 text-[10px]" onClick={() => onApprove(approval.id)}>
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {taskCompletions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zed-text">
              <CheckCircle2 size={14} />
              <span>Task Completions</span>
              <span className="rounded-full bg-zed-element px-1.5 py-0.5 text-[10px] text-zed-text-muted">
                {taskCompletions.length}
              </span>
            </div>
            <div className="space-y-2">
              {taskCompletions.map((approval) => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={onApprove}
                  onReject={onReject}
                  onEscalate={onEscalate}
                />
              ))}
            </div>
          </div>
        )}

        {approvals.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zed-text-muted text-xs">
            <Clock size={24} className="mb-2 opacity-50" />
            <span>No pending approvals</span>
          </div>
        )}
      </div>

      <div className="border-t border-zed-border-alt px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.2em] text-zed-text-muted">Policy</div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-zed-text-muted">Auto-approve low-risk</span>
          <button
            onClick={onToggleAutoApprove}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              autoApproveEnabled ? "bg-zed-accent" : "bg-zed-border"
            }`}
          >
            <div
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-zed-bg transition-transform ${
                autoApproveEnabled ? "translate-x-4.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>
    </aside>
  );
}
