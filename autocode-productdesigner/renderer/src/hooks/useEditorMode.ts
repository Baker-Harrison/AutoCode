import { useState, useEffect, useCallback } from "react";
import type { ObserverMode } from "@/types/observer";

const MODE_STORAGE_KEY = "observerMode";

const DEFAULT_MODE: ObserverMode = "autonomous";

export function useEditorMode() {
  const [mode, setModeState] = useState<ObserverMode>(() => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    if (stored === "autonomous" || stored === "editor") {
      return stored;
    }
    return DEFAULT_MODE;
  });

  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);

  const setMode = useCallback((newMode: ObserverMode) => {
    setModeState(newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === "autonomous" ? "editor" : "autonomous"));
  }, []);

  const isEditorMode = mode === "editor";
  const isAutonomousMode = mode === "autonomous";

  return {
    mode,
    setMode,
    toggleMode,
    isEditorMode,
    isAutonomousMode,
  };
}
