import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Search, Command, File, Folder, Edit, Eye, GitBranch, HelpCircle, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  category: string;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

const categoryIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  file: File,
  edit: Edit,
  view: Eye,
  git: GitBranch,
  help: HelpCircle,
  settings: Settings,
};

const categoryLabels: Record<string, string> = {
  file: "File",
  edit: "Edit",
  view: "View",
  git: "Git",
  help: "Help",
  settings: "Settings",
};

export const CommandPalette = memo(function CommandPalette({
  isOpen,
  onClose,
  commands
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useCallback((node: HTMLInputElement | null) => {
    if (node && isOpen) {
      node.focus();
    }
  }, [isOpen]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands.slice(0, 20);
    const lowerQuery = query.toLowerCase();
    return commands.filter(c =>
      c.title.toLowerCase().includes(lowerQuery) ||
      c.category.toLowerCase().includes(lowerQuery) ||
      c.id.toLowerCase().includes(lowerQuery)
    ).slice(0, 20);
  }, [query, commands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, filteredCommands, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]">
      <div className="w-full max-w-xl rounded-lg border border-zed-border bg-zed-panel shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 border-b border-zed-border-alt px-4 py-3">
          <Command size={16} className="text-zed-text-muted" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 border-0 bg-transparent p-0 text-sm text-zed-text placeholder:text-zed-text-muted focus-visible:outline-none"
          />
          <span className="text-xs text-zed-text-muted">Ctrl+Shift+P</span>
        </div>

        <div className="max-h-[400px] overflow-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-xs text-zed-text-muted">
              No commands found
            </div>
          ) : (
            <div className="py-2">
              {filteredCommands.map((command, index) => {
                const Icon = categoryIcons[command.category] || Command;
                return (
                  <button
                    key={command.id}
                    onClick={() => {
                      command.action();
                      onClose();
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-left text-sm",
                      index === selectedIndex ? "bg-zed-element text-zed-text" : "text-zed-text-muted"
                    )}
                  >
                    <Icon size={14} />
                    <span className="flex-1">{command.title}</span>
                    {command.shortcut && (
                      <span className="text-xs opacity-50">{command.shortcut}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-zed-border-alt px-4 py-2 flex items-center gap-2">
          <span className="text-xs text-zed-text-muted">Navigate</span>
          <kbd className="rounded bg-zed-element px-1 text-xs">↑</kbd>
          <kbd className="rounded bg-zed-element px-1 text-xs">↓</kbd>
          <span className="text-xs text-zed-text-muted">to navigate</span>
          <span className="text-xs text-zed-text-muted mx-2">·</span>
          <span className="text-xs text-zed-text-muted">Enter</span>
          <span className="text-xs text-zed-text-muted">to select</span>
        </div>
      </div>
    </div>
  );
});
