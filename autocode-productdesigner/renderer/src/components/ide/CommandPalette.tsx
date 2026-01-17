import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  FilePlus,
  FolderPlus,
  Save,
  SaveAll,
  X,
  Undo,
  Redo,
  PanelLeft,
  Terminal,
  GitBranch,
  GitCommit,
  HelpCircle,
  ChevronRight,
  ArrowRight,
  FileText,
  Folder,
  FolderOpen,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type Command = {
  id: string;
  title: string;
  category: "file" | "edit" | "view" | "git" | "help";
  action: () => void;
  shortcut?: string;
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

const categories = {
  file: { label: "File", icon: FileText },
  edit: { label: "Edit", icon: FileText },
  view: { label: "View", icon: PanelLeft },
  git: { label: "Git", icon: GitBranch },
  help: { label: "Help", icon: HelpCircle },
} as const;

export const CommandPalette = ({ isOpen, onClose, commands }: CommandPaletteProps) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<Command["category"] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredCommands = commands.filter((cmd) => {
    const matchesQuery =
      query === "" ||
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.id.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !activeCategory || cmd.category === activeCategory;
    return matchesQuery && matchesCategory;
  });

  const groupedCommands = filteredCommands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) {
        acc[cmd.category] = [];
      }
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<Command["category"], Command[]>
  );

  const flatResults = Object.entries(groupedCommands).flatMap(([category, cmds]) => cmds);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatResults[selectedIndex]) {
        flatResults[selectedIndex].action();
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const categoriesList = Object.keys(categories) as Command["category"][];
      const currentCatIndex = activeCategory
        ? categoriesList.indexOf(activeCategory)
        : -1;
      if (e.shiftKey) {
        const prevIndex =
          currentCatIndex <= 0 ? categoriesList.length - 1 : currentCatIndex - 1;
        setActiveCategory(categoriesList[prevIndex]);
        setSelectedIndex(0);
      } else {
        const nextIndex = currentCatIndex >= categoriesList.length - 1 ? 0 : currentCatIndex + 1;
        setActiveCategory(categoriesList[nextIndex]);
        setSelectedIndex(0);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setSelectedIndex(0);
      setActiveCategory(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  useEffect(() => {
    if (listRef.current && flatResults.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, flatResults.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-20">
      <div className="w-full max-w-xl overflow-hidden rounded-lg border border-zed-border bg-zed-panel shadow-2xl">
        <div className="flex items-center border-b border-zed-border px-4 py-3">
          <Search size={16} className="mr-3 text-zed-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-sm text-zed-text placeholder:text-zed-text-muted focus:outline-none"
          />
          <kbd className="rounded bg-zed-element px-2 py-0.5 text-xs text-zed-text-muted">ESC</kbd>
        </div>
        <div className="flex border-b border-zed-border-alt">
          {(Object.keys(categories) as Command["category"][]).map((cat) => {
            const catInfo = categories[cat];
            const CatIcon = catInfo.icon;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(activeCategory === cat ? null : cat);
                  setSelectedIndex(0);
                }}
                className={`flex items-center gap-1 px-3 py-2 text-xs transition-colors ${
                  activeCategory === cat
                    ? "bg-zed-element text-zed-text"
                    : "text-zed-text-muted hover:bg-zed-element-hover"
                }`}
              >
                <CatIcon size={12} />
                {catInfo.label}
              </button>
            );
          })}
        </div>
        <div className="max-h-80 overflow-auto" ref={listRef}>
          {flatResults.length === 0 ? (
            <div className="p-4 text-center text-sm text-zed-text-muted">
              {query ? "No commands found" : "Type to search commands..."}
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => {
              const catInfo = categories[category as Command["category"]];
              const CatIcon = catInfo.icon;
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 bg-zed-surface px-4 py-1.5 text-[10px] uppercase tracking-wide text-zed-text-muted">
                    <CatIcon size={10} />
                    {catInfo.label}
                  </div>
                  {cmds.map((cmd, idx) => {
                    const flatIndex = flatResults.indexOf(cmd);
                    const isSelected = flatIndex === selectedIndex;
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        className={`flex w-full items-center justify-between gap-4 px-4 py-2 text-left text-sm ${
                          isSelected ? "bg-zed-element" : ""
                        }`}
                      >
                        <span className="text-zed-text">{cmd.title}</span>
                        {cmd.shortcut && (
                          <kbd className="rounded bg-zed-element px-1.5 py-0.5 text-xs text-zed-text-muted">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between border-t border-zed-border px-4 py-2 text-xs text-zed-text-muted">
          <div className="flex gap-4">
            <span>
              <kbd className="rounded bg-zed-element px-1">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="rounded bg-zed-element px-1">↵</kbd> Execute
            </span>
            <span>
              <kbd className="rounded bg-zed-element px-1">TAB</kbd> Switch category
            </span>
            <span>
              <kbd className="rounded bg-zed-element px-1">ESC</kbd> Close
            </span>
          </div>
          <span>{flatResults.length} commands</span>
        </div>
      </div>
    </div>
  );
};
