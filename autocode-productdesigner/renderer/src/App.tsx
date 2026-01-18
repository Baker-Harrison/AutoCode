import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Activity,
  Bot,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Edit3,
  FileText,
  Folder,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  Palette,
  PlayCircle,
  ScrollText,
  Settings,
  Sparkles,
  TestTube2,
  Users,
} from "lucide-react";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { EditorPanel } from "@/components/ide/EditorPanel";
import { TerminalPanel } from "@/components/ide/TerminalPanel";
import { PlanningPanel } from "@/components/ide/PlanningPanel";
import { LogsPanel } from "@/components/ide/LogsPanel";
import { TabBar } from "@/components/ide/TabBar";
import { QuickOpenPanel } from "@/components/ide/QuickOpenPanel";
import { CommandPalette } from "@/components/ide/CommandPalette";
import { OutputPanel } from "@/components/ide/OutputPanel";
import { ExecutionPanel } from "@/components/ide/ExecutionPanel";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { GitPanel } from "@/components/ide/GitPanel";
import { TeamsRail } from "@/components/ide/TeamsRail";
import { ActivityByTeam } from "@/components/ide/ActivityByTeam";
import { ActivityStream } from "@/components/ide/ActivityStream";
import { ApprovalAudit } from "@/components/ide/ApprovalAudit";
import { ApprovalsQueue } from "@/components/ide/ApprovalsQueue";
import { ExecutionLog } from "@/components/ide/ExecutionLog";
import { PromptInspector } from "@/components/ide/PromptInspector";
import { useEditorMode } from "@/hooks/useEditorMode";
import type { FileEntry, PlanningSpec, SearchResult, TaskItem, Tab } from "@/types/ipc";
import type { Team, TeamActivity, ApprovalItem, LogEntry } from "@/types/observer";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ToastProvider, useToast } from "@/components/ui/toast";

const leftTabs = [
  { id: "project", label: "Project", icon: Folder },
  { id: "context", label: "Context", icon: ScrollText },
] as const;

type LeftTabId = (typeof leftTabs)[number]["id"];

type BottomTabId = "terminal" | "tasks" | "runs" | "logs" | "tests";

type RightTabId = "spec" | "debate" | "design" | "execution" | "prompt";

type WorkspaceModeId = "code" | "ui" | "docs" | "api";

const bottomTabs: { id: BottomTabId; label: string; icon: typeof Activity }[] = [
  { id: "terminal", label: "Terminal", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", icon: CheckCircle2 },
  { id: "runs", label: "Runs", icon: PlayCircle },
  { id: "logs", label: "Logs", icon: FileText },
  { id: "tests", label: "Test Results", icon: TestTube2 },
];

const rightTabs: { id: RightTabId; label: string; icon: typeof Activity }[] = [
  { id: "spec", label: "Spec Builder", icon: Sparkles },
  { id: "debate", label: "Debate Room", icon: MessageSquare },
  { id: "design", label: "Design Studio", icon: Palette },
  { id: "execution", label: "Execution", icon: Activity },
  { id: "prompt", label: "Prompt Inspector", icon: FileText },
];

const workspaceModes: { id: WorkspaceModeId; label: string; icon: typeof Activity }[] = [
  { id: "code", label: "Code", icon: LayoutDashboard },
  { id: "ui", label: "UI", icon: Palette },
  { id: "docs", label: "Docs", icon: FileText },
  { id: "api", label: "API", icon: Boxes },
];


const MAX_QUERY_LENGTH = 200;
const AUTOSAVE_DELAY = 1000;
const SEARCH_DEBOUNCE_MS = 150;

interface SavedTab {
  id: string;
  file: FileEntry;
  isDirty: boolean;
}

const AppShell = () => {
  const { mode, setMode, toggleMode, isEditorMode, isAutonomousMode } = useEditorMode();
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTabId>("project");
  const [bottomTab, setBottomTab] = useState<BottomTabId>("terminal");
  const [rightTab, setRightTab] = useState<RightTabId>("spec");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceModeId>("code");
  const [spec, setSpec] = useState<PlanningSpec | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectingWorkspace, setSelectingWorkspace] = useState(false);
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [indentation, setIndentation] = useState<2 | 4 | 8>(2);
  const [wordWrap, setWordWrap] = useState(false);
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([
    { id: "frontend", name: "Frontend", status: "active", leadAgent: "Lead FE", subAgents: ["React Dev", "CSS Dev"], activityCount: 5 },
    { id: "backend", name: "Backend", status: "idle", leadAgent: "Lead BE", subAgents: ["API Dev", "DB Dev"], activityCount: 0 },
    { id: "devops", name: "DevOps", status: "paused", leadAgent: "Lead DevOps", subAgents: ["CI/CD"], activityCount: 2 },
  ]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([
    {
      id: "1",
      type: "escalation",
      title: "Database schema change required",
      description: "Backend team needs to modify the users table schema. This may break existing queries.",
      riskLevel: "critical",
      teamId: "backend",
      teamName: "Backend",
      requester: "Lead BE",
      createdAt: "2 min ago",
      requiresAction: true,
      canAutoApprove: false,
    },
    {
      id: "2",
      type: "lead_approval",
      title: "Implement new API endpoint",
      description: "Add /api/v1/users endpoint with CRUD operations.",
      riskLevel: "medium",
      teamId: "backend",
      teamName: "Backend",
      requester: "Lead BE",
      createdAt: "15 min ago",
      requiresAction: true,
      canAutoApprove: true,
    },
  ]);
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "1",
      source: "terminal",
      timestamp: "10:45:23",
      level: "info",
      message: "Running npm run build...",
      metadata: { teamId: "frontend" },
    },
    {
      id: "2",
      source: "agent",
      timestamp: "10:45:25",
      level: "info",
      message: "React Dev started analyzing component structure",
      metadata: { teamId: "frontend", agentId: "React Dev" },
    },
    {
      id: "3",
      source: "task",
      timestamp: "10:45:30",
      level: "info",
      message: "Task 'Implement responsive layout' completed",
      metadata: { teamId: "frontend", taskId: "task-123" },
    },
  ]);
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);
  const [selectedUtility, setSelectedUtility] = useState<"notifications" | "history" | "artifacts" | "agents" | null>(null);
  const [liveAgents, setLiveAgents] = useState<any[]>([]);
  const { showToast } = useToast();
  const autosaveTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const workspaceRef = useRef<string | null>(null);

  workspaceRef.current = workspace;

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) || null,
    [tabs, activeTabId]
  );

  const workspaceName = useMemo(() => {
    if (!workspace) return "Workspace";
    const parts = workspace.split(/[\\/]/);
    return parts[parts.length - 1] || "Workspace";
  }, [workspace]);

  const dirtyTabs = useMemo(() => tabs.filter((tab) => tab.isDirty), [tabs]);

  useEffect(() => {
    let isMounted = true;
    const initWorkspace = async () => {
      try {
        const existingWorkspace = await window.ide.getWorkspace();
        if (isMounted && existingWorkspace) {
          setWorkspace(existingWorkspace);
        }
      } catch (error) {
        showToast("Failed to load workspace", "error");
        console.error(error);
      }
    };
    initWorkspace();
    return () => {
      isMounted = false;
    };
  }, [showToast]);

  useEffect(() => {
    let isMounted = true;
    const fetchTasks = async () => {
      if (!sessionId) {
        if (isMounted) {
          setTasks([]);
        }
        return;
      }
      try {
        const list = await window.ide.listTasks(sessionId);
        if (isMounted) {
          setTasks(list);
        }
      } catch (error) {
        showToast("Failed to load tasks", "error");
        console.error(error);
      }
    };
    fetchTasks();
    return () => {
      isMounted = false;
    };
  }, [sessionId, showToast]);

  useEffect(() => {
    if (!workspace) return;

    const savedTabsJson = localStorage.getItem("openTabs");
    const savedActiveTabId = localStorage.getItem("activeTabId");
    let cancelled = false;

    if (savedTabsJson) {
      try {
        const savedTabs: SavedTab[] = JSON.parse(savedTabsJson);

        const restoreTabs = async () => {
          const restoredTabs: Tab[] = [];

          for (const savedTab of savedTabs) {
            try {
              const content = await window.ide.readFile(savedTab.file.relativePath);
              restoredTabs.push({
                id: savedTab.id,
                file: savedTab.file,
                content,
                isDirty: savedTab.isDirty,
              });
            } catch (error) {
              console.error(`Failed to restore tab ${savedTab.file.relativePath}`, error);
            }
          }

          if (!cancelled && restoredTabs.length > 0) {
            setTabs(restoredTabs);
            if (savedActiveTabId) {
              const restoredActive = restoredTabs.find((tab) => tab.id === savedActiveTabId);
              if (restoredActive) {
                setActiveTabId(restoredActive.id);
              } else {
                setActiveTabId(restoredTabs[0].id);
              }
            } else {
              setActiveTabId(restoredTabs[0].id);
            }
          }
        };

        restoreTabs();
      } catch (error) {
        console.error("Failed to parse saved tabs", error);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [workspace]);

  useEffect(() => {
    if (tabs.length > 0) {
      const tabsToSave = tabs.map((tab) => ({
        id: tab.id,
        file: tab.file,
        isDirty: tab.isDirty,
      }));
      localStorage.setItem("openTabs", JSON.stringify(tabsToSave));
      if (activeTabId) {
        localStorage.setItem("activeTabId", activeTabId);
      }
    } else {
      localStorage.removeItem("openTabs");
      localStorage.removeItem("activeTabId");
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    if (selectedUtility === "agents") {
      window.ide
        .workflowGetAllAgents()
        .then((agents) => setLiveAgents(agents))
        .catch((err) => console.error("Failed to load agents:", err));
    }
  }, [selectedUtility]);

  const autosaveTab = useCallback(async (tab: Tab) => {
    try {
      await window.ide.writeFile({ path: tab.file.relativePath, content: tab.content });
      setTabs((prev) =>
        prev.map((item) => (item.id === tab.id ? { ...item, isDirty: false } : item))
      );
    } catch (error) {
      console.error(`Autosave failed for ${tab.file.relativePath}`, error);
    }
  }, []);

  const scheduleAutosave = useCallback(
    (tabId: string, content: string) => {
      const existingTimeout = autosaveTimeoutRef.current.get(tabId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      if (!autosaveEnabled) return;

      const timeout = setTimeout(() => {
        const tab = tabs.find((item) => item.id === tabId);
        if (tab && tab.content === content) {
          autosaveTab(tab);
        }
        autosaveTimeoutRef.current.delete(tabId);
      }, AUTOSAVE_DELAY);

      autosaveTimeoutRef.current.set(tabId, timeout);
    },
    [autosaveEnabled, tabs, autosaveTab]
  );

  useEffect(() => {
    return () => {
      autosaveTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  const openFile = useCallback(
    async (entry: FileEntry) => {
      if (entry.type === "directory") return;

      const existingTab = tabs.find((tab) => tab.file.relativePath === entry.relativePath);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return;
      }

      try {
        const content = await window.ide.readFile(entry.relativePath);
        const newTab: Tab = {
          id: crypto.randomUUID(),
          file: entry,
          content,
          isDirty: false,
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
      } catch (error) {
        showToast(`Failed to open ${entry.relativePath}`, "error");
        console.error(error);
      }
    },
    [tabs, showToast]
  );

  const closeTab = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((item) => item.id === tabId);
      if (!tab) return;

      const timeout = autosaveTimeoutRef.current.get(tabId);
      if (timeout) {
        clearTimeout(timeout);
        autosaveTimeoutRef.current.delete(tabId);
      }

      if (tab.isDirty) {
        try {
          await window.ide.writeFile({ path: tab.file.relativePath, content: tab.content });
        } catch (error) {
          showToast(`Failed to save ${tab.file.relativePath}`, "error");
          console.error(error);
          return;
        }
      }

      const newTabs = tabs.filter((item) => item.id !== tabId);
      setTabs(newTabs);

      if (activeTabId === tabId) {
        if (newTabs.length > 0) {
          const lastTab = newTabs[newTabs.length - 1];
          setActiveTabId(lastTab.id);
        } else {
          setActiveTabId(null);
        }
      }
    },
    [tabs, activeTabId, showToast]
  );

  const saveTab = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((item) => item.id === tabId);
      if (!tab) return;

      try {
        await window.ide.writeFile({ path: tab.file.relativePath, content: tab.content });
        setTabs((prev) =>
          prev.map((item) => (item.id === tabId ? { ...item, isDirty: false } : item))
        );
        showToast(`Saved ${tab.file.relativePath}`, "success");
      } catch (error) {
        showToast(`Failed to save ${tab.file.relativePath}`, "error");
        console.error(error);
      }
    },
    [tabs, showToast]
  );

  const saveAllTabs = useCallback(async () => {
    const timeoutIds: string[] = [];
    autosaveTimeoutRef.current.forEach((_, tabId) => timeoutIds.push(tabId));
    timeoutIds.forEach((tabId) => {
      const timeout = autosaveTimeoutRef.current.get(tabId);
      if (timeout) {
        clearTimeout(timeout);
        autosaveTimeoutRef.current.delete(tabId);
      }
    });

    const dirtyTabsLocal = tabs.filter((tab) => tab.isDirty);
    for (const tab of dirtyTabsLocal) {
      try {
        await window.ide.writeFile({ path: tab.file.relativePath, content: tab.content });
      } catch (error) {
        showToast(`Failed to save ${tab.file.relativePath}`, "error");
        console.error(error);
      }
    }
    setTabs((prev) => prev.map((tab) => ({ ...tab, isDirty: false })));
    if (dirtyTabsLocal.length > 0) {
      showToast(`Saved ${dirtyTabsLocal.length} file(s)`, "success");
    }
  }, [tabs, showToast]);

  const updateTabContent = useCallback(
    (tabId: string, content: string) => {
      setTabs((prev) =>
        prev.map((tab) => (tab.id === tabId ? { ...tab, content, isDirty: true } : tab))
      );
      if (autosaveEnabled) {
        scheduleAutosave(tabId, content);
      }
    },
    [autosaveEnabled, scheduleAutosave]
  );

  const reorderTabs = useCallback((newTabs: Tab[]) => {
    setTabs(newTabs);
  }, []);

  const handleSelectWorkspace = useCallback(async () => {
    if (selectingWorkspace) {
      return;
    }
    setSelectingWorkspace(true);
    try {
      const selected = await window.ide.selectWorkspace();
      setWorkspace(selected);
    } catch (error) {
      showToast("Failed to select workspace", "error");
      console.error(error);
    } finally {
      setSelectingWorkspace(false);
    }
  }, [selectingWorkspace, showToast]);

  const runSearch = useCallback(async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    if (trimmed.length > MAX_QUERY_LENGTH) {
      showToast("Search query too long", "error");
      return;
    }
    setSearchLoading(true);
    try {
      const results = await window.ide.search(trimmed);
      setSearchResults(results);
    } catch (error) {
      showToast("Search failed", "error");
      console.error(error);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, showToast]);

  const runDebouncedSearch = useCallback(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      runSearch();
    }, SEARCH_DEBOUNCE_MS);
  }, [runSearch]);

  const openSearchResult = useCallback(
    async (result: SearchResult) => {
      const newEntry: FileEntry = {
        name: result.relativePath.split(/[\\/]/).pop() || result.relativePath,
        path: result.path,
        relativePath: result.relativePath,
        type: "file" as const,
      };

      const existingTab = tabs.find((tab) => tab.file.relativePath === newEntry.relativePath);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return;
      }

      try {
        const content = await window.ide.readFile(result.relativePath);
        const newTab: Tab = {
          id: crypto.randomUUID(),
          file: newEntry,
          content,
          isDirty: false,
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
      } catch (error) {
        showToast(`Failed to open ${result.relativePath}`, "error");
        console.error(error);
      }
    },
    [tabs, showToast]
  );

  const openFileFromPath = useCallback(
    async (relativePath: string) => {
      const newEntry: FileEntry = {
        name: relativePath.split(/[\\/]/).pop() || relativePath,
        path: workspace ? `${workspace}/${relativePath}` : relativePath,
        relativePath,
        type: "file" as const,
      };

      const existingTab = tabs.find((tab) => tab.file.relativePath === newEntry.relativePath);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return;
      }

      try {
        const content = await window.ide.readFile(relativePath);
        const newTab: Tab = {
          id: crypto.randomUUID(),
          file: newEntry,
          content,
          isDirty: false,
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
      } catch (error) {
        showToast(`Failed to open ${relativePath}`, "error");
        console.error(error);
      }
    },
    [tabs, workspace, showToast]
  );

  const handleApprove = useCallback((approvalId: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
    showToast("Approval accepted", "success");
  }, [showToast]);

  const handleReject = useCallback((approvalId: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
    showToast("Approval rejected", "info");
  }, [showToast]);

  const handleEscalate = useCallback((approvalId: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
    showToast("Escalation reviewed", "success");
  }, [showToast]);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
    showToast("Logs cleared", "success");
  }, [showToast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const inTerminal = target?.closest(".xterm") || target?.classList.contains("xterm-helper-textarea");
      const inInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === "s" && !event.altKey && !event.shiftKey) {
          if (isEditorMode) {
            event.preventDefault();
            if (activeTabId) {
              saveTab(activeTabId);
            }
          }
        } else if (event.key.toLowerCase() === "w") {
          if (isEditorMode) {
            event.preventDefault();
            if (activeTabId) {
              closeTab(activeTabId);
            }
          }
        } else if (event.key === "Tab") {
          if (isEditorMode && !inInput) {
            event.preventDefault();
            const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
            if (event.shiftKey) {
              const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
              if (tabs.length > 1) {
                setActiveTabId(tabs[prevIndex].id);
              }
            } else {
              const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
              if (tabs.length > 1) {
                setActiveTabId(tabs[nextIndex].id);
              }
            }
          }
        } else if (event.key.toLowerCase() === "p" && !event.shiftKey) {
          if (!inTerminal && !inInput) {
            event.preventDefault();
            setQuickOpenOpen(true);
          }
        } else if (event.key.toLowerCase() === "p" && event.shiftKey) {
          if (!inTerminal && !inInput) {
            event.preventDefault();
            setCommandPaletteOpen(true);
          }
        } else if (event.key === ",") {
          if (!inTerminal && !inInput) {
            event.preventDefault();
            setSettingsOpen(true);
          }
        } else if (event.key.toLowerCase() === "m" && !event.shiftKey) {
          if (!inTerminal && !inInput) {
            event.preventDefault();
            toggleMode();
            showToast(`Switched to ${isAutonomousMode ? "Editor" : "Autonomous"} mode`, "success");
          }
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === "s") {
        if (isEditorMode) {
          event.preventDefault();
          saveAllTabs();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTabId, tabs, saveTab, closeTab, saveAllTabs, toggleMode, isEditorMode, isAutonomousMode, showToast]);

  const renderWorkspace = () => {
    if (isAutonomousMode) {
      const teamActivity = selectedTeamId ? {
        teamId: selectedTeamId,
        leadMonologue: {
          id: "lead-1",
          agentId: "lead",
          agentName: "Lead Agent",
          timestamp: "2 min ago",
          type: "monologue",
          content: "Coordinating component audit, awaiting approval on schema migration.",
          confidence: 0.76,
        },
        subAgentStreams: [
          {
            id: "sub-1",
            agentId: "sub-1",
            agentName: "React Dev",
            timestamp: "3 min ago",
            type: "message",
            content: "Aligned spacing tokens with updated design system. Flagged two mismatched variants.",
            confidence: 0.68,
          },
          {
            id: "sub-2",
            agentId: "sub-2",
            agentName: "API Dev",
            timestamp: "5 min ago",
            type: "message",
            content: "Drafted new endpoint contract; waiting on auth constraints.",
            confidence: 0.72,
          },
        ],
        taskQueue: [
          {
            id: "task-1",
            title: "Refactor sidebar grid",
            status: "in_progress",
            assignedTo: "CSS Dev",
            priority: "medium",
            estimatedDuration: "20m",
            createdAt: "10:32",
          },
          {
            id: "task-2",
            title: "Schema migration review",
            status: "queued",
            assignedTo: "Backend Lead",
            priority: "critical",
            estimatedDuration: "1h",
            createdAt: "10:28",
          },
        ],
        recentCommits: [
          {
            hash: "abc123def456",
            shortHash: "abc123d",
            message: "feat: add responsive grid layout",
            author: "Frontend Team",
            timestamp: "3 min ago",
            files: ["src/components/Grid.tsx", "src/styles/grid.css"],
          },
          {
            hash: "def456ghi789",
            shortHash: "def456g",
            message: "fix: button component variant props",
            author: "React Dev",
            timestamp: "8 min ago",
            files: ["src/components/Button.tsx"],
          },
        ],
      } : null;

      if (selectedUtility === "notifications") {
        return <ActivityStream sessionId={sessionId ?? undefined} />;
      }
      if (selectedUtility === "history") {
        const decisions = approvals.map((approval, index) => ({
          id: approval.id,
          timestamp: Date.now() - index * 1000 * 60 * 5,
          agentId: approval.requester,
          team: approval.teamName,
          action: approval.title,
          riskLevel: approval.riskLevel,
          status: approval.type === "escalation" ? "escalated" : "approved",
          reason: approval.description,
          approver: "VP Agent",
          context: approval.description,
        }));

        return (
          <div className="flex h-full flex-col gap-4 p-6 text-xs text-zed-text-muted">
            <div className="rounded-lg border border-zed-border bg-zed-element/60 p-4">
              <ApprovalAudit decisions={decisions} />
            </div>
            <div className="rounded-lg border border-zed-border bg-zed-element/60 p-4">
              <div className="text-sm font-semibold text-zed-text">Recent Commits</div>
              <div className="mt-2 space-y-2">
                {teamActivity?.recentCommits.map((commit) => (
                  <div key={commit.hash} className="flex items-center justify-between rounded-md border border-zed-border-alt bg-zed-element/70 px-3 py-2">
                    <span>{commit.message}</span>
                    <span className="text-[10px]">{commit.timestamp}</span>
                  </div>
                ))}
                {!teamActivity?.recentCommits.length && (
                  <div className="text-[10px] text-zed-text-muted">No recent commits</div>
                )}
              </div>
            </div>
          </div>
        );
      }
      if (selectedUtility === "artifacts") {
        return (
          <div className="flex h-full flex-col gap-4 p-6 text-xs text-zed-text-muted">
            <div className="rounded-lg border border-zed-border bg-zed-element/60 p-4">
              <div className="text-sm font-semibold text-zed-text">Recent Artifacts</div>
              <div className="mt-2 space-y-2">
                {logs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-md border border-zed-border-alt bg-zed-element/70 px-3 py-2"
                  >
                    <span>{log.message}</span>
                    <span className="text-[10px]">{log.timestamp}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-[10px] text-zed-text-muted">No artifacts yet</div>
                )}
              </div>
            </div>
          </div>
        );
      }
      if (selectedUtility === "agents") {
        return (
          <div className="flex h-full flex-col gap-4 p-6 text-xs text-zed-text-muted">
            <div className="rounded-lg border border-zed-border bg-zed-element/60 p-4">
              <div className="text-sm font-semibold text-zed-text">Active Agents</div>
              <div className="mt-2 space-y-2">
                {liveAgents.length > 0 ? (
                  liveAgents.map((agent) => (
                    <div key={agent.id} className="rounded-md border border-zed-border-alt bg-zed-element/70 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zed-text">{agent.id}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          agent.status === "active" ? "bg-green-500/20 text-green-300" :
                          agent.status === "paused" ? "bg-amber-500/20 text-amber-300" :
                          agent.status === "blocked" ? "bg-red-500/20 text-red-300" :
                          "bg-zed-element text-zed-text-muted"
                        }`}>
                          {agent.status}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-zed-text-muted">
                        Profile: {agent.profile} | Level: {agent.level}
                      </div>
                      {agent.superior && (
                        <div className="mt-1 text-[10px] text-zed-text-muted">
                          Reports to: {agent.superior}
                        </div>
                      )}
                      {agent.subordinates && agent.subordinates.length > 0 && (
                        <div className="mt-1 text-[10px] text-zed-text-muted">
                          Manages: {agent.subordinates.join(", ")}
                        </div>
                      )}
                      {agent.currentTaskId && (
                        <div className="mt-1 text-[10px] text-zed-text-muted">
                          Task: {agent.currentTaskId}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-zed-text-muted">No agents registered</div>
                )}
              </div>
            </div>
          </div>
        );
      }

      return <ActivityByTeam teamActivity={teamActivity} />;
    }

    if (workspaceMode === "code") {

      return (
        <EditorPanel
          tab={activeTab}
          onTabChange={(content) => {
            if (activeTabId) {
              updateTabContent(activeTabId, content);
            }
          }}
          workspace={workspace}
          autosaveEnabled={autosaveEnabled}
          onToggleAutosave={setAutosaveEnabled}
          indentation={indentation}
          onIndentationChange={setIndentation}
          wordWrap={wordWrap}
          onWordWrapChange={setWordWrap}
          readOnly={isAutonomousMode}
        />
      );
    }

    const modeCopy = {
      ui: {
        title: "Design Canvas",
        description: "Review system layouts, tokens, and UI flows generated by the agent team.",
      },
      docs: {
        title: "Living Documentation",
        description: "Specs, architecture decisions, and implementation notes stay synced here.",
      },
      api: {
        title: "API Contracts",
        description: "Define endpoints, schemas, and integration surfaces before implementation.",
      },
    };

    const details = modeCopy[workspaceMode as keyof typeof modeCopy];

    return (
      <div className="flex h-full items-center justify-center bg-zed-bg">
        <div className="max-w-md space-y-3 rounded-xl border border-zed-border bg-zed-panel/70 p-6 text-center shadow-[0_20px_60px_rgba(8,12,16,0.35)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zed-element text-zed-accent">
            <Sparkles size={20} />
          </div>
          <div className="text-sm font-semibold text-zed-text">{details.title}</div>
          <p className="text-xs text-zed-text-muted">{details.description}</p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-zed-text-muted">
            <span className="rounded-full border border-zed-border px-2 py-1">Auto-generated</span>
            <span className="rounded-full border border-zed-border px-2 py-1">Review mode</span>
          </div>
        </div>
      </div>
    );
  };

  const renderBottomPanel = () => {
    if (bottomTab === "terminal") {
      return <TerminalPanel readOnly={isAutonomousMode} />;
    }
    if (bottomTab === "tasks") {
      return <ExecutionPanel spec={spec} tasks={tasks} />;
    }
    if (bottomTab === "runs") {
      return <OutputPanel defaultSource="build" />;
    }
    if (bottomTab === "tests") {
      return <OutputPanel defaultSource="test" />;
    }
    if (isAutonomousMode) {
      return <ExecutionLog logs={logs} autoScroll={autoScrollLogs} onToggleAutoScroll={() => setAutoScrollLogs(prev => !prev)} onClearLogs={handleClearLogs} />;
    }
    return <LogsPanel sessionId={sessionId} />;
  };

  if (!workspace) {
    return (
      <div className="flex h-screen items-center justify-center bg-zed-bg">
        <div className="space-y-4 rounded-xl border border-zed-border bg-zed-panel/80 p-8 text-center shadow-[0_25px_60px_rgba(6,10,14,0.5)]">
          <div className="text-sm font-semibold text-zed-text">Select a workspace folder</div>
          <div className="text-xs text-zed-text-muted">
            Choose a project to begin orchestrating your autonomous build pipeline.
          </div>
          <Button onClick={handleSelectWorkspace} disabled={selectingWorkspace}>
            {selectingWorkspace ? "Opening..." : "Choose Folder"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen flex-col ${isAutonomousMode ? "bg-zed-bg-secondary" : "bg-zed-bg"}`}>
      <header className={`flex items-center justify-between gap-4 border-b border-zed-border px-5 py-3 text-[12px] backdrop-blur ${
        isAutonomousMode ? "bg-zed-panel/95" : "bg-zed-surface/90"
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-zed-text">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zed-element text-zed-accent">
              <Sparkles size={16} />
            </div>
            <div className="text-sm font-semibold tracking-wide">Product Designer</div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zed-text-muted">
            <span className="rounded-full border border-zed-border px-2 py-1">{workspaceName}</span>
            <span className="flex items-center gap-1 rounded-full border border-zed-border px-2 py-1">
              <GitBranch size={12} /> dev
            </span>
            <span className="rounded-full border border-zed-border px-2 py-1">Model: Core Agent</span>
            {isAutonomousMode && (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[10px] text-amber-200">
                Read-only oversight
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zed-text-muted">
          <div className="flex items-center gap-1 rounded-lg border border-zed-border bg-zed-element px-2 py-1">
            <button
              onClick={() => setMode("autonomous")}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors ${
                mode === "autonomous"
                  ? "bg-zed-accent text-zed-bg"
                  : "text-zed-text-muted hover:text-zed-text"
              }`}
              title="Autonomous Mode - Observe only (Ctrl+M)"
            >
              <Bot size={12} /> Autonomous
            </button>
            <button
              onClick={() => setMode("editor")}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors ${
                mode === "editor"
                  ? "bg-zed-accent text-zed-bg"
                  : "text-zed-text-muted hover:text-zed-text"
              }`}
              title="Editor Mode - Full control (Ctrl+M)"
            >
              <Edit3 size={12} /> Editor
            </button>
          </div>
          {isEditorMode && (
            <button className="flex items-center gap-1 rounded-full border border-zed-border px-3 py-1 text-zed-text hover:border-zed-border-focused hover:text-zed-text">
              <PlayCircle size={12} /> Run
            </button>
          )}
          {isEditorMode && (
            <button className="flex items-center gap-1 rounded-full border border-zed-border px-3 py-1 hover:border-zed-border-focused">
              <Users size={12} /> Share
            </button>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1 rounded-full border border-zed-border px-3 py-1 hover:border-zed-border-focused"
          >
            <Settings size={12} /> Settings
          </button>
          <div className="flex items-center gap-1 rounded-full border border-zed-border px-3 py-1">
            <Bot size={12} /> Supervisor
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {isEditorMode && (
          <aside className="flex w-80 flex-col border-r border-zed-border bg-zed-panel/85">
            <div className="flex items-center gap-2 border-b border-zed-border-alt px-4 py-3 text-[11px] uppercase tracking-wide text-zed-text-muted">
              {leftTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setLeftTab(tab.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${
                      leftTab === tab.id
                        ? "bg-zed-element text-zed-text"
                        : "text-zed-text-muted hover:bg-zed-element-hover"
                    }`}
                  >
                    <Icon size={12} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="flex-1 overflow-hidden">
              {leftTab === "project" && (
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-zed-border-alt px-4 py-3 text-xs">
                    <div className="text-zed-text">Project Tree</div>
                    <span className="text-[11px] text-zed-text-muted">{tabs.length} open</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <FileExplorer workspace={workspace} onOpenFile={openFile} readOnly={isAutonomousMode} />
                  </div>
                </div>
              )}
              {leftTab === "context" && (
                <div className="flex h-full flex-col gap-4 p-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-zed-text">Context Library</span>
                      <span className="rounded-full border border-zed-border px-2 py-0.5 text-[10px] text-zed-text-muted">
                        Synced
                      </span>
                    </div>
                    <input
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        runDebouncedSearch();
                      }}
                      className="w-full rounded-md border border-zed-border bg-zed-element px-3 py-2 text-xs text-zed-text placeholder:text-zed-text-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
                      placeholder="Search files, notes, and specs"
                    />
                  </div>
                  <div className="grid gap-2">
                    {[
                      "User stories",
                      "Requirements",
                      "Constraints",
                      "Decisions",
                      "Research",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-lg border border-zed-border-alt bg-zed-element/80 px-3 py-2 text-[11px] text-zed-text-muted"
                      >
                        <div className="text-zed-text">{item}</div>
                        <div className="text-[10px] text-zed-text-placeholder">Last updated 2h ago</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 space-y-2 overflow-auto">
                    {searchResults.length === 0 && !searchLoading && (
                      <div className="text-[11px] text-zed-text-muted">
                        {searchQuery.trim() ? "No results found." : "Type to search files and content..."}
                      </div>
                    )}
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.path}-${index}`}
                        type="button"
                        onClick={() => openSearchResult(result)}
                        className="flex w-full flex-col rounded-md border border-zed-border-alt bg-zed-element px-3 py-2 text-left text-xs text-zed-text hover:border-zed-border"
                      >
                        <span className="text-zed-text">{result.relativePath}</span>
                        <span className="text-[11px] text-zed-text-muted">
                          {result.line > 0 ? `Line ${result.line}: ` : ""}
                          {result.preview}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {isAutonomousMode && (
          <TeamsRail
            teams={teams}
            selectedTeamId={selectedTeamId}
            onSelectTeam={(teamId) => {
              setSelectedTeamId(teamId);
              if (teamId) {
                setSelectedUtility(null);
              }
            }}
            notifications={approvals.length}
            historyEnabled={selectedUtility === "history"}
            artifactsEnabled={selectedUtility === "artifacts"}
            agentsEnabled={selectedUtility === "agents"}
            onToggleNotifications={() => {
              setSelectedUtility((prev) => (prev === "notifications" ? null : "notifications"));
              setSelectedTeamId(null);
            }}
            onToggleHistory={() => {
              setSelectedUtility((prev) => (prev === "history" ? null : "history"));
              setSelectedTeamId(null);
            }}
            onToggleArtifacts={() => {
              setSelectedUtility((prev) => (prev === "artifacts" ? null : "artifacts"));
              setSelectedTeamId(null);
            }}
            onToggleAgents={() => {
              setSelectedUtility((prev) => (prev === "agents" ? null : "agents"));
              setSelectedTeamId(null);
            }}
          />
        )}

        <main className={`flex flex-1 flex-col ${isAutonomousMode ? "bg-zed-panel/80" : "bg-zed-bg"}`}>
          <div className={`flex items-center justify-between border-b border-zed-border px-4 py-2 text-[12px] text-zed-text-muted ${
            isAutonomousMode ? "bg-zed-panel/85" : "bg-zed-bg/80"
          }`}>
            <div className="flex items-center gap-2">
              {isEditorMode &&
                workspaceModes.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setWorkspaceMode(mode.id)}
                      className={`flex items-center gap-1 rounded-full px-3 py-1 transition-colors ${
                        workspaceMode === mode.id
                          ? "bg-zed-element text-zed-text"
                          : "hover:bg-zed-element-hover"
                      }`}
                    >
                      <Icon size={12} />
                      {mode.label}
                    </button>
                  );
                })}
            </div>
            <div className="flex items-center gap-3">
              {isEditorMode && dirtyTabs.length > 0 && (
                <span className="flex items-center gap-1 text-amber-300">
                  <ChevronRight size={12} /> {dirtyTabs.length} unsaved
                </span>
              )}
            </div>
          </div>

          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={closeTab}
            onSaveTab={saveTab}
            onSaveAll={saveAllTabs}
            onReorderTabs={reorderTabs}
            readOnly={isAutonomousMode}
          />

          <div className="flex-1 overflow-hidden">{renderWorkspace()}</div>

          <div className={`border-t border-zed-border ${isAutonomousMode ? "bg-zed-panel/85 h-64" : "bg-zed-panel/80 h-72"}`}>
            <div className="flex items-center gap-2 border-b border-zed-border-alt px-4 py-2 text-[11px] uppercase tracking-wide text-zed-text-muted">
              {bottomTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setBottomTab(tab.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${
                      bottomTab === tab.id
                        ? "bg-zed-element text-zed-text"
                        : "text-zed-text-muted hover:bg-zed-element-hover"
                    }`}
                  >
                    <Icon size={12} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="h-[calc(100%-36px)] bg-zed-bg">{renderBottomPanel()}</div>
          </div>
        </main>

        {isEditorMode && (
          <aside className="flex w-[360px] flex-col border-l border-zed-border bg-zed-panel/80">
            <div className="flex items-center gap-2 border-b border-zed-border-alt px-4 py-3 text-[11px] uppercase tracking-wide text-zed-text-muted">
              {rightTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setRightTab(tab.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${
                      rightTab === tab.id
                        ? "bg-zed-element text-zed-text"
                        : "text-zed-text-muted hover:bg-zed-element-hover"
                    }`}
                  >
                    <Icon size={12} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="flex-1 overflow-hidden">
              {rightTab === "prompt" && <PromptInspector />}
              {rightTab === "spec" && <PlanningPanel spec={spec} tasks={tasks} onSessionStart={setSessionId} onSpecReady={setSpec} />}
              {rightTab === "debate" && (
                <div className="flex h-full items-center justify-center text-xs text-zed-text-muted">
                  Debate Room coming soon
                </div>
              )}
              {rightTab === "design" && (
                <div className="flex h-full items-center justify-center text-xs text-zed-text-muted">
                  Design Studio coming soon
                </div>
              )}
              {rightTab === "execution" && <ExecutionPanel spec={spec} tasks={tasks} />}
            </div>
          </aside>
        )}

        {isAutonomousMode && (
          <ApprovalsQueue
            approvals={approvals}
            autoApproveEnabled={autoApproveEnabled}
            onToggleAutoApprove={() => setAutoApproveEnabled(prev => !prev)}
            onApprove={handleApprove}
            onReject={handleReject}
            onEscalate={handleEscalate}
          />
        )}
      </div>

      <QuickOpenPanel
        isOpen={quickOpenOpen}
        onClose={() => setQuickOpenOpen(false)}
        onFileSelect={openFile}
        workspace={workspace}
      />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={[
          {
            id: "file.newFile",
            title: "New File",
            category: "file",
            action: () => {
              const fileName = prompt("Enter file name:");
              if (fileName && workspace) {
                const path = `${workspace}/${fileName}`;
                window.ide
                  .createFile({ path, content: "" })
                  .then(() => {
                    window.ide.refreshFileTree();
                    showToast(`Created ${fileName}`, "success");
                  })
                  .catch((error) => {
                    showToast("Failed to create file", "error");
                    console.error(error);
                  });
              }
            },
          },
          {
            id: "file.newFolder",
            title: "New Folder",
            category: "file",
            action: () => {
              const folderName = prompt("Enter folder name:");
              if (folderName && workspace) {
                const path = `${workspace}/${folderName}`;
                window.ide
                  .createDir({ path })
                  .then(() => {
                    window.ide.refreshFileTree();
                    showToast(`Created ${folderName}`, "success");
                  })
                  .catch((error) => {
                    showToast("Failed to create folder", "error");
                    console.error(error);
                  });
              }
            },
          },
          {
            id: "file.save",
            title: "Save File",
            category: "file",
            action: () => {
              if (activeTabId) {
                saveTab(activeTabId);
              }
            },
            shortcut: "Ctrl+S",
          },
          {
            id: "file.saveAll",
            title: "Save All",
            category: "file",
            action: () => {
              saveAllTabs();
            },
            shortcut: "Ctrl+Alt+S",
          },
          {
            id: "settings.open",
            title: "Open Settings",
            category: "settings",
            action: () => {
              setSettingsOpen(true);
            },
            shortcut: "Ctrl+,",
          },
        ]}
      />

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <AppShell />
      </ErrorBoundary>
    </ToastProvider>
  );
}
