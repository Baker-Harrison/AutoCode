import { memo, useCallback, useEffect, useState } from "react";
import type { FileEntry, SearchResult } from "@autocode/types";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchPanelProps {
  onOpenFile: (entry: FileEntry) => void;
  className?: string;
}

const MAX_QUERY_LENGTH = 200;
const SEARCH_DEBOUNCE_MS = 150;

export const SearchPanel = memo(function SearchPanel({
  onOpenFile,
  className
}: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null)[1];

  const search = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    if (trimmed.length > MAX_QUERY_LENGTH) {
      return;
    }
    setLoading(true);
    try {
      const searchResults = await window.ide.search(trimmed);
      setResults(searchResults);
    } catch (error) {
      console.error("Search failed", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (debounceRef) {
      clearTimeout(debounceRef);
    }
    debounceRef = setTimeout(() => {
      search();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef) {
        clearTimeout(debounceRef);
      }
    };
  }, [query, search, debounceRef]);

  const handleOpenResult = useCallback((result: SearchResult) => {
    const entry: FileEntry = {
      name: result.relativePath.split(/[\\/]/).pop() || result.relativePath,
      path: result.path,
      relativePath: result.relativePath,
      type: "file"
    };
    onOpenFile(entry);
  }, [onOpenFile]);

  return (
    <div className={cn("flex h-full flex-col gap-3 p-3", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zed-text-muted" size={14} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files and content..."
            className="pl-9 h-8"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={search}
          disabled={loading || !query.trim()}
        >
          {loading ? <Loader2 className="animate-spin" size={14} /> : "Search"}
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-auto">
        {results.length === 0 && !loading && query.trim() && (
          <div className="text-xs text-zed-text-muted text-center py-4">
            No results found.
          </div>
        )}
        {!query.trim() && (
          <div className="text-xs text-zed-text-muted text-center py-4">
            Type to search files and content...
          </div>
        )}
        {results.map((result, index) => (
          <button
            key={`${result.path}-${index}`}
            type="button"
            onClick={() => handleOpenResult(result)}
            className="flex w-full flex-col rounded-md border border-zed-border-alt bg-zed-element px-3 py-2 text-left text-xs text-zed-text hover:border-zed-border transition-colors"
          >
            <span className="text-zed-text font-medium">{result.relativePath}</span>
            <span className="text-[11px] text-zed-text-muted mt-1">
              {result.line > 0 ? `Line ${result.line}: ` : ""}{result.preview}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});
