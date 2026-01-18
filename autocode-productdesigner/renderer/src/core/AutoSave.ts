import { useCallback, useEffect, useRef } from "react";
import type { Tab } from "@autocode/types";
import { useToast } from "@/components/ui/toast";

export function useAutoSave(
  tabsRef: React.MutableRefObject<Tab[]>,
  autosaveEnabled: boolean,
  autosaveOnBlur: boolean,
  autosaveDelayMs: number
) {
  const autosaveTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const { showToast } = useToast();

  const autosaveTab = useCallback(async (tab: Tab) => {
    try {
      await window.ide.writeFile({ path: tab.file.relativePath, content: tab.content });
      return true;
    } catch (error) {
      console.error(`Autosave failed for ${tab.file.relativePath}`, error);
      return false;
    }
  }, []);

  const scheduleAutosave = useCallback((tabId: string, content: string) => {
    const existingTimeout = autosaveTimeoutRef.current.get(tabId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (!autosaveEnabled) return;

    const timeout = setTimeout(() => {
      const tab = tabsRef.current.find(t => t.id === tabId);
      if (tab && tab.content === content) {
        autosaveTab(tab);
      }
      autosaveTimeoutRef.current.delete(tabId);
    }, autosaveDelayMs);

    autosaveTimeoutRef.current.set(tabId, timeout);
  }, [autosaveEnabled, autosaveDelayMs, autosaveTab, tabsRef]);

  const flushAutosave = useCallback((tabId?: string | null) => {
    const ids = tabId ? [tabId] : Array.from(autosaveTimeoutRef.current.keys());
    ids.forEach(id => {
      const timeout = autosaveTimeoutRef.current.get(id);
      if (timeout) {
        clearTimeout(timeout);
        autosaveTimeoutRef.current.delete(id);
      }
      const tab = tabsRef.current.find(t => t.id === id);
      if (tab?.isDirty) {
        autosaveTab(tab);
      }
    });
  }, [autosaveTab, tabsRef]);

  const handleTabBlur = useCallback(async (tabId: string) => {
    if (!autosaveOnBlur) return;
    const tab = tabsRef.current.find(t => t.id === tabId);
    if (!tab || !tab.isDirty) return;
    const success = await autosaveTab(tab);
    if (success) {
      return true;
    } else {
      showToast(`Failed to save ${tab.file.relativePath}`, "error");
      return false;
    }
  }, [autosaveOnBlur, autosaveTab, showToast, tabsRef]);

  useEffect(() => {
    return () => {
      autosaveTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return {
    autosaveTimeoutRef,
    scheduleAutosave,
    flushAutosave,
    handleTabBlur
  };
}
