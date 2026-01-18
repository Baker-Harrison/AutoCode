export type SettingsCategory = 'general' | 'editor' | 'extensions' | 'git' | 'terminal' | 'knowledge' | 'about';

export type Settings = {
  general: {
    theme: 'dark' | 'light' | 'auto';
    accentColor: string;
    uiFontFamily: string;
    uiFontSize: number;
    autoSave: 'off' | 'delay' | 'onFocusChange';
    autoSaveDelay: number;
    restoreWorkspace: boolean;
    restoreTabs: boolean;
  };
  editor: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    fontLigatures: boolean;
    indentUsing: 'spaces' | 'tabs';
    tabSize: number;
    insertSpaces: boolean;
    trimTrailingWhitespace: boolean;
    lineNumbers: boolean;
    wordWrap: boolean;
    minimap: boolean;
    renderWhitespace: 'none' | 'border' | 'all';
    bracketPairGuide: boolean;
    cursorBlink: boolean;
    cursorStyle: 'block' | 'line' | 'underline';
    multiCursor: boolean;
  };
  terminal: {
    shell: string;
    fontSize: number;
    fontFamily: string;
    cursorBlink: boolean;
    scrollback: number;
    copyOnSelect: boolean;
    rightClickPaste: boolean;
  };
  git: {
    enabled: boolean;
    showInSidebar: boolean;
    autoFetch: boolean;
    fetchInterval: number;
    defaultBranch: string;
  };
};

export const defaultSettings: Settings = {
  general: {
    theme: 'dark',
    accentColor: '#3b82f6',
    uiFontFamily: 'Inter, system-ui, sans-serif',
    uiFontSize: 12,
    autoSave: 'off',
    autoSaveDelay: 5,
    restoreWorkspace: true,
    restoreTabs: true,
  },
  editor: {
    fontFamily: 'SF Mono, Menlo, Consolas, monospace',
    fontSize: 14,
    lineHeight: 1.5,
    fontLigatures: false,
    indentUsing: 'spaces',
    tabSize: 2,
    insertSpaces: true,
    trimTrailingWhitespace: false,
    lineNumbers: true,
    wordWrap: false,
    minimap: false,
    renderWhitespace: 'none',
    bracketPairGuide: true,
    cursorBlink: true,
    cursorStyle: 'block',
    multiCursor: true,
  },
  terminal: {
    shell: 'powershell',
    fontSize: 13,
    fontFamily: 'SF Mono, Menlo, Consolas, monospace',
    cursorBlink: true,
    scrollback: 1000,
    copyOnSelect: true,
    rightClickPaste: true,
  },
  git: {
    enabled: true,
    showInSidebar: true,
    autoFetch: false,
    fetchInterval: 5,
    defaultBranch: 'main',
  },
};

export const keyboardShortcuts = [
  { id: 'save', name: 'Save', shortcut: 'Ctrl+S', description: 'Save current file' },
  { id: 'saveAll', name: 'Save All', shortcut: 'Ctrl+Alt+S', description: 'Save all open files' },
  { id: 'closeTab', name: 'Close Tab', shortcut: 'Ctrl+W', description: 'Close current tab' },
  { id: 'nextTab', name: 'Next Tab', shortcut: 'Ctrl+Tab', description: 'Switch to next tab' },
  { id: 'prevTab', name: 'Previous Tab', shortcut: 'Ctrl+Shift+Tab', description: 'Switch to previous tab' },
  { id: 'search', name: 'Search', shortcut: 'Ctrl+F', description: 'Search in files' },
  { id: 'settings', name: 'Settings', shortcut: 'Ctrl+,', description: 'Open settings' },
  { id: 'quickOpen', name: 'Quick Open', shortcut: 'Ctrl+P', description: 'Quick open file' },
  { id: 'commandPalette', name: 'Command Palette', shortcut: 'Ctrl+Shift+P', description: 'Open command palette' },
  { id: 'toggleTerminal', name: 'Toggle Terminal', shortcut: 'Ctrl+`', description: 'Show/hide terminal' },
  { id: 'commit', name: 'Commit', shortcut: 'Ctrl+Enter', description: 'Commit changes in git' },
  { id: 'stage', name: 'Stage File', shortcut: 'Ctrl+Alt+U', description: 'Stage file in git' },
] as const;

export type KeyboardShortcutId = typeof keyboardShortcuts[number]['id'];
