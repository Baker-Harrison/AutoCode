import { memo, useCallback, useEffect, useState } from "react";
import type { FileEntry } from "@autocode/types";
import { Search, File, Folder, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface QuickOpenPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (entry: FileEntry) => void;
  workspace: string | null;
}

export const QuickOpenPanel = memo(function QuickOpenPanel({
  isOpen,
  onClose,
  onFileSelect,
  workspace
}: QuickOpenPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FileEntry[]>([]);
  const [allFiles, setAllFiles] = useState<FileEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useCallback((node: HTMLInputElement | null) => {
    if (node && isOpen) {
      node.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && workspace) {
      const loadFiles = async () => {
        const entries = await window.ide.listDir(".");
        setAllFiles(entries.filter(e => e.type === "file"));
      };
      loadFiles();
    }
  }, [isOpen, workspace]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(allFiles.slice(0, 10));
    } else {
      const lowerQuery = query.toLowerCase();
      const filtered = allFiles.filter(f =>
        f.name.toLowerCase().includes(lowerQuery) ||
        f.relativePath.toLowerCase().includes(lowerQuery)
      );
      setResults(filtered.slice(0, 10));
    }
    setSelectedIndex(0);
  }, [query, allFiles]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          onFileSelect(results[selectedIndex]);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onFileSelect, results, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]">
      <div className="w-full max-w-xl rounded-lg border border-zed-border bg-zed-panel shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 border-b border-zed-border-alt px-4 py-3">
          <Search size={16} className="text-zed-text-muted" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files..."
            className="flex-1 border-0 bg-transparent p-0 text-sm text-zed-text placeholder:text-zed-text-muted focus-visible:outline-none"
          />
          <span className="text-xs text-zed-text-muted">Ctrl+P</span>
        </div>

        <div className="max-h-[400px] overflow-auto">
          {results.length === 0 ? (
            <div className="p-4 text-center text-xs text-zed-text-muted">
              No files found
            </div>
          ) : (
            <div className="py-2">
              {results.map((entry, index) => (
                <button
                  key={entry.path}
                  onClick={() => {
                    onFileSelect(entry);
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2 text-left text-sm",
                    index === selectedIndex ? "bg-zed-element text-zed-text" : "text-zed-text-muted"
                  )}
                >
                  <File size={14} />
                  <span className="flex-1 truncate">{entry.name}</span>
                  <span className="text-xs opacity-50">{entry.relativePath}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-zed-border-alt px-4 py-2 text-xs text-zed-text-muted">
          {results.length} file(s)
        </div>
      </div>
    </div>
  );
});
