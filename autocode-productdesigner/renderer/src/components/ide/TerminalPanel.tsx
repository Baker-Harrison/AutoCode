import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { useToast } from "@/components/ui/toast";
import "xterm/css/xterm.css";
import { Plus, X, Settings, Copy, Trash2, Terminal as TerminalIcon, Square } from "lucide-react";

interface TerminalTab {
  id: string;
  name: string;
  shell: string;
  isRunning: boolean;
}

interface ShellOption {
  name: string;
  path: string;
}

const SHELL_OPTIONS: ShellOption[] = [
  { name: "PowerShell", path: "powershell.exe" },
  { name: "Command Prompt", path: "cmd.exe" },
  { name: "WSL", path: "wsl.exe" },
  { name: "Git Bash", path: "bash.exe" }
];

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20];

const DARK_THEME = {
  background: "#282c33",
  foreground: "#dce0e5",
  cursor: "#74ade8",
  black: "#282c33",
  red: "#e06c75",
  green: "#98c379",
  yellow: "#e5c07b",
  blue: "#61afef",
  magenta: "#c678dd",
  cyan: "#56b6c2",
  white: "#abb2bf"
};

const LIGHT_THEME = {
  background: "#ffffff",
  foreground: "#24292e",
  cursor: "#0366d6",
  black: "#24292e",
  red: "#d73a49",
  green: "#22863a",
  yellow: "#b08800",
  blue: "#0366d6",
  magenta: "#6f42c1",
  cyan: "#059669",
  white: "#6a737d"
};

export const TerminalPanel = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [terminals, setTerminals] = useState<TerminalTab[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [availableShells, setAvailableShells] = useState<ShellOption[]>(SHELL_OPTIONS);
  const [selectedShell, setSelectedShell] = useState<string>("powershell.exe");
  const [fontSize, setFontSize] = useState<number>(12);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const { showToast } = useToast();

  const terminalsRef = useRef<Map<string, { terminal: Terminal; fitAddon: FitAddon; shell: string; isRunning: boolean }>>(new Map());
  const unsubscribersRef = useRef<Map<string, () => void>>(new Map());

  const createTerminal = useCallback(async (shellPath?: string) => {
    try {
      const shell = shellPath || selectedShell;
      const { terminalId } = await window.ide.createTerminal({ shell });
      if (!terminalId) {
        throw new Error("Failed to get terminal ID");
      }
      const name = `Shell ${terminals.length + 1}`;
      const newTab: TerminalTab = {
        id: terminalId,
        name,
        shell,
        isRunning: true
      };
      setTerminals(prev => [...prev, newTab]);
      setActiveTerminalId(terminalId);
    } catch (error) {
      showToast("Failed to create terminal", "error");
      console.error(error);
    }
  }, [selectedShell, terminals.length, showToast]);

  const closeTerminal = useCallback(async (terminalId: string, force: boolean = false) => {
    const termData = terminalsRef.current.get(terminalId);
    if (termData?.isRunning && !force) {
      const confirmClose = window.confirm("This terminal is still running. Close anyway?");
      if (!confirmClose) return;
    }
    try {
      await window.ide.disposeTerminal({ terminalId });
      const unsubscribe = unsubscribersRef.current.get(terminalId);
      if (unsubscribe) unsubscribe();
      terminalsRef.current.delete(terminalId);
      unsubscribersRef.current.delete(terminalId);
      setTerminals(prev => prev.filter(t => t.id !== terminalId));
      if (activeTerminalId === terminalId) {
        const remaining = terminals.filter(t => t.id !== terminalId);
        setActiveTerminalId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
    } catch (error) {
      showToast("Failed to close terminal", "error");
      console.error(error);
    }
  }, [activeTerminalId, terminals, showToast]);

  const setupTerminalInstance = useCallback(async (terminalId: string, container: HTMLElement, shell: string) => {
    try {
      const terminal = new Terminal({
        fontSize,
        fontFamily: "SF Mono, SFMono-Regular, JetBrains Mono, IBM Plex Mono, monospace",
        theme: isDarkTheme ? DARK_THEME : LIGHT_THEME,
        convertEol: true
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(container);
      fitAddon.fit();

      window.ide.resizeTerminal({
        terminalId,
        cols: terminal.cols,
        rows: terminal.rows
      });

      const handleData = (data: string) => {
        window.ide.sendTerminalInput({ terminalId, data });
      };
      terminal.onData(handleData);

      const unsubscribe = window.ide.onTerminalData((payload) => {
        if (payload.terminalId === terminalId) {
          terminal.write(payload.data);
          if (payload.data.includes("[terminal closed") || payload.data.includes("[terminal error")) {
            setTerminals(prev => prev.map(t => t.id === terminalId ? { ...t, isRunning: false } : t));
            const termData = terminalsRef.current.get(terminalId);
            if (termData) termData.isRunning = false;
          }
        }
      });

      terminalsRef.current.set(terminalId, { terminal, fitAddon, shell, isRunning: true });
      unsubscribersRef.current.set(terminalId, unsubscribe);

      window.ide.resizeTerminal({
        terminalId,
        cols: terminal.cols,
        rows: terminal.rows
      });
    } catch (error) {
      console.error("Failed to setup terminal:", error);
      showToast("Failed to setup terminal", "error");
    }
  }, [fontSize, isDarkTheme, showToast]);

  useEffect(() => {
    let mounted = true;

    const setupActiveTerminal = async () => {
      if (!activeTerminalId || !containerRef.current) return;

      const existingTerm = terminalsRef.current.get(activeTerminalId);
      if (existingTerm) return;

      const container = containerRef.current;
      container.innerHTML = "";

      const activeTab = terminals.find(t => t.id === activeTerminalId);
      if (activeTab) {
        await setupTerminalInstance(activeTerminalId, container, activeTab.shell);
      }
    };

    setupActiveTerminal();

    const handleResize = () => {
      if (!activeTerminalId) return;
      const termData = terminalsRef.current.get(activeTerminalId);
      if (termData) {
        termData.fitAddon.fit();
        window.ide.resizeTerminal({
          terminalId: activeTerminalId,
          cols: termData.terminal.cols,
          rows: termData.terminal.rows
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      mounted = false;
      window.removeEventListener("resize", handleResize);
    };
  }, [activeTerminalId, terminals, setupTerminalInstance]);

  useEffect(() => {
    if (terminals.length === 0) {
      createTerminal();
    }
  }, [terminals.length, createTerminal]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu]);

  const copySelection = () => {
    const termData = terminalsRef.current.get(activeTerminalId || "");
    if (termData) {
      const selection = termData.terminal.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
        showToast("Copied to clipboard", "success");
      }
    }
    setContextMenu(null);
  };

  const pasteFromClipboard = async () => {
    if (!activeTerminalId) return;
    const termData = terminalsRef.current.get(activeTerminalId);
    if (termData) {
      const text = await navigator.clipboard.readText();
      if (text) {
        window.ide.sendTerminalInput({ terminalId: activeTerminalId, data: text });
      }
    }
    setContextMenu(null);
  };

  const clearTerminal = () => {
    const termData = terminalsRef.current.get(activeTerminalId || "");
    if (termData) {
      termData.terminal.clear();
    }
    setContextMenu(null);
  };

  const selectAll = () => {
    const termData = terminalsRef.current.get(activeTerminalId || "");
    if (termData) {
      termData.terminal.selectAll();
    }
    setContextMenu(null);
  };

  const updateTerminalFontSize = (newSize: number) => {
    setFontSize(newSize);
    terminalsRef.current.forEach(({ terminal }) => {
      terminal.options.fontSize = newSize;
    });
  };

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    terminalsRef.current.forEach(({ terminal }) => {
      terminal.options.theme = isDarkTheme ? LIGHT_THEME : DARK_THEME;
    });
  };

  const killProcess = () => {
    if (activeTerminalId) {
      window.ide.killTerminal({ terminalId: activeTerminalId });
      showToast("Process terminated", "success");
    }
    setContextMenu(null);
  };

  return (
    <div className="h-full flex flex-col bg-zed-bg" onContextMenu={handleContextMenu}>
      <div className="flex items-center px-2 py-1 bg-zed-bg-tertiary border-b border-zed-border">
        <div className="flex items-center gap-1 overflow-x-auto">
          {terminals.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-1 px-2 py-1 text-xs cursor-pointer rounded-t transition-colors ${
                activeTerminalId === tab.id
                  ? "bg-zed-bg-secondary text-zed-text border-t border-l border-r border-zed-border"
                  : "text-zed-text-muted hover:text-zed-text hover:bg-zed-bg-secondary"
              }`}
              onClick={() => setActiveTerminalId(tab.id)}
            >
              <TerminalIcon size={12} className={tab.isRunning ? "text-green-400" : "text-gray-500"} />
              <span className="max-w-[80px] truncate">{tab.name}</span>
              {tab.isRunning && <span className="text-[9px] text-green-400">●</span>}
              <button
                className="ml-1 p-0.5 hover:bg-zed-bg-primary rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(tab.id);
                }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <button
            className="flex items-center gap-1 px-2 py-1 text-xs text-zed-text-muted hover:text-zed-text hover:bg-zed-bg-secondary rounded"
            onClick={() => createTerminal()}
          >
            <Plus size={12} />
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <select
            className="text-xs bg-zed-bg-secondary text-zed-text border border-zed-border rounded px-1 py-0.5"
            value={selectedShell}
            onChange={(e) => setSelectedShell(e.target.value)}
          >
            {availableShells.map((shell) => (
              <option key={shell.path} value={shell.path}>{shell.name}</option>
            ))}
          </select>
          <button
            className={`p-1 text-zed-text-muted hover:text-zed-text rounded ${showSettings ? "bg-zed-bg-secondary" : ""}`}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="flex items-center gap-4 px-4 py-2 bg-zed-bg-secondary border-b border-zed-border text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zed-text-muted">Font:</span>
            <div className="flex items-center gap-1">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  className={`px-1.5 py-0.5 rounded ${
                    fontSize === size
                      ? "bg-zed-primary text-white"
                      : "text-zed-text-muted hover:text-zed-text"
                  }`}
                  onClick={() => updateTerminalFontSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`px-2 py-0.5 rounded ${
                isDarkTheme ? "bg-zed-primary text-white" : "text-zed-text-muted"
              }`}
              onClick={() => !isDarkTheme && toggleTheme()}
            >
              Dark
            </button>
            <button
              className={`px-2 py-0.5 rounded ${
                !isDarkTheme ? "bg-zed-primary text-white" : "text-zed-text-muted"
              }`}
              onClick={() => isDarkTheme && toggleTheme()}
            >
              Light
            </button>
          </div>
          <button
            className="flex items-center gap-1 text-zed-text-muted hover:text-zed-text"
            onClick={() => {
              const termData = terminalsRef.current.get(activeTerminalId || "");
              if (termData) termData.terminal.clear();
            }}
          >
            <Trash2 size={12} />
            Clear
          </button>
          {activeTerminalId && (
            <button
              className="flex items-center gap-1 text-zed-text-muted hover:text-red-400"
              onClick={() => {
                window.ide.killTerminal({ terminalId: activeTerminalId });
                showToast("Process terminated", "success");
              }}
            >
              <Square size={12} />
              Kill Process
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-hidden" ref={containerRef} />

      {contextMenu && (
        <div
          className="fixed z-50 bg-zed-bg-secondary border border-zed-border rounded shadow-lg py-1 text-xs"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-3 py-1.5 text-left text-zed-text hover:bg-zed-bg-primary flex items-center gap-2"
            onClick={copySelection}
          >
            <Copy size={12} /> Copy
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-zed-text hover:bg-zed-bg-primary flex items-center gap-2"
            onClick={pasteFromClipboard}
          >
            <span className="text-sm">Ctrl+V</span> Paste
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-zed-text hover:bg-zed-bg-primary flex items-center gap-2"
            onClick={selectAll}
          >
            <TerminalIcon size={12} /> Select All
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-zed-text hover:bg-zed-bg-primary flex items-center gap-2"
            onClick={clearTerminal}
          >
            <Trash2 size={12} /> Clear
          </button>
          <div className="border-t border-zed-border my-1" />
          <button
            className="w-full px-3 py-1.5 text-left text-red-400 hover:bg-zed-bg-primary flex items-center gap-2"
            onClick={killProcess}
          >
            <Square size={12} /> Kill Process
          </button>
        </div>
      )}
    </div>
  );
};
