import { useState, useEffect, useCallback, useRef } from "react";
import { X, ArrowDown, ArrowUp, Replace, ReplaceAll, CaseSensitive, WholeWord, Regex } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FindOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
}

export interface FindReplacePanelProps {
  onFind: (query: string, options: FindOptions) => void;
  onFindNext: () => void;
  onFindPrev: () => void;
  onReplace: (query: string, replacement: string, all: boolean) => void;
  onClose: () => void;
  matchCount?: number;
  currentMatch?: number;
  replaceMode?: boolean;
  focusFind?: boolean;
}

export function FindReplacePanel({
  onFind,
  onFindNext,
  onFindPrev,
  onReplace,
  onClose,
  matchCount = 0,
  currentMatch = 0,
  replaceMode = false,
  focusFind = false,
}: FindReplacePanelProps) {
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regex, setRegex] = useState(false);
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusFind && findInputRef.current) {
      findInputRef.current.focus();
      findInputRef.current.select();
    }
  }, [focusFind]);

  useEffect(() => {
    if (findQuery) {
      onFind(findQuery, { caseSensitive, wholeWord, regex });
    }
  }, [findQuery, caseSensitive, wholeWord, regex, onFind]);

  const handleFindNext = useCallback(() => {
    if (findQuery) {
      onFindNext();
    }
  }, [findQuery, onFindNext]);

  const handleFindPrev = useCallback(() => {
    if (findQuery) {
      onFindPrev();
    }
  }, [findQuery, onFindPrev]);

  const handleReplace = useCallback(() => {
    if (findQuery) {
      onReplace(findQuery, replaceQuery, false);
    }
  }, [findQuery, replaceQuery, onReplace]);

  const handleReplaceAll = useCallback(() => {
    if (findQuery) {
      onReplace(findQuery, replaceQuery, true);
    }
  }, [findQuery, replaceQuery, onReplace]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "Enter") {
        if (event.shiftKey) {
          event.preventDefault();
          handleFindPrev();
        } else if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          if (event.altKey) {
            event.preventDefault();
            handleReplaceAll();
          } else {
            event.preventDefault();
            handleReplace();
          }
        } else {
          event.preventDefault();
          handleFindNext();
        }
      } else if (event.key === "F3") {
        event.preventDefault();
        if (event.shiftKey) {
          handleFindPrev();
        } else {
          handleFindNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFindNext, handleFindPrev, handleReplace, handleReplaceAll, onClose]);

  const matchLabel = matchCount > 0 ? `${currentMatch > 0 ? currentMatch : ""} of ${matchCount} matches` : `${matchCount} matches`;

  return (
    <div className="flex flex-col border-t border-zed-border bg-zed-panel p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              ref={findInputRef}
              type="text"
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              placeholder="Find"
              className="h-8 w-64 rounded-md border border-zed-border bg-zed-element px-3 py-1 text-xs text-zed-text placeholder:text-zed-text-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
            />
            {matchCount > 0 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zed-text-muted">
                {matchLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleFindPrev}
              disabled={!findQuery}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-zed-border bg-zed-element text-zed-text hover:bg-zed-element-hover disabled:opacity-50"
              title="Find Previous (Shift+F3 or Shift+Enter)"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              onClick={handleFindNext}
              disabled={!findQuery}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-zed-border bg-zed-element text-zed-text hover:bg-zed-element-hover disabled:opacity-50"
              title="Find Next (F3 or Enter)"
            >
              <ArrowDown size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2 border-l border-zed-border pl-2">
            <button
              type="button"
              onClick={() => setRegex(!regex)}
              className={cn(
                "flex h-8 items-center gap-1 rounded-md px-2 text-xs transition-colors",
                regex
                  ? "bg-zed-accent text-zed-text"
                  : "text-zed-text-muted hover:text-zed-text"
              )}
              title="Regex (.*)"
            >
              <Regex size={12} />
            </button>
            <button
              type="button"
              onClick={() => setWholeWord(!wholeWord)}
              className={cn(
                "flex h-8 items-center gap-1 rounded-md px-2 text-xs transition-colors",
                wholeWord
                  ? "bg-zed-accent text-zed-text"
                  : "text-zed-text-muted hover:text-zed-text"
              )}
              title="Whole Word"
              style={{ fontWeight: wholeWord ? 600 : 400 }}
            >
              <WholeWord size={12} />
            </button>
            <button
              type="button"
              onClick={() => setCaseSensitive(!caseSensitive)}
              className={cn(
                "flex h-8 items-center gap-1 rounded-md px-2 text-xs transition-colors",
                caseSensitive
                  ? "bg-zed-accent text-zed-text"
                  : "text-zed-text-muted hover:text-zed-text"
              )}
              title="Case Sensitive"
              style={{ fontWeight: caseSensitive ? 600 : 400 }}
            >
              <CaseSensitive size={12} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {replaceMode && (
            <>
              <div className="relative">
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Replace"
                  className="h-8 w-48 rounded-md border border-zed-border bg-zed-element px-3 py-1 text-xs text-zed-text placeholder:text-zed-text-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleReplace}
                disabled={!findQuery}
                className="gap-1"
                title="Replace (Ctrl+Enter)"
              >
                <Replace size={14} />
                Replace
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleReplaceAll}
                disabled={!findQuery}
                className="gap-1"
                title="Replace All (Ctrl+Alt+Enter)"
              >
                <ReplaceAll size={14} />
                All
              </Button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zed-text-muted hover:bg-zed-element-hover hover:text-zed-text"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
