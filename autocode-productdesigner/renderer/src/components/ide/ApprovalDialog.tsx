import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Shield, AlertTriangle, CheckCircle, XCircle, ChevronRight, ChevronDown, User, UserCog, Building2 } from "lucide-react";
import type { ApprovalQueueItem, RiskLevel, RiskLevelInfo, ApprovalApprovePayload, ApprovalRejectPayload, ApprovalEscalatePayload } from "@/types/ipc";

interface ApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  approval: ApprovalQueueItem | null;
  currentApproverRole: "lead" | "manager" | "vp" | "user";
  onApprove: (payload: ApprovalApprovePayload) => Promise<void>;
  onReject: (payload: ApprovalRejectPayload) => Promise<void>;
  onEscalate: (payload: ApprovalEscalatePayload) => Promise<void>;
  riskLevels?: Record<RiskLevel, RiskLevelInfo>;
}

const APPROVER_ROLES = {
  lead: {
    label: "Lead",
    icon: <User size={14} />,
    canApprove: ["low", "medium"]
  },
  manager: {
    label: "Manager",
    icon: <UserCog size={14} />,
    canApprove: ["low", "medium", "high"]
  },
  vp: {
    label: "VP",
    icon: <Building2 size={14} />,
    canApprove: ["low", "medium", "high", "critical"]
  },
  user: {
    label: "User",
    icon: <User size={14} />,
    canApprove: ["low", "medium", "high", "critical"]
  }
};

export function ApprovalDialog({
  open,
  onClose,
  approval,
  currentApproverRole,
  onApprove,
  onReject,
  onEscalate,
  riskLevels
}: ApprovalDialogProps) {
  const [comments, setComments] = useState("");
  const [selectedApprover, setSelectedApprover] = useState<RiskLevelInfo["requiredApprover"] | null>(null);
  const [escalationReason, setEscalationReason] = useState("");
  const [showEscalation, setShowEscalation] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      setComments("");
      setShowEscalation(false);
      setShowDiff(false);
      setEscalationReason("");
      setSelectedApprover(null);
    }
  }, [open]);

  if (!approval) return null;

  const riskInfo = riskLevels?.[approval.riskLevel];
  const canApprove = APPROVER_ROLES[currentApproverRole].canApprove.includes(approval.riskLevel);
  const requiresComments = approval.riskLevel === "critical" || currentApproverRole === "vp";

  const getRiskIcon = (level: RiskLevel) => {
    switch (level) {
      case "low":
        return <CheckCircle size={20} className="text-green-500" />;
      case "medium":
        return <AlertTriangle size={20} className="text-yellow-500" />;
      case "high":
        return <AlertTriangle size={20} className="text-orange-500" />;
      case "critical":
        return <Shield size={20} className="text-red-500" />;
    }
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

  const handleApprove = async () => {
    if (!canApprove && !showEscalation) {
      setShowEscalation(true);
      return;
    }

    if (requiresComments && !comments.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      if (showEscalation && selectedApprover) {
        await onEscalate({
          approvalId: approval.id,
          escalatedTo: selectedApprover!,
          reason: escalationReason || "Escalating to higher approval level",
          escalatedBy: currentApproverRole
        });
      } else {
        await onApprove({
          approvalId: approval.id,
          approver: currentApproverRole,
          approverRole: currentApproverRole,
          comments: comments
        });
      }
      onClose();
    } catch (error) {
      console.error("Approval failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject({
        approvalId: approval.id,
        approver: currentApproverRole,
        approverRole: currentApproverRole,
        comments: comments
      });
      onClose();
    } catch (error) {
      console.error("Rejection failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const parseDiffPreview = (diff: string) => {
    if (!diff) return [];
    return diff.split("\n").filter(line => line.trim());
  };

  return (
    <Dialog open={open} onClose={onClose} title="Action Approval Required">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {getRiskIcon(approval.riskLevel)}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-zed-text">{riskInfo?.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded border ${getRiskBadgeColor(approval.riskLevel)}`}>
                {approval.riskLevel.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-zed-text-muted">{riskInfo?.description}</p>
          </div>
        </div>

        <div className="rounded bg-zed-element p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zed-text-muted">Action Type</span>
            <span className="text-xs text-zed-text font-medium">{approval.actionType}</span>
          </div>
          {approval.actionDescription && (
            <div>
              <span className="text-xs text-zed-text-muted block mb-1">Description</span>
              <p className="text-xs text-zed-text">{approval.actionDescription}</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zed-text-muted">Created</span>
            <span className="text-xs text-zed-text">{formatTimestamp(approval.created_at)}</span>
          </div>
          {approval.bundleId && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-zed-text-muted">Bundle ID</span>
              <span className="text-xs text-zed-text font-mono">{approval.bundleId}</span>
            </div>
          )}
        </div>

        {approval.agentRationale && (
          <div>
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="flex items-center gap-2 text-xs text-zed-text-muted hover:text-zed-text w-full"
            >
              {showDiff ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>Agent Rationale</span>
            </button>
            {showDiff && (
              <div className="mt-2 rounded bg-zed-element p-3">
                <p className="text-xs text-zed-text whitespace-pre-wrap">{approval.agentRationale}</p>
              </div>
            )}
          </div>
        )}

        {approval.diffPreview && (
          <div>
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="flex items-center gap-2 text-xs text-zed-text-muted hover:text-zed-text w-full"
            >
              {showDiff ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>Diff Preview</span>
            </button>
            {showDiff && (
              <div className="mt-2 rounded bg-zed-element p-3 max-h-48 overflow-auto">
                {parseDiffPreview(approval.diffPreview).map((line, index) => (
                  <div
                    key={index}
                    className={`text-xs font-mono ${
                      line.startsWith("+") ? "text-green-400" :
                      line.startsWith("-") ? "text-red-400" :
                      line.startsWith("@") ? "text-blue-400" :
                      "text-zed-text-muted"
                    }`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!canApprove && !showEscalation && (
          <div className="rounded bg-yellow-500/10 border border-yellow-500/30 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-yellow-400 mt-0.5" />
              <div>
                <p className="text-xs text-yellow-200 font-medium">Insufficient Approval Level</p>
                <p className="text-xs text-yellow-300/70 mt-1">
                  Your role ({APPROVER_ROLES[currentApproverRole].label}) cannot approve {approval.riskLevel} risk actions.
                  Please escalate to a higher approver.
                </p>
              </div>
            </div>
          </div>
        )}

        {showEscalation && (
          <div className="rounded bg-zed-element p-3 space-y-3">
            <div>
              <label className="text-xs text-zed-text-muted block mb-1">Escalate To</label>
              <select
                value={selectedApprover || ""}
                onChange={(e) => setSelectedApprover(e.target.value as RiskLevelInfo["requiredApprover"] | "")}
                className="w-full bg-zed-panel border border-zed-border rounded px-2 py-1.5 text-xs text-zed-text focus:outline-none focus:border-zed-border-alt"
              >
                <option value="">Select approver...</option>
                <option value="manager">Manager</option>
                <option value="vp">VP</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zed-text-muted block mb-1">Reason for Escalation</label>
              <textarea
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Why is this being escalated?"
                className="w-full bg-zed-panel border border-zed-border rounded px-2 py-1.5 text-xs text-zed-text focus:outline-none focus:border-zed-border-alt resize-none"
                rows={2}
              />
            </div>
          </div>
        )}

        {requiresComments && !showEscalation && (
          <div>
            <label className="text-xs text-zed-text-muted block mb-1">
              Comments <span className="text-red-400">*</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Required: Provide your rationale for this approval"
              className={`w-full bg-zed-panel border rounded px-2 py-1.5 text-xs text-zed-text focus:outline-none resize-none ${
                requiresComments && !comments.trim() ? "border-red-500" : "border-zed-border focus:border-zed-border-alt"
              }`}
              rows={3}
            />
          </div>
        )}

        {!requiresComments && !showEscalation && (
          <div>
            <label className="text-xs text-zed-text-muted block mb-1">Comments (Optional)</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any comments or context..."
              className="w-full bg-zed-panel border border-zed-border rounded px-2 py-1.5 text-xs text-zed-text focus:outline-none focus:border-zed-border-alt resize-none"
              rows={2}
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            className="border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20"
            onClick={handleReject}
            disabled={isProcessing}
          >
            <XCircle size={16} className="mr-2" />
            Reject
          </Button>
          <Button
            className="bg-green-600/20 text-green-400 hover:bg-green-600/30"
            onClick={handleApprove}
            disabled={isProcessing || (requiresComments && !comments.trim() && !showEscalation)}
          >
            <CheckCircle size={16} className="mr-2" />
            {showEscalation ? "Escalate" : "Approve"}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
