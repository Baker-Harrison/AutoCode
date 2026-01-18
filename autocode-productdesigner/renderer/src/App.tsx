import { useCallback, useMemo, useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { useSettings } from "@/hooks/useSettings";
import type { FileEntry, PlanningSpec, SearchResult, TaskItem } from "@autocode/types";
import { FileExplorer } from "@/features/fileExplorer";
import { EditorPanel } from "@/features/editor";
import { TerminalPanel } from "@/features/terminal";
import { PlanningPanel } from "@/features/planning";
import { TabBar } from "@/features/tabs";
import { QuickOpenPanel, CommandPalette } from "@/features/quickOpen";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { useTabManager, useWorkspaceManager, useAutoSave, useKeyboardShortcuts, navigateToNextTab, navigateToPreviousTab } from "@/core";

const leftTabs = ["explorer", "search"] as const;
const bottomTabs = ["terminal", "logs"] as const;

const AppShell = () => {
  const { settings, updateGeneral } = useSettings();
  const { showToast } = useToast();

  const {
    workspace,
    selectingWorkspace,
    selectWorkspace
  } = useWorkspaceManager(settings);

  const {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    activeTab,
    dirtyTabs,
    openFile,
    closeTab,
    saveTab,
    saveAllTabs,
    updateTabContent,
    reorderTabs
  } = useTabManager(workspace, settings);

  const {
    autosaveTimeoutRef,
    scheduleAutosave,
    flushAutosave,
    handleTabBlur
  } = useAutoSave(
    { current: tabs },
    settings.general.autoSave === "delay",
    settings.general.autoSave === "onFocusChange",
    settings.general.autoSaveDelay * 1000
  );

  const [leftTab, setLeftTab] = useState<(typeof leftTabs)[number]>("explorer");
  const [bottomTab, setBottomTab] = useState<(typeof bottomTabs)[number]>("terminal");
  const [spec, setSpec] = useState<PlanningSpec | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [indentation, setIndentation] = useState<2 | 4 | 8>(2);
  const [wordWrap, setWordWrap] = useState(false);

  useMemo(() => {
    if (!workspace || !settings.general.restoreTabs) return;
    const savedTabsJson = localStorage.getItem('openTabs');
    const savedActiveTabId = localStorage.getItem('activeTabId');
    if (savedTabsJson && savedActiveTabId) {
      try {
        const savedTabs = JSON.parse(savedTabsJson);
        if (savedTabs.length > 0 && !activeTabId) {
          setActiveTabId(savedActiveTabId);
        }
      } catch (e) {
        console.error('Failed to parse saved tabs', e);
      }
    }
  }, [workspace, settings.general.restoreTabs]);

  useMemo(() => {
    if (!sessionId) {
      setTasks([]);
      return;
    }
    const fetchTasks = async () => {
      try {
        const list = await window.ide.listTasks(sessionId);
        setTasks(list);
      } catch (error) {
        console.error("Failed to load tasks", error);
      }
    };
    fetchTasks();
  }, [sessionId]);

  const handleSelectWorkspace = useCallback(async () => {
    const selected = await selectWorkspace();
    if (selected && !settings.general.restoreWorkspace) {
      updateGeneral({ restoreWorkspace: true });
    }
  }, [selectWorkspace, settings.general.restoreWorkspace, updateGeneral]);

  const autosaveEnabled = settings.general.autoSave === "delay";
  const autosaveOnBlur = settings.general.autoSave === "onFocusChange";
  const autosaveDelayMs = settings.general.autoSaveDelay * 1000;

  const handleTabChange = useCallback((content: string) => {
    if (activeTabId) {
      updateTabContent(activeTabId, content);
      if (autosaveEnabled) {
        scheduleAutosave(activeTabId, content);
      }
    }
  }, [activeTabId, updateTabContent, autosaveEnabled, scheduleAutosave]);

  useKeyboardShortcuts({
    onSave: (tabId: string) => saveTab(tabId),
    onCloseTab: (tabId: string) => closeTab(tabId),
    onSaveAll: () => saveAllTabs(),
    onTabBlur: (tabId: string) => handleTabBlur(tabId),
    onQuickOpen: () => setQuickOpenOpen(true),
    onCommandPalette: () => setCommandPaletteOpen(true),
    onSettings: () => setSettingsOpen(true),
    onPreviousTab: () => setActiveTabId(navigateToPreviousTab(tabs, activeTabId)),
    onNextTab: () => setActiveTabId(navigateToNextTab(tabs, activeTabId))
  }, tabs, activeTabId);

  useMemo(() => {
    if (!autosaveEnabled && activeTabId) {
      flushAutosave(activeTabId);
    }
  }, [autosaveEnabled, activeTabId, flushAutosave]);

  useMemo(() => {
    if (autosaveOnBlur || !activeTabId) return;
    flushAutosave(activeTabId);
  }, [autosaveOnBlur, activeTabId, flushAutosave]);

  if (!workspace) {
    return (
      <div className="flex h-screen items-center justify-center bg-zed-bg">
        <div className="space-y-4 rounded-md border border-zed-border bg-zed-panel p-6 text-center">
          <div className="text-sm font-semibold text-zed-text">Select a workspace folder</div>
          <Button onClick={handleSelectWorkspace} disabled={selectingWorkspace}>
            {selectingWorkspace ? "Opening..." : "Choose Folder"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zed-bg">
      <header className="flex items-center justify-between gap-4 border-b border-zed-border bg-zed-surface px-4 py-2 text-xs">
        <div className="flex items-center gap-4 text-zed-text-muted">
          {activeTab?.isDirty && <span className="text-amber-300">● Unsaved</span>}
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded p-1 text-zed-text-muted hover:bg-zed-element hover:text-zed-text"
            title="Settings (Ctrl+,)"
          >
            <Settings size={14} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-72 flex-col border-r border-zed-border bg-zed-panel">
          <div className="flex items-center gap-2 border-b border-zed-border-alt px-3 py-2 text-[11px] uppercase tracking-wide text-zed-text-muted">
            {leftTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={`flex items-center gap-1.5 rounded px-2 py-1 ${
                  leftTab === tab
                    ? "bg-zed-element text-zed-text"
                    : "text-zed-text-muted hover:bg-zed-element-hover"
                }`}
              >
                {tab === "explorer" && <FileExplorer workspace={workspace} onOpenFile={openFile} className="h-full" />}
                {tab === "search" && <div className="h-full">Search</div>}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {leftTab === "explorer" && (
              <FileExplorer workspace={workspace} onOpenFile={openFile} />
            )}
            {leftTab === "search" && (
              <div className="h-full flex flex-col">
                <div className="p-3 border-b border-zed-border-alt">
                  <input
                    className="w-full rounded-md border border-zed-border bg-zed-element px-3 py-2 text-xs text-zed-text"
                    placeholder="Search files and content..."
                  />
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="flex flex-1 flex-col bg-zed-bg">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={closeTab}
            onSaveTab={saveTab}
            onSaveAll={saveAllTabs}
            onReorderTabs={reorderTabs}
          />
          <div className="flex-1 overflow-hidden">
            <EditorPanel
              tab={activeTab}
              onTabChange={handleTabChange}
              workspace={workspace}
              autosaveEnabled={autosaveEnabled}
              onToggleAutosave={(enabled) => updateGeneral({ autoSave: enabled ? "delay" : "off" })}
              indentation={indentation}
              onIndentationChange={setIndentation}
              wordWrap={wordWrap}
              onWordWrapChange={setWordWrap}
            />
          </div>

          <div className="h-64 border-t border-zed-border bg-zed-panel">
            <div className="flex items-center gap-2 border-b border-zed-border-alt px-3 py-1 text-[11px] uppercase tracking-wide text-zed-text-muted">
              {bottomTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setBottomTab(tab)}
                  className={`rounded px-2 py-1 ${
                    bottomTab === tab
                      ? "bg-zed-element text-zed-text"
                      : "text-zed-text-muted hover:bg-zed-element-hover"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="h-[calc(100%-28px)] bg-zed-bg">
              {bottomTab === "terminal" ? (
                <TerminalPanel />
              ) : (
                <div className="h-full flex items-center justify-center text-zed-text-muted text-sm">
                  Logs Panel
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="flex w-96 flex-col border-l border-zed-border bg-zed-panel">
          <PlanningPanel
            spec={spec}
            tasks={tasks}
            onSessionStart={setSessionId}
            onSpecReady={setSpec}
          />
        </aside>
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
