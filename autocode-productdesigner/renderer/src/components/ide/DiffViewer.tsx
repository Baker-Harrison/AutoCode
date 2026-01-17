import { useState, useCallback } from "react";
import type { GitDiff, DiffHunk } from "@/types/ipc";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronDown, ChevronRight, Split, AlignJustify } from "lucide-react";
import { cn } from "@/lib/utils";

type DiffViewerProps = {
  diff: GitDiff;
  filePath: string;
  onStageHunk?: (hunk: DiffHunk, stage: boolean) => void;
  readOnly?: boolean;
};

export function DiffViewer({ diff, filePath, onStageHunk, readOnly = false }: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'inline' | 'split'>('inline');
  const [expandedHunks, setExpandedHunks] = useState<Set<number>>(new Set(diff.hunks.map((_, i) => i)));
  const [copied, setCopied] = useState(false);

  const toggleHunk = useCallback((index: number) => {
    setExpandedHunks(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const copyDiff = useCallback(async () => {
    await navigator.clipboard.writeText(diff.diff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [diff.diff]);

  const toggleExpandAll = useCallback(() => {
    if (expandedHunks.size === diff.hunks.length) {
      setExpandedHunks(new Set());
    } else {
      setExpandedHunks(new Set(diff.hunks.map((_, i) => i)));
    }
  }, [diff.hunks.length, expandedHunks.size]);

  const allExpanded = expandedHunks.size === diff.hunks.length && diff.hunks.length > 0;

  return (
    <div className="border-t border-zed-border-alt">
      <div className="flex items-center justify-between border-b border-zed-border-alt px-3 py-1.5 bg-zed-element">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-zed-text-muted truncate max-w-[200px]">
            {filePath}
          </span>
          <span className="text-[10px] text-zed-text-muted">
            {diff.diffStat}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleExpandAll}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-zed-text-muted hover:text-zed-text hover:bg-zed-element-hover rounded"
          >
            {allExpanded ? "Collapse" : "Expand"} All
          </button>
          <div className="flex items-center rounded-md border border-zed-border bg-zed-bg p-0.5">
            <button
              onClick={() => setViewMode('inline')}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 text-[10px] rounded",
                viewMode === 'inline' ? "bg-zed-element text-zed-text" : "text-zed-text-muted"
              )}
              title="Inline view"
            >
              <AlignJustify size={12} />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 text-[10px] rounded",
                viewMode === 'split' ? "bg-zed-element text-zed-text" : "text-zed-text-muted"
              )}
              title="Split view"
            >
              <Split size={12} />
            </button>
          </div>
          <button
            onClick={copyDiff}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-zed-text-muted hover:text-zed-text hover:bg-zed-element-hover rounded"
            title="Copy diff"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>
      <div className="overflow-auto max-h-80 font-mono text-xs">
        {viewMode === 'inline' ? (
          <InlineDiffView
            diff={diff}
            expandedHunks={expandedHunks}
            onToggleHunk={toggleHunk}
            onStageHunk={onStageHunk}
            readOnly={readOnly}
          />
        ) : (
          <SplitDiffView
            diff={diff}
            expandedHunks={expandedHunks}
            onToggleHunk={toggleHunk}
            onStageHunk={onStageHunk}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
}

function InlineDiffView({ diff, expandedHunks, onToggleHunk, onStageHunk, readOnly }: {
  diff: GitDiff;
  expandedHunks: Set<number>;
  onToggleHunk: (index: number) => void;
  onStageHunk?: (hunk: DiffHunk, stage: boolean) => void;
  readOnly: boolean;
}) {
  return (
    <div>
      {diff.hunks.map((hunk, hunkIndex) => {
        const isExpanded = expandedHunks.has(hunkIndex);
        return (
          <div key={hunkIndex} className="border-b border-zed-border-alt/50 last:border-0">
            <button
              onClick={() => onToggleHunk(hunkIndex)}
              className="flex w-full items-center gap-2 bg-zed-element px-3 py-1 text-[10px] text-zed-text-muted hover:bg-zed-element-hover"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>@@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@</span>
            </button>
            {isExpanded && (
              <div>
                {hunk.lines.map((line, index) => {
                  const isAddition = line.startsWith('+') && !line.startsWith('+++');
                  const isDeletion = line.startsWith('-') && !line.startsWith('---');
                  const isHunkHeader = line.startsWith('@@');
                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start px-3 py-0.5",
                        isAddition && "bg-green-900/20",
                        isDeletion && "bg-red-900/20",
                        !isAddition && !isDeletion && "text-zed-text-muted"
                      )}
                    >
                      <span className="mr-4 inline-block w-6 select-none text-right text-[10px] opacity-50">
                        {isAddition ? hunk.newStart + index :
                         isDeletion ? hunk.oldStart + index :
                         isHunkHeader ? '' : hunk.oldStart + Math.floor(index/2)}
                      </span>
                      <span className={cn(
                        "mr-2 flex-shrink-0",
                        isAddition ? "text-green-400" : isDeletion ? "text-red-400" : "text-zed-text-muted"
                      )}>
                        {line.substring(0, 1)}
                      </span>
                      <span className={cn(
                        "flex-1",
                        isAddition ? "text-green-300" : isDeletion ? "text-red-300" : ""
                      )}>
                        {line.substring(1)}
                      </span>
                    </div>
                  );
                })}
                {!readOnly && onStageHunk && (
                  <div className="flex items-center gap-2 px-3 py-1.5 border-t border-zed-border-alt/50">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onStageHunk(hunk, true)}
                      className="h-6 px-2 text-[10px]"
                    >
                      Stage this chunk
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onStageHunk(hunk, false)}
                      className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300"
                    >
                      Discard this chunk
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SplitDiffView({ diff, expandedHunks, onToggleHunk, onStageHunk, readOnly }: {
  diff: GitDiff;
  expandedHunks: Set<number>;
  onToggleHunk: (index: number) => void;
  onStageHunk?: (hunk: DiffHunk, stage: boolean) => void;
  readOnly: boolean;
}) {
  return (
    <div className="grid grid-cols-2 divide-x divide-zed-border-alt">
      <div className="bg-zed-bg">
        <div className="bg-zed-element px-3 py-1 text-[10px] text-zed-text-muted text-center">
          Original
        </div>
        {diff.hunks.map((hunk, hunkIndex) => {
          const isExpanded = expandedHunks.has(hunkIndex);
          return (
            <div key={hunkIndex}>
              <button
                onClick={() => onToggleHunk(hunkIndex)}
                className="flex w-full items-center gap-2 bg-zed-element px-3 py-1 text-[10px] text-zed-text-muted hover:bg-zed-element-hover"
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span>@@ -{hunk.oldStart},{hunk.oldLines} @@</span>
              </button>
              {isExpanded && (
                <div>
                  {hunk.lines.map((line, index) => {
                    const isDeletion = line.startsWith('-') && !line.startsWith('---');
                    const isHunkHeader = line.startsWith('@@');
                    const isUnchanged = !line.startsWith('+') && !line.startsWith('-');
                    if (line.startsWith('+')) return null;
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-start px-3 py-0.5",
                          isDeletion && "bg-red-900/20",
                          isHunkHeader && "bg-zed-element",
                          isUnchanged && "text-zed-text-muted"
                        )}
                      >
                        <span className="mr-4 inline-block w-6 select-none text-right text-[10px] opacity-50">
                          {isDeletion || isHunkHeader || isUnchanged ? hunk.oldStart + Math.floor(index/2) : ''}
                        </span>
                        <span className={cn(
                          "mr-2 flex-shrink-0",
                          isDeletion ? "text-red-400" : "text-zed-text-muted"
                        )}>
                          {line.substring(0, 1)}
                        </span>
                        <span className={cn(
                          "flex-1",
                          isDeletion ? "text-red-300" : ""
                        )}>
                          {line.substring(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="bg-zed-bg">
        <div className="bg-zed-element px-3 py-1 text-[10px] text-zed-text-muted text-center">
          Modified
        </div>
        {diff.hunks.map((hunk, hunkIndex) => {
          const isExpanded = expandedHunks.has(hunkIndex);
          return (
            <div key={hunkIndex}>
              <button
                onClick={() => onToggleHunk(hunkIndex)}
                className="flex w-full items-center gap-2 bg-zed-element px-3 py-1 text-[10px] text-zed-text-muted hover:bg-zed-element-hover"
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span>@@ +{hunk.newStart},{hunk.newLines} @@</span>
              </button>
              {isExpanded && (
                <div>
                  {hunk.lines.map((line, index) => {
                    const isAddition = line.startsWith('+') && !line.startsWith('+++');
                    const isHunkHeader = line.startsWith('@@');
                    const isUnchanged = !line.startsWith('+') && !line.startsWith('-');
                    if (line.startsWith('-')) return null;
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-start px-3 py-0.5",
                          isAddition && "bg-green-900/20",
                          isHunkHeader && "bg-zed-element",
                          isUnchanged && "text-zed-text-muted"
                        )}
                      >
                        <span className="mr-4 inline-block w-6 select-none text-right text-[10px] opacity-50">
                          {isAddition || isHunkHeader || isUnchanged ? hunk.newStart + Math.floor(index/2) : ''}
                        </span>
                        <span className={cn(
                          "mr-2 flex-shrink-0",
                          isAddition ? "text-green-400" : "text-zed-text-muted"
                        )}>
                          {line.substring(0, 1)}
                        </span>
                        <span className={cn(
                          "flex-1",
                          isAddition ? "text-green-300" : ""
                        )}>
                          {line.substring(1)}
                        </span>
                      </div>
                    );
                  })}
                  {!readOnly && onStageHunk && isExpanded && (
                    <div className="flex items-center gap-2 px-3 py-1.5 border-t border-zed-border-alt/50">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onStageHunk(hunk, true)}
                        className="h-6 px-2 text-[10px]"
                      >
                        Stage
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onStageHunk(hunk, false)}
                        className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300"
                      >
                        Discard
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
