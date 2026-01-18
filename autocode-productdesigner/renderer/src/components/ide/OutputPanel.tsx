import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { Play, Square, Trash2, Download, ChevronDown, ChevronUp, AlertCircle, CheckCircle, XCircle, Terminal } from "lucide-react";

interface OutputEntry {
  id: string;
  type: "output" | "error" | "success" | "info";
  timestamp: string;
  content: string;
  source?: string;
}

interface OutputPanelProps {
  defaultSource?: string;
}

const SOURCE_TYPES = [
  { id: "build", name: "Build", icon: "🔨" },
  { id: "test", name: "Test", icon: "🧪" },
  { id: "lint", name: "Lint", icon: "🔍" }
];

export const OutputPanel = ({ defaultSource = "build" }: OutputPanelProps) => {
  const [outputs, setOutputs] = useState<OutputEntry[]>([]);
  const [activeSource, setActiveSource] = useState<string>(defaultSource);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const outputsEndRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const processIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (outputsEndRef.current) {
      outputsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [outputs]);

  const addOutput = useCallback((content: string, type: OutputEntry["type"] = "output", source?: string) => {
    const newEntry: OutputEntry = {
      id: `out_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      timestamp: new Date().toISOString(),
      content,
      source: source || activeSource
    };
    setOutputs(prev => [...prev, newEntry]);
  }, [activeSource]);

  const clearOutputs = useCallback(() => {
    setOutputs([]);
    showToast("Output cleared", "success");
  }, [showToast]);

  const exportOutputs = useCallback(() => {
    const content = outputs
      .map((out) => `[${out.timestamp}] [${out.type.toUpperCase()}] ${out.content}`)
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `output-${activeSource}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast("Output exported", "success");
  }, [outputs, activeSource, showToast]);

  const runBuild = async () => {
    setIsRunning(true);
    addOutput("Starting build...", "info", "build");

    try {
      const workspace = await window.ide.getWorkspace();
      if (!workspace) {
        addOutput("No workspace selected", "error", "build");
        setIsRunning(false);
        return;
      }

      addOutput("Running npm run build...", "info", "build");

      const result = await window.ide.runCommand({
        source: "build"
      });

      if (result.success) {
        addOutput(result.output || "Build completed successfully!", "success", "build");
      } else {
        addOutput(`Build failed: ${result.error}`, "error", "build");
        if (result.output) {
          addOutput(result.output, "output", "build");
        }
      }
    } catch (error: any) {
      addOutput(`Build error: ${error.message}`, "error", "build");
    } finally {
      setIsRunning(false);
    }
  };

  const runTests = async () => {
    setIsRunning(true);
    addOutput("Running tests...", "info", "test");

    try {
      const workspace = await window.ide.getWorkspace();
      if (!workspace) {
        addOutput("No workspace selected", "error", "test");
        setIsRunning(false);
        return;
      }

      addOutput("Running npm test...", "info", "test");

      const result = await window.ide.runCommand({
        source: "test"
      });

      if (result.success) {
        addOutput(result.output || "All tests passed!", "success", "test");
      } else {
        addOutput(`Tests failed: ${result.error}`, "error", "test");
        if (result.output) {
          addOutput(result.output, "output", "test");
        }
      }
    } catch (error: any) {
      addOutput(`Test error: ${error.message}`, "error", "test");
    } finally {
      setIsRunning(false);
    }
  };

  const runLint = async () => {
    setIsRunning(true);
    addOutput("Running linter...", "info", "lint");

    try {
      const workspace = await window.ide.getWorkspace();
      if (!workspace) {
        addOutput("No workspace selected", "error", "lint");
        setIsRunning(false);
        return;
      }

      addOutput("Running npm run lint...", "info", "lint");

      const result = await window.ide.runCommand({
        source: "lint"
      });

      if (result.success) {
        addOutput(result.output || "Lint completed successfully!", "success", "lint");
      } else {
        addOutput(`Lint found issues: ${result.error}`, "error", "lint");
        if (result.output) {
          addOutput(result.output, "output", "lint");
        }
      }
    } catch (error: any) {
      addOutput(`Lint error: ${error.message}`, "error", "lint");
    } finally {
      setIsRunning(false);
    }
  };

  const stopProcess = () => {
    setIsRunning(false);
    addOutput("Process stopped by user", "info", activeSource);
  };

  const getTypeIcon = (type: OutputEntry["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle size={14} className="text-green-400" />;
      case "error":
        return <XCircle size={14} className="text-red-400" />;
      case "info":
        return <AlertCircle size={14} className="text-blue-400" />;
      default:
        return <Terminal size={14} className="text-zed-text-muted" />;
    }
  };

  const getTypeColor = (type: OutputEntry["type"]): string => {
    switch (type) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "info":
        return "text-blue-400";
      default:
        return "text-zed-text";
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3
      });
    } catch {
      return timestamp;
    }
  };

  const filteredOutputs = outputs.filter(out => out.source === activeSource);

  return (
    <div className="h-full flex flex-col bg-zed-bg">
      <div className="flex items-center px-3 py-2 bg-zed-bg-tertiary border-b border-zed-border">
        <div className="flex items-center gap-1 overflow-x-auto">
          {SOURCE_TYPES.map((source) => (
            <button
              key={source.id}
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${
                activeSource === source.id
                  ? "bg-zed-primary text-white"
                  : "text-zed-text-muted hover:text-zed-text hover:bg-zed-bg-secondary"
              }`}
              onClick={() => setActiveSource(source.id)}
            >
              <span>{source.icon}</span>
              <span>{source.name}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {activeSource === "build" && (
            <button
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                isRunning
                  ? "bg-red-500/20 text-red-400"
                  : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
              }`}
              onClick={isRunning ? stopProcess : runBuild}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <Square size={12} />
                  Stop
                </>
              ) : (
                <>
                  <Play size={12} />
                  Build
                </>
              )}
            </button>
          )}

          {activeSource === "test" && (
            <button
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                isRunning
                  ? "bg-red-500/20 text-red-400"
                  : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
              }`}
              onClick={isRunning ? stopProcess : runTests}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <Square size={12} />
                  Stop
                </>
              ) : (
                <>
                  <Play size={12} />
                  Test
                </>
              )}
            </button>
          )}

          {activeSource === "lint" && (
            <button
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                isRunning
                  ? "bg-red-500/20 text-red-400"
                  : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
              }`}
              onClick={isRunning ? stopProcess : runLint}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <Square size={12} />
                  Stop
                </>
              ) : (
                <>
                  <Play size={12} />
                  Lint
                </>
              )}
            </button>
          )}

          <div className="w-px h-4 bg-zed-border" />

          <button
            className="p-1.5 rounded hover:bg-zed-bg-secondary transition-colors"
            onClick={exportOutputs}
            title="Export output"
          >
            <Download size={14} className="text-zed-text-muted" />
          </button>

          <button
            className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
            onClick={clearOutputs}
            title="Clear output"
          >
            <Trash2 size={14} className="text-red-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 font-mono text-xs">
        {filteredOutputs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zed-text-muted">
            <Terminal size={32} className="mb-2 opacity-50" />
            <div>No output yet.</div>
            <div className="mt-1 text-zed-text-muted/70">
              Run a build, test, or lint command to see output here.
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredOutputs.map((entry) => (
              <div
                key={entry.id}
                className={`group rounded px-2 py-0.5 cursor-pointer transition-colors hover:bg-zed-bg-secondary ${
                  entry.type === "error" ? "bg-red-500/5" : ""
                }`}
                onClick={() => entry.content.length > 300 && setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
              >
                <div className="flex items-start gap-2">
                  {getTypeIcon(entry.type)}
                  <span className="text-[10px] text-zed-text-muted whitespace-nowrap">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                  <span className={`flex-1 break-all ${getTypeColor(entry.type)}`}>
                    {expandedEntry === entry.id ? entry.content : entry.content.slice(0, 300)}
                    {expandedEntry !== entry.id && entry.content.length > 300 && "..."}
                  </span>
                  {entry.content.length > 300 && (
                    <span className="text-zed-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      {expandedEntry === entry.id ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={outputsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};
