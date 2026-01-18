import { useCallback, useEffect, useRef, useState } from "react";
import type { Tab, FileEntry } from "@autocode/types";
import { useToast } from "@/components/ui/toast";

export interface SavedTab {
  id: string;
  file: FileEntry;
  isDirty: boolean;
}

export function useTabManager(
  workspace: string | null,
  settings: { general: { restoreTabs: boolean } },
  onTabSelect?: (tab: Tab) => void
) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const tabsRef = useRef<Tab[]>([]);
  const autosaveTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const { showToast } = useToast();

  tabsRef.current = tabs;

  const activeTab = tabs.find(t => t.id === activeTabId) || null;
  const dirtyTabs = tabs.filter(t => t.isDirty);

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
      onTabSelect?.(newTab);
    } catch (error) {
      showToast(`Failed to open ${entry.relativePath}`, "error");
      console.error(error);
    }
  }, [tabs, showToast, onTabSelect]);

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
  }, []);

  const reorderTabs = useCallback((newTabs: Tab[]) => {
    setTabs(newTabs);
  }, []);

  useEffect(() => {
    if (!workspace || !settings.general.restoreTabs) return;

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
  }, [workspace, settings.general.restoreTabs]);

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

  return {
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
    reorderTabs,
    autosaveTimeoutRef
  };
}
