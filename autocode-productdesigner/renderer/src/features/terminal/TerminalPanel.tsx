import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Terminal as TerminalIcon, Plus, Trash2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TerminalInstance {
  id: string;
  name: string;
  shell: string;
  isRunning: boolean;
}

interface TerminalPanelProps {
  className?: string;
}

export const TerminalPanel = memo(function TerminalPanel({
  className
}: TerminalPanelProps) {
  const [instances, setInstances] = useState<TerminalInstance[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initTerminal = async () => {
      try {
        const terms = await window.ide.listTerminals();
        setInstances(terms);
        if (terms.length > 0 && !activeId) {
          setActiveId(terms[0].id);
        }
      } catch (error) {
        console.error("Failed to list terminals", error);
      }
    };
    initTerminal();

    const unsub = window.ide.onTerminalData((data) => {
      if (data.terminalId === activeId && terminalRef.current) {
        const line = data.data;
        if (line === "\r" || line === "\n") {
          const textarea = terminalRef.current.querySelector("textarea");
          if (textarea) {
            textarea.value += "\n";
            textarea.scrollTop = textarea.scrollHeight;
          }
        } else {
          const textarea = terminalRef.current.querySelector("textarea");
          if (textarea) {
            textarea.value += line;
            textarea.scrollTop = textarea.scrollHeight;
          }
        }
      }
    });

    return () => {
      unsub();
    };
  }, [activeId]);

  const createTerminal = useCallback(async () => {
    try {
      const term = await window.ide.createTerminal({});
      setInstances(prev => [...prev, {
        id: term.terminalId,
        name: `Terminal ${prev.length + 1}`,
        shell: term.shell || "bash",
        isRunning: true
      }]);
      setActiveId(term.terminalId);
    } catch (error) {
      console.error("Failed to create terminal", error);
    }
  }, []);

  const killTerminal = useCallback(async (id: string) => {
    try {
      await window.ide.killTerminal({ terminalId: id });
      setInstances(prev => prev.filter(t => t.id !== id));
      if (activeId === id) {
        setActiveId(instances.length > 1 ? instances[0].id : null);
      }
    } catch (error) {
      console.error("Failed to kill terminal", error);
    }
  }, [activeId, instances]);

  const handleInput = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (activeId) {
      window.ide.sendTerminalInput({ terminalId: activeId, data: e.key });
    }
  }, [activeId]);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center gap-1 border-b border-zed-border-alt px-2 py-1">
        <div className="flex items-center gap-1 overflow-x-auto">
          {instances.map((term) => (
            <button
              key={term.id}
              onClick={() => setActiveId(term.id)}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-0.5 text-xs",
                activeId === term.id
                  ? "bg-zed-element text-zed-text"
                  : "text-zed-text-muted hover:bg-zed-element-hover"
              )}
            >
              <TerminalIcon size={12} />
              <span className="truncate max-w-[80px]">{term.name}</span>
              {term.isRunning ? (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="sm" onClick={createTerminal} className="h-6 w-6 p-0">
            <Plus size={14} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-zed-bg relative">
        {activeId ? (
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 p-2 overflow-auto font-mono text-xs">
              <textarea
                ref={terminalRef}
                readOnly
                className="w-full h-full bg-transparent text-zed-text resize-none outline-none"
                style={{ fontFamily: "monospace", fontSize: "13px" }}
              />
            </div>
            <input
              type="text"
              onKeyDown={(e) => {
                if (e.key === "Enter" && activeId) {
                  const input = e.currentTarget;
                  window.ide.sendTerminalInput({ terminalId: activeId, data: input.value + "\r" });
                  input.value = "";
                }
              }}
              placeholder="Type a command..."
              className="w-full bg-zed-element border-t border-zed-border px-3 py-2 text-xs text-zed-text outline-none"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-zed-text-muted text-sm">
            <div className="text-center">
              <TerminalIcon size={32} className="mx-auto mb-2 opacity-50" />
              <p>No terminal open</p>
              <Button variant="secondary" size="sm" onClick={createTerminal} className="mt-2">
                <Plus size={14} className="mr-1" />
                New Terminal
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
