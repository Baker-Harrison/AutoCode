import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type DecisionStatus = "pending" | "approved" | "rejected" | "escalated";

interface ApprovalDecision {
  id: string;
  timestamp: number;
  agentId: string;
  team: string;
  action: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  status: DecisionStatus;
  reason?: string;
  approver?: string;
  context: string;
}

interface ApprovalAuditProps {
  decisions: ApprovalDecision[];
  onExport?: () => void;
}

const statusColors: Record<DecisionStatus, string> = {
  pending: "bg-amber-500/20 text-amber-200 border-amber-500/30",
  approved: "bg-green-500/20 text-green-200 border-green-500/30",
  rejected: "bg-red-500/20 text-red-200 border-red-500/30",
  escalated: "bg-purple-500/20 text-purple-200 border-purple-500/30",
};

const riskColors: Record<ApprovalDecision["riskLevel"], string> = {
  low: "text-green-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

export const ApprovalAudit = ({ decisions, onExport }: ApprovalAuditProps) => {
  const [filters, setFilters] = useState({
    team: "all",
    agent: "all",
    riskLevel: "all",
    status: "all",
    timeRange: "24h",
  });

  const filteredDecisions = decisions.filter((decision) => {
    if (filters.team !== "all" && decision.team !== filters.team) return false;
    if (filters.agent !== "all" && decision.agentId !== filters.agent) return false;
    if (filters.riskLevel !== "all" && decision.riskLevel !== filters.riskLevel) return false;
    if (filters.status !== "all" && decision.status !== filters.status) return false;

    const now = Date.now();
    const timeRangeHours =
      filters.timeRange === "24h"
        ? 24
        : filters.timeRange === "7d"
        ? 168
        : filters.timeRange === "30d"
        ? 720
        : Infinity;
    if (now - decision.timestamp > timeRangeHours * 60 * 60 * 1000) return false;

    return true;
  });

  const teams = Array.from(new Set(decisions.map((d) => d.team)));
  const agents = Array.from(new Set(decisions.map((d) => d.agentId)));

  const stats = {
    total: filteredDecisions.length,
    approved: filteredDecisions.filter((d) => d.status === "approved").length,
    rejected: filteredDecisions.filter((d) => d.status === "rejected").length,
    escalated: filteredDecisions.filter((d) => d.status === "escalated").length,
    pending: filteredDecisions.filter((d) => d.status === "pending").length,
    highRisk: filteredDecisions.filter((d) => ["high", "critical"].includes(d.riskLevel)).length,
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Decision Audit Trail</CardTitle>
            <Button variant="secondary" size="sm" onClick={onExport}>
              Export Audit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="p-3 bg-zed-element rounded-md">
                <div className="text-xs text-zed-text-muted block">Total</div>
                <div className="text-lg text-zed-text font-mono">{stats.total}</div>
              </div>
              <div className="p-3 bg-zed-element rounded-md">
                <div className="text-xs text-zed-text-muted block">Approved</div>
                <div className="text-lg text-green-400 font-mono">{stats.approved}</div>
              </div>
              <div className="p-3 bg-zed-element rounded-md">
                <div className="text-xs text-zed-text-muted block">Rejected</div>
                <div className="text-lg text-red-400 font-mono">{stats.rejected}</div>
              </div>
              <div className="p-3 bg-zed-element rounded-md">
                <div className="text-xs text-zed-text-muted block">Escalated</div>
                <div className="text-lg text-purple-400 font-mono">{stats.escalated}</div>
              </div>
              <div className="p-3 bg-zed-element rounded-md">
                <div className="text-xs text-zed-text-muted block">Pending</div>
                <div className="text-lg text-amber-400 font-mono">{stats.pending}</div>
              </div>
              <div className="p-3 bg-zed-element rounded-md">
                <div className="text-xs text-zed-text-muted block">High Risk</div>
                <div className="text-lg text-orange-400 font-mono">{stats.highRisk}</div>
              </div>
            </div>

            <div className="border-t border-zed-border-alt pt-4">
              <div className="text-xs text-zed-text-muted font-mono mb-3">FILTERS</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1">
                  <label className="text-xs text-zed-text-muted">Team</label>
                  <select
                    value={filters.team}
                    onChange={(e) => setFilters({ ...filters, team: e.target.value })}
                    className="w-full px-3 py-2 bg-zed-element border border-zed-border rounded-md text-sm text-zed-text"
                  >
                    <option value="all">All Teams</option>
                    {teams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zed-text-muted">Agent</label>
                  <select
                    value={filters.agent}
                    onChange={(e) => setFilters({ ...filters, agent: e.target.value })}
                    className="w-full px-3 py-2 bg-zed-element border border-zed-border rounded-md text-sm text-zed-text"
                  >
                    <option value="all">All Agents</option>
                    {agents.map((agent) => (
                      <option key={agent} value={agent}>
                        {agent}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zed-text-muted">Risk Level</label>
                  <select
                    value={filters.riskLevel}
                    onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value as any })}
                    className="w-full px-3 py-2 bg-zed-element border border-zed-border rounded-md text-sm text-zed-text"
                  >
                    <option value="all">All Levels</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zed-text-muted">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-zed-element border border-zed-border rounded-md text-sm text-zed-text"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="escalated">Escalated</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zed-text-muted">Time Range</label>
                  <select
                    value={filters.timeRange}
                    onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
                    className="w-full px-3 py-2 bg-zed-element border border-zed-border rounded-md text-sm text-zed-text"
                  >
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="all">All time</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-zed-border-alt pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-zed-text-muted font-mono">
                  DECISIONS ({filteredDecisions.length})
                </span>
              </div>

              <div className="space-y-2">
                {filteredDecisions.length === 0 ? (
                  <div className="text-sm text-zed-text-muted text-center py-8">
                    No decisions found matching filters
                  </div>
                ) : (
                  filteredDecisions.map((decision) => (
                    <div
                      key={decision.id}
                      className="p-3 bg-zed-element rounded-md border border-zed-border-alt"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-md border ${statusColors[decision.status]}`}
                          >
                            {decision.status.toUpperCase()}
                          </span>
                          <span className={`text-xs font-mono ${riskColors[decision.riskLevel]}`}>
                            {decision.riskLevel.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-zed-text-muted font-mono">
                          {new Date(decision.timestamp).toLocaleString()}
                        </div>
                      </div>

                      <div className="mb-2">
                        <span className="text-sm text-zed-text">{decision.action}</span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-zed-text-muted mb-2">
                        <span>Agent: {decision.agentId}</span>
                        <span>Team: {decision.team}</span>
                        {decision.approver && <span>Approver: {decision.approver}</span>}
                      </div>

                      {decision.reason && (
                        <div className="text-xs text-zed-text-muted italic">{decision.reason}</div>
                      )}

                      <div className="mt-2 p-2 bg-zed-element-hover rounded text-xs text-zed-text-muted">
                        {decision.context}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
