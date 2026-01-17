import { useState, useEffect, useRef, useCallback } from "react";
import { Search, FileText, ChevronRight, Folder } from "lucide-react";
import type { FileEntry } from "@/types/ipc";

type QuickOpenProps = {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (entry: FileEntry) => void;
  workspace: string | null;
};

export const QuickOpenPanel = ({ isOpen, onClose, onFileSelect, workspace }: QuickOpenProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FileEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const searchFiles = useCallback(async (searchQuery: string) => {
    if (!searchQuery || !workspace) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const searchResults = await window.ide.search(searchQuery);
      const entries: FileEntry[] = searchResults.map((result) => ({
        name: result.relativePath.split(/[\\/]/).pop() || result.relativePath,
        path: result.path,
        relativePath: result.relativePath,
        type: "file" as const,
      }));
      setResults(entries.slice(0, 20));
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchFiles(query);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, searchFiles]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setSelectedIndex(0);
      setResults([]);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      onFileSelect(results[selectedIndex]);
      onClose();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  useEffect(() => {
    if (listRef.current && results.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, results.length]);

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
            placeholder="Search files..."
            className="flex-1 bg-transparent text-sm text-zed-text placeholder:text-zed-text-muted focus:outline-none"
          />
          <kbd className="rounded bg-zed-element px-2 py-0.5 text-xs text-zed-text-muted">ESC</kbd>
        </div>
        <div className="max-h-96 overflow-auto" ref={listRef}>
          {loading ? (
            <div className="p-4 text-center text-sm text-zed-text-muted">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-zed-text-muted">
              {query ? "No results found" : "Type to search..."}
            </div>
          ) : (
            results.map((file, index) => (
              <button
                key={file.path}
                onClick={() => {
                  onFileSelect(file);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${
                  index === selectedIndex ? "bg-zed-element" : ""
                }`}
              >
                <FileText size={16} className="text-zed-text-muted" />
                <div className="flex-1 truncate">
                  <div className="text-zed-text">{file.name}</div>
                  <div className="text-xs text-zed-text-muted">{file.relativePath}</div>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-zed-border px-4 py-2 text-xs text-zed-text-muted">
          <div className="flex gap-4">
            <span>
              <kbd className="rounded bg-zed-element px-1">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="rounded bg-zed-element px-1">↵</kbd> Open
            </span>
            <span>
              <kbd className="rounded bg-zed-element px-1">ESC</kbd> Close
            </span>
          </div>
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
};
