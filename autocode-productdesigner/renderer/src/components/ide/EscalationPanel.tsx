import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, AlertTriangle, Clock, User, UserCog, Building2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import type { EscalationRecord, ApprovalQueueItem, RiskLevel, RiskLevelInfo, ApprovalEscalatePayload } from "@/types/ipc";

interface EscalationPanelProps {
  escalations?: EscalationRecord[];
  pendingApprovals?: ApprovalQueueItem[];
  onResolveEscalation?: (escalationId: string) => Promise<void>;
  onEscalate?: (payload: ApprovalEscalatePayload) => Promise<void>;
  currentApproverRole?: "lead" | "manager" | "vp" | "user";
  riskLevels?: Record<RiskLevel, RiskLevelInfo>;
}

const ESCALATION_ICONS = {
  lead: <User size={16} className="text-blue-400" />,
  manager: <UserCog size={16} className="text-purple-400" />,
  vp: <Building2 size={16} className="text-yellow-400" />,
  user: <User size={16} className="text-green-400" />
};

export function EscalationPanel({
  escalations = [],
  pendingApprovals = [],
  onResolveEscalation,
  onEscalate,
  currentApproverRole = "user",
  riskLevels
}: EscalationPanelProps) {
  const [expandedEscalations, setExpandedEscalations] = useState<Set<string>>(new Set());
  const [selectedEscalation, setSelectedEscalation] = useState<EscalationRecord | null>(null);
  const [escalationReason, setEscalationReason] = useState("");
  const [targetApprover, setTargetApprover] = useState<RiskLevelInfo["requiredApprover"] | null>(null);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);

  const activeEscalations = escalations.filter(e => !e.resolved);
  const escalatedApprovals = pendingApprovals.filter(a => a.status === "escalated");

  const toggleExpand = (escalationId: string) => {
    setExpandedEscalations(prev => {
      const next = new Set(prev);
      if (next.has(escalationId)) {
        next.delete(escalationId);
      } else {
        next.add(escalationId);
      }
      return next;
    });
  };

  const getRiskBadgeColor = (level: RiskLevel) => {
    switch (level) {
      case "low":
        return "bg-green-500/10 text-green-400 border-green-500/30";
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "high":
        return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "critical":
        return "bg-red-500/10 text-red-400 border-red-500/30";
    }
  };

  const handleResolve = async (escalationId: string) => {
    if (onResolveEscalation) {
      await onResolveEscalation(escalationId);
    }
  };

  const handleEscalate = async () => {
    if (!selectedEscalation || !targetApprover || !onEscalate) return;

    await onEscalate({
      approvalId: selectedEscalation.actionId,
      escalatedTo: targetApprover,
      reason: escalationReason,
      escalatedBy: currentApproverRole
    });

    setShowEscalateDialog(false);
    setSelectedEscalation(null);
    setEscalationReason("");
    setTargetApprover(null);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const canResolve = (escalation: EscalationRecord) => {
    const roleMap: Record<string, number> = { lead: 1, manager: 2, vp: 3, user: 0 };
    const escalationLevel = roleMap[escalation.escalatedTo] || 0;
    const currentLevel = roleMap[currentApproverRole] || 0;
    return currentLevel >= escalationLevel;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-zed-text" />
          <h3 className="text-sm font-semibold text-zed-text">Escalations</h3>
        </div>
        <span className="text-xs text-zed-text-muted bg-zed-element px-2 py-1 rounded">
          {activeEscalations.length} active
        </span>
      </div>

      {activeEscalations.length === 0 && escalatedApprovals.length === 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-center text-zed-text-muted">
            <Shield size={24} className="mr-2 opacity-50" />
            <span className="text-sm">No active escalations</span>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {activeEscalations.map(escalation => (
          <Card key={escalation.id} className="overflow-hidden">
            <div
              className={`p-3 border-l-4 cursor-pointer transition-colors ${
                !escalation.resolved ? "border-l-red-500 bg-red-500/5" : "border-l-green-500"
              }`}
              onClick={() => toggleExpand(escalation.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <AlertTriangle size={18} className={!escalation.resolved ? "text-red-400 mt-0.5" : "text-green-400 mt-0.5"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-zed-text">Action: {escalation.actionId}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${getRiskBadgeColor(escalation.originalRiskLevel)}`}>
                        {escalation.originalRiskLevel}
                      </span>
                      {!escalation.resolved && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                          UNRESOLVED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zed-text-muted truncate">{escalation.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedEscalations.has(escalation.id) ? (
                      <ChevronUp size={14} className="text-zed-text-muted" />
                    ) : (
                      <ChevronDown size={14} className="text-zed-text-muted" />
                    )}
                  </div>
                </div>
              </div>

              {expandedEscalations.has(escalation.id) && (
                <div className="mt-3 pt-3 border-t border-zed-border-alt space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zed-text-muted">Escalated By</span>
                    <span className="text-zed-text flex items-center gap-1">
                      {ESCALATION_ICONS[escalation.escalatedBy as keyof typeof ESCALATION_ICONS] || <User size={14} />}
                      {escalation.escalatedBy}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zed-text-muted">Escalated To</span>
                    <span className="text-zed-text flex items-center gap-1">
                      {ESCALATION_ICONS[escalation.escalatedTo as keyof typeof ESCALATION_ICONS] || <User size={14} />}
                      {escalation.escalatedTo}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zed-text-muted">Original Risk Level</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${getRiskBadgeColor(escalation.originalRiskLevel)}`}>
                      {escalation.originalRiskLevel.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zed-text-muted">Time</span>
                    <span className="text-zed-text-muted flex items-center gap-1">
                      <Clock size={12} />
                      {formatTimestamp(escalation.created_at)}
                    </span>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-zed-text-muted mb-2">Reason</p>
                    <p className="text-xs text-zed-text bg-zed-panel p-2 rounded">{escalation.reason}</p>
                  </div>

                  {!escalation.resolved && canResolve(escalation) && onResolveEscalation && (
                    <div className="pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolve(escalation.id);
                        }}
                        className="w-full"
                      >
                        <Check size={14} className="mr-2" />
                        Mark as Resolved
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}

        {escalatedApprovals.map(approval => (
          <Card key={approval.id} className="p-3 border-l-4 border-l-yellow-500 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-yellow-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-zed-text">{approval.actionType}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${getRiskBadgeColor(approval.riskLevel)}`}>
                    {approval.riskLevel.toUpperCase()}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                    ESCALATED
                  </span>
                </div>
                {approval.actionDescription && (
                  <p className="text-xs text-zed-text-muted truncate">{approval.actionDescription}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-zed-text-muted flex items-center gap-1">
                    <Clock size={12} />
                    {formatTimestamp(approval.created_at)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedEscalation({
                        id: "",
                        actionId: approval.actionId,
                        originalRiskLevel: approval.riskLevel,
                        escalatedTo: "manager",
                        reason: "",
                        escalatedBy: currentApproverRole,
                        created_at: approval.created_at,
                        resolved: 0
                      });
                      setShowEscalateDialog(true);
                    }}
                    className="text-xs h-6 px-2"
                  >
                    Re-escalate
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showEscalateDialog && selectedEscalation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowEscalateDialog(false)} />
          <div className="relative z-50 w-full max-w-md rounded-md border border-zed-border bg-zed-panel shadow-lg p-4">
            <h3 className="text-sm font-semibold text-zed-text mb-3">Re-escalate Action</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zed-text-muted block mb-1">Target Approver</label>
                <select
                  value={targetApprover || ""}
                  onChange={(e) => setTargetApprover(e.target.value as RiskLevelInfo["requiredApprover"] | "")}
                  className="w-full bg-zed-element border border-zed-border rounded px-2 py-1.5 text-xs text-zed-text focus:outline-none focus:border-zed-border-alt"
                >
                  <option value="">Select approver...</option>
                  <option value="manager">Manager</option>
                  <option value="vp">VP</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zed-text-muted block mb-1">Reason</label>
                <textarea
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="Why is this being re-escalated?"
                  className="w-full bg-zed-element border border-zed-border rounded px-2 py-1.5 text-xs text-zed-text focus:outline-none focus:border-zed-border-alt resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={() => setShowEscalateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEscalate}
                disabled={!targetApprover || !escalationReason.trim()}
              >
                Re-escalate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
