import { Bell, Boxes, ScrollText, Users, Zap, PauseCircle, Bot } from "lucide-react";
import type { Team } from "@/types/observer";

interface TeamsRailProps {
  teams: Team[];
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string | null) => void;
  notifications: number;
  historyEnabled: boolean;
  artifactsEnabled: boolean;
  agentsEnabled: boolean;
  onToggleNotifications: () => void;
  onToggleHistory: () => void;
  onToggleArtifacts: () => void;
  onToggleAgents: () => void;
}

const statusIcons = {
  active: Zap,
  idle: Users,
  paused: PauseCircle,
};

const statusColors = {
  active: "text-green-400",
  idle: "text-zed-text-muted",
  paused: "text-amber-400",
};

export function TeamsRail({
  teams,
  selectedTeamId,
  onSelectTeam,
  notifications,
  historyEnabled,
  artifactsEnabled,
  agentsEnabled,
  onToggleNotifications,
  onToggleHistory,
  onToggleArtifacts,
  onToggleAgents,
}: TeamsRailProps) {
  return (
    <aside className="flex w-16 flex-col items-center border-r border-zed-border bg-zed-panel/80 py-4 text-[10px] text-zed-text-muted">
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zed-element text-zed-accent">
            <Users size={16} />
          </div>
          <span className="text-[9px] uppercase tracking-[0.2em] text-zed-text-muted">Teams</span>
        </div>

        <div className="flex flex-1 flex-col items-center gap-2">
          {teams.map((team) => {
            const StatusIcon = statusIcons[team.status];
            const isSelected = selectedTeamId === team.id;
            return (
              <button
                key={team.id}
                onClick={() => onSelectTeam(team.id)}
                className={`relative flex flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors ${
                  isSelected ? "bg-zed-element text-zed-text" : "hover:bg-zed-element-hover hover:text-zed-text"
                }`}
              >
                {isSelected && <span className="absolute left-0 top-2 h-6 w-0.5 rounded-full bg-zed-accent" />}
                <StatusIcon size={16} className={statusColors[team.status]} />
                <span className="max-w-[3rem] truncate text-[10px]">{team.name}</span>
                {team.activityCount > 0 && (
                  <span className="rounded-full bg-zed-accent px-1 text-[9px] text-zed-bg">
                    {team.activityCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-col items-center gap-2">
        <span className="text-[9px] uppercase tracking-[0.2em] text-zed-text-muted">Utilities</span>
        <button
          onClick={onToggleNotifications}
          className={`relative flex flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors hover:bg-zed-element-hover hover:text-zed-text ${
            notifications > 0 ? "text-zed-accent" : "text-zed-text-muted"
          }`}
        >
          <Bell size={16} />
          <span className="text-[9px]">Notify</span>
          {notifications > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white">
              {notifications}
            </span>
          )}
        </button>
        <button
          onClick={onToggleHistory}
          className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors hover:bg-zed-element-hover hover:text-zed-text ${
            historyEnabled ? "text-zed-text" : "text-zed-text-muted"
          }`}
        >
          <ScrollText size={16} />
          <span className="text-[9px]">History</span>
        </button>
        <button
          onClick={onToggleArtifacts}
          className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors hover:bg-zed-element-hover hover:text-zed-text ${
            artifactsEnabled ? "text-zed-text" : "text-zed-text-muted"
          }`}
        >
          <Boxes size={16} />
          <span className="text-[9px]">Artifacts</span>
        </button>
        <button
          onClick={onToggleAgents}
          className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors hover:bg-zed-element-hover hover:text-zed-text ${
            agentsEnabled ? "text-zed-text" : "text-zed-text-muted"
          }`}
        >
          <Bot size={16} />
          <span className="text-[9px]">Agents</span>
        </button>
      </div>
    </aside>
  );
}
