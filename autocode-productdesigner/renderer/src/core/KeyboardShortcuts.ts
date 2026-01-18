import { useEffect, useCallback } from "react";
import type { Tab } from "@autocode/types";

export interface ShortcutHandler {
  onSave: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onSaveAll: () => void;
  onTabBlur: (tabId: string) => void;
  onQuickOpen: () => void;
  onCommandPalette: () => void;
  onSettings: () => void;
  onPreviousTab: (tabs: Tab[], currentTabId: string | null) => void;
  onNextTab: (tabs: Tab[], currentTabId: string | null) => void;
}

export function useKeyboardShortcuts(
  handler: ShortcutHandler,
  tabs: Tab[],
  activeTabId: string | null
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const inTerminal = target?.closest(".xterm") || target?.classList.contains("xterm-helper-textarea");

      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === "s" && !event.altKey && !event.shiftKey) {
          event.preventDefault();
          if (activeTabId) {
            handler.onSave(activeTabId);
          }
        } else if (event.key.toLowerCase() === "w") {
          event.preventDefault();
          if (activeTabId) {
            handler.onCloseTab(activeTabId);
          }
        } else if (event.key === "Tab") {
          event.preventDefault();
          if (event.shiftKey) {
            handler.onPreviousTab(tabs, activeTabId);
          } else {
            handler.onNextTab(tabs, activeTabId);
          }
        } else if (event.key.toLowerCase() === "p" && !event.shiftKey) {
          if (!inTerminal) {
            event.preventDefault();
            handler.onQuickOpen();
          }
        } else if (event.key.toLowerCase() === "p" && event.shiftKey) {
          if (!inTerminal) {
            event.preventDefault();
            handler.onCommandPalette();
          }
        } else if (event.key === ",") {
          if (!inTerminal) {
            event.preventDefault();
            handler.onSettings();
          }
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handler.onSaveAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    const handleWindowBlur = () => {
      if (activeTabId) {
        handler.onTabBlur(activeTabId);
      }
    };
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [handler, tabs, activeTabId]);
}

export function navigateToPreviousTab(tabs: Tab[], currentTabId: string | null): string | null {
  if (tabs.length <= 1) return currentTabId;
  const currentIndex = tabs.findIndex(t => t.id === currentTabId);
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
  return tabs[prevIndex].id;
}

export function navigateToNextTab(tabs: Tab[], currentTabId: string | null): string | null {
  if (tabs.length <= 1) return currentTabId;
  const currentIndex = tabs.findIndex(t => t.id === currentTabId);
  const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
  return tabs[nextIndex].id;
}
