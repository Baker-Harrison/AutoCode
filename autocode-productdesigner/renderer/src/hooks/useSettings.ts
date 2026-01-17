import { useState, useEffect, useCallback } from 'react';
import { Settings, defaultSettings } from '@/types/settings';

const SETTINGS_KEY = 'settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === 'undefined') {
      return defaultSettings;
    }
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultSettings, ...parsed, general: { ...defaultSettings.general, ...parsed.general }, editor: { ...defaultSettings.editor, ...parsed.editor }, terminal: { ...defaultSettings.terminal, ...parsed.terminal }, git: { ...defaultSettings.git, ...parsed.git } };
      }
    } catch {
      console.warn('Failed to load settings from localStorage');
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      console.warn('Failed to save settings to localStorage');
    }
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<Settings> | ((current: Settings) => Partial<Settings>)) => {
    setSettings(current => {
      const newUpdates = typeof updates === 'function' ? updates(current) : updates;
      return { ...current, ...newUpdates };
    });
  }, []);

  const updateGeneral = useCallback((updates: Partial<Settings['general']>) => {
    setSettings(current => ({
      ...current,
      general: { ...current.general, ...updates }
    }));
  }, []);

  const updateEditor = useCallback((updates: Partial<Settings['editor']>) => {
    setSettings(current => ({
      ...current,
      editor: { ...current.editor, ...updates }
    }));
  }, []);

  const updateTerminal = useCallback((updates: Partial<Settings['terminal']>) => {
    setSettings(current => ({
      ...current,
      terminal: { ...current.terminal, ...updates }
    }));
  }, []);

  const updateGit = useCallback((updates: Partial<Settings['git']>) => {
    setSettings(current => ({
      ...current,
      git: { ...current.git, ...updates }
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  return {
    settings,
    setSettings: updateSettings,
    updateGeneral,
    updateEditor,
    updateTerminal,
    updateGit,
    resetSettings,
  };
}
