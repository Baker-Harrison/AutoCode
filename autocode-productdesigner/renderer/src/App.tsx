import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { EditorPanel } from "@/components/ide/EditorPanel";
import { TerminalPanel } from "@/components/ide/TerminalPanel";
import { PlanningPanel } from "@/components/ide/PlanningPanel";
import { LogsPanel } from "@/components/ide/LogsPanel";
import { TabBar } from "@/components/ide/TabBar";
import { QuickOpenPanel } from "@/components/ide/QuickOpenPanel";
import { CommandPalette } from "@/components/ide/CommandPalette";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import type { FileEntry, PlanningSpec, SearchResult, TaskItem, Tab } from "@/types/ipc";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Settings, Folder, Search } from "lucide-react";

const leftTabs = ["explorer", "search"] as const;
const bottomTabs = ["terminal", "logs"] as const;
const MAX_QUERY_LENGTH = 200;
const AUTOSAVE_DELAY = 1000;
const SEARCH_DEBOUNCE_MS = 150;

interface SavedTab {
  id: string;
  file: FileEntry;
  isDirty: boolean;
}

const AppShell = () => {
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<(typeof leftTabs)[number]>("explorer");
  const [bottomTab, setBottomTab] = useState<(typeof bottomTabs)[number]>("terminal");
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
  const { showToast } = useToast();
  const autosaveTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const workspaceRef = useRef<string | null>(null);

  workspaceRef.current = workspace;

  const activeTab = useMemo(() => 
    tabs.find(t => t.id === activeTabId) || null, 
    [tabs, activeTabId]
  );

  const dirtyTabs = useMemo(() => tabs.filter(t => t.isDirty), [tabs]);

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

    const savedTabsJson = localStorage.getItem('openTabs');
    const savedActiveTabId = localStorage.getItem('activeTabId');
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
                isDirty: savedTab.isDirty
              });
            } catch (error) {
              console.error(`Failed to restore tab ${savedTab.file.relativePath}`, error);
            }
          }

          if (!cancelled && restoredTabs.length > 0) {
            setTabs(restoredTabs);
            if (savedActiveTabId) {
              const activeTab = restoredTabs.find(t => t.id === savedActiveTabId);
              if (activeTab) {
                setActiveTabId(activeTab.id);
              } else {
                setActiveTabId(restoredTabs[0].id);
              }
            } else {
              setActiveTabId(restoredTabs[0].id);
            }
          }
        };

        restoreTabs();
      } catch (e) {
        console.error('Failed to parse saved tabs', e);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [workspace]);

  useEffect(() => {
    if (tabs.length > 0) {
      const tabsToSave = tabs.map(t => ({
        id: t.id,
        file: t.file,
        isDirty: t.isDirty
      }));
      localStorage.setItem('openTabs', JSON.stringify(tabsToSave));
      if (activeTabId) {
        localStorage.setItem('activeTabId', activeTabId);
      }
    } else {
      localStorage.removeItem('openTabs');
      localStorage.removeItem('activeTabId');
    }
  }, [tabs, activeTabId]);

  const autosaveTab = useCallback(async (tab: Tab) => {
    try {
      await window.ide.writeFile({ path: tab.file.relativePath, content: tab.content });
      setTabs(prev => prev.map(t => 
        t.id === tab.id ? { ...t, isDirty: false } : t
      ));
    } catch (error) {
      console.error(`Autosave failed for ${tab.file.relativePath}`, error);
    }
  }, []);

  const scheduleAutosave = useCallback((tabId: string, content: string) => {
    const existingTimeout = autosaveTimeoutRef.current.get(tabId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (!autosaveEnabled) return;

    const timeout = setTimeout(() => {
      const tab = tabs.find(t => t.id === tabId);
      if (tab && tab.content === content) {
        autosaveTab(tab);
      }
      autosaveTimeoutRef.current.delete(tabId);
    }, AUTOSAVE_DELAY);

    autosaveTimeoutRef.current.set(tabId, timeout);
  }, [autosaveEnabled, tabs, autosaveTab]);

  useEffect(() => {
    return () => {
      autosaveTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const openFile = useCallback(async (entry: FileEntry) => {
    if (entry.type === "directory") return;
    
    const existingTab = tabs.find(t => t.file.relativePath === entry.relativePath);
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
        isDirty: false
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (error) {
      showToast(`Failed to open ${entry.relativePath}`, "error");
      console.error(error);
    }
  }, [tabs, showToast]);

  const closeTab = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
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

    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        const lastTab = newTabs[newTabs.length - 1];
        setActiveTabId(lastTab.id);
      } else {
        setActiveTabId(null);
      }
    }
  }, [tabs, activeTabId, showToast]);

  const saveTab = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    try {
      await window.ide.writeFile({ path: tab.file.relativePath, content: tab.content });
      setTabs(prev => prev.map(t => 
        t.id === tabId ? { ...t, isDirty: false } : t
      ));
      showToast(`Saved ${tab.file.relativePath}`, "success");
    } catch (error) {
      showToast(`Failed to save ${tab.file.relativePath}`, "error");
      console.error(error);
    }
  }, [tabs, showToast]);

  const saveAllTabs = useCallback(async () => {
    const timeoutIds: string[] = [];
    autosaveTimeoutRef.current.forEach((_, tabId) => timeoutIds.push(tabId));
    timeoutIds.forEach(tabId => {
      const timeout = autosaveTimeoutRef.current.get(tabId);
      if (timeout) {
        clearTimeout(timeout);
        autosaveTimeoutRef.current.delete(tabId);
      }
    });

    const dirtyTabsLocal = tabs.filter(t => t.isDirty);
    for (const tab of dirtyTabsLocal) {
      try {
        await window.ide.writeFile({ path: tab.file.relativePath, content: tab.content });
      } catch (error) {
        showToast(`Failed to save ${tab.file.relativePath}`, "error");
        console.error(error);
      }
    }
    setTabs(prev => prev.map(t => ({ ...t, isDirty: false })));
    if (dirtyTabsLocal.length > 0) {
      showToast(`Saved ${dirtyTabsLocal.length} file(s)`, "success");
    }
  }, [tabs, showToast]);

  const updateTabContent = useCallback((tabId: string, content: string) => {
    setTabs(prev => prev.map(t => 
      t.id === tabId ? { ...t, content, isDirty: true } : t
    ));
    if (autosaveEnabled) {
      scheduleAutosave(tabId, content);
    }
  }, [autosaveEnabled, scheduleAutosave]);

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

  const openSearchResult = useCallback(async (result: SearchResult) => {
    const newEntry: FileEntry = {
      name: result.relativePath.split(/[\\/]/).pop() || result.relativePath,
      path: result.path,
      relativePath: result.relativePath,
      type: "file" as const
    };

    const existingTab = tabs.find(t => t.file.relativePath === newEntry.relativePath);
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
        isDirty: false
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (error) {
      showToast(`Failed to open ${result.relativePath}`, "error");
      console.error(error);
    }
  }, [tabs, showToast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const inTerminal = target?.closest(".xterm") || target?.classList.contains("xterm-helper-textarea");

      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === "s" && !event.altKey && !event.shiftKey) {
          event.preventDefault();
          if (activeTabId) {
            saveTab(activeTabId);
          }
        } else if (event.key.toLowerCase() === "w") {
          event.preventDefault();
          if (activeTabId) {
            closeTab(activeTabId);
          }
        } else if (event.key === "Tab") {
          event.preventDefault();
          const currentIndex = tabs.findIndex(t => t.id === activeTabId);
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
        } else if (event.key.toLowerCase() === "p" && !event.shiftKey) {
          if (!inTerminal) {
            event.preventDefault();
            setQuickOpenOpen(true);
          }
        } else if (event.key.toLowerCase() === "p" && event.shiftKey) {
          if (!inTerminal) {
            event.preventDefault();
            setCommandPaletteOpen(true);
          }
        } else if (event.key === ",") {
          if (!inTerminal) {
            event.preventDefault();
            setSettingsOpen(true);
          }
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveAllTabs();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTabId, tabs, saveTab, closeTab, saveAllTabs]);

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
                {tab === "explorer" && <Folder size={14} />}
                {tab === "search" && <Search size={14} />}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {leftTab === "explorer" && (
              <FileExplorer workspace={workspace} onOpenFile={openFile} />
            )}
            {leftTab === "search" && (
              <div className="flex h-full flex-col gap-3 p-3">
                <div className="flex gap-2">
                  <input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      runDebouncedSearch();
                    }}
                    className="flex-1 rounded-md border border-zed-border bg-zed-element px-3 py-2 text-xs text-zed-text placeholder:text-zed-text-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
                    placeholder="Search files and content"
                  />
                  <Button size="sm" variant="secondary" onClick={runSearch}>
                    {searchLoading ? "Searching..." : "Search"}
                  </Button>
                </div>
                <div className="flex-1 space-y-2 overflow-auto">
                  {searchResults.length === 0 && !searchLoading && (
                    <div className="text-xs text-zed-text-muted">
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
                        {result.line > 0 ? `Line ${result.line}: ` : ""}{result.preview}
                      </span>
                    </button>
                  ))}
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
                <LogsPanel sessionId={sessionId} />
              )}
            </div>
          </div>
        </main>

        <aside className="flex w-96 flex-col border-l border-zed-border bg-zed-panel">
          <PlanningPanel
            spec={spec}
            tasks={tasks}
            onSessionStart={(id) => setSessionId(id)}
            onSpecReady={(data) => setSpec(data)}
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
            id: "file.newFile",
            title: "New File",
            category: "file",
            action: () => {
              const fileName = prompt("Enter file name:");
              if (fileName && workspace) {
                const path = `${workspace}/${fileName}`;
                window.ide.createFile({ path, content: "" }).then(() => {
                  window.ide.refreshFileTree();
                  showToast(`Created ${fileName}`, "success");
                }).catch((error) => {
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
                window.ide.createDir({ path }).then(() => {
                  window.ide.refreshFileTree();
                  showToast(`Created ${folderName}`, "success");
                }).catch((error) => {
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
            id: "file.closeTab",
            title: "Close Tab",
            category: "file",
            action: () => {
              if (activeTabId) {
                closeTab(activeTabId);
              }
            },
            shortcut: "Ctrl+W",
          },
          {
            id: "edit.undo",
            title: "Undo",
            category: "edit",
            action: () => {
              document.execCommand("undo");
            },
          },
          {
            id: "edit.redo",
            title: "Redo",
            category: "edit",
            action: () => {
              document.execCommand("redo");
            },
          },
          {
            id: "edit.find",
            title: "Find",
            category: "edit",
            action: () => {},
            shortcut: "Ctrl+F",
          },
          {
            id: "edit.findReplace",
            title: "Find and Replace",
            category: "edit",
            action: () => {},
            shortcut: "Ctrl+H",
          },
          {
            id: "edit.gotoLine",
            title: "Go to Line",
            category: "edit",
            action: () => {},
            shortcut: "Ctrl+G",
          },
          {
            id: "view.toggleSidebar",
            title: "Toggle Sidebar",
            category: "view",
            action: () => {
              setLeftTab((prev) => (prev === "explorer" ? "search" : "explorer"));
            },
          },
          {
            id: "view.toggleTerminal",
            title: "Toggle Terminal",
            category: "view",
            action: () => {
              setBottomTab((prev) => (prev === "terminal" ? "logs" : "terminal"));
            },
          },
          {
            id: "git.status",
            title: "Git: Status",
            category: "git",
            action: () => {
              setLeftTab("git");
            },
          },
          {
            id: "git.commit",
            title: "Git: Commit",
            category: "git",
            action: () => {},
          },
          {
            id: "help.about",
            title: "About",
            category: "help",
            action: () => {
              showToast("Autocode IDE v0.1.0", "info");
            },
          },
          {
            id: "settings.open",
            title: "Open Settings",
            category: "help",
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
