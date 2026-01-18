import { memo, useCallback, useEffect, useState } from "react";
import type { FileEntry } from "@autocode/types";
import { ChevronRight, File, Folder, MoreVertical, Plus, Search, Trash2, Pencil, FolderPlus, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface FileExplorerProps {
  workspace: string;
  onOpenFile: (entry: FileEntry) => void;
  className?: string;
}

interface FileTreeItemProps {
  entry: FileEntry;
  workspace: string;
  depth: number;
  onOpenFile: (entry: FileEntry) => void;
  onRename: (oldPath: string, newPath: string) => void;
  onDelete: (path: string) => void;
  onRefresh: () => void;
}

const FileIcon = ({ entry, className }: { entry: FileEntry; className?: string }) => {
  if (entry.type === "directory") {
    return <Folder className={cn("text-blue-400", className)} size={16} />;
  }
  const ext = entry.name.split(".").pop()?.toLowerCase();
  const colorMap: Record<string, string> = {
    ts: "text-blue-400",
    tsx: "text-blue-400",
    js: "text-yellow-400",
    jsx: "text-yellow-400",
    json: "text-green-400",
    md: "text-gray-400",
    png: "text-purple-400",
    jpg: "text-purple-400",
    svg: "text-purple-400",
  };
  return <File className={cn(colorMap[ext || ""] || "text-gray-400", className)} size={16} />;
};

const FileTreeItem = memo(function FileTreeItem({
  entry,
  workspace,
  depth,
  onOpenFile,
  onRename,
  onDelete,
  onRefresh
}: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(entry.name);
  const inputRef = useCallback((node: HTMLInputElement | null) => {
    if (node && isRenaming) {
      node.focus();
      node.select();
    }
  }, [isRenaming]);
  const { showToast } = useToast();

  useEffect(() => {
    if (entry.type === "directory" && expanded) {
      const loadChildren = async () => {
        setLoading(true);
        try {
          const entries = await window.ide.listDir(entry.relativePath);
          setChildren(entries.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === "directory" ? -1 : 1;
          }));
        } catch (error) {
          console.error("Failed to load directory", error);
        } finally {
          setLoading(false);
        }
      };
      loadChildren();
    }
  }, [entry, expanded]);

  const handleClick = useCallback(() => {
    if (entry.type === "directory") {
      setExpanded(!expanded);
    } else {
      onOpenFile(entry);
    }
  }, [entry, expanded, onOpenFile]);

  const handleRename = useCallback(async () => {
    if (!renameValue.trim() || renameValue === entry.name) {
      setIsRenaming(false);
      return;
    }
    try {
      const oldPath = entry.relativePath;
      const newPath = entry.relativePath.replace(entry.name, renameValue);
      await onRename(oldPath, newPath);
      setIsRenaming(false);
      showToast(`Renamed to ${renameValue}`, "success");
    } catch (error) {
      showToast("Failed to rename", "error");
      console.error(error);
    }
  }, [entry, renameValue, onRename, showToast]);

  const handleDelete = useCallback(async () => {
    if (confirm(`Delete ${entry.name}?`)) {
      try {
        await onDelete(entry.relativePath);
        showToast(`Deleted ${entry.name}`, "success");
      } catch (error) {
        showToast("Failed to delete", "error");
        console.error(error);
      }
    }
  }, [entry, onDelete, showToast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setRenameValue(entry.name);
      setIsRenaming(false);
    }
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-1 py-0.5 pr-2 hover:bg-zed-element-hover cursor-pointer",
          depth > 0 && "ml-4"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {entry.type === "directory" && (
          <ChevronRight
            size={14}
            className={cn(
              "text-zed-text-muted transition-transform",
              expanded && "rotate-90"
            )}
          />
        )}
        {entry.type !== "directory" && <span className="w-4" />}

        <FileIcon entry={entry} />

        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-zed-element border border-zed-border rounded px-1 text-xs text-zed-text"
          />
        ) : (
          <span className="flex-1 truncate text-xs text-zed-text">{entry.name}</span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zed-element rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical size={12} className="text-zed-text-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {entry.type === "file" && (
              <>
                <DropdownMenuItem onClick={() => onOpenFile(entry)}>
                  Open
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-400">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {entry.type === "directory" && expanded && (
        <div>
          {loading ? (
            <div className="py-1 pl-12 text-xs text-zed-text-muted">Loading...</div>
          ) : children.length === 0 ? (
            <div className="py-1 pl-12 text-xs text-zed-text-muted">Empty</div>
          ) : (
            children.map((child) => (
              <FileTreeItem
                key={child.path}
                entry={child}
                workspace={workspace}
                depth={depth + 1}
                onOpenFile={onOpenFile}
                onRename={onRename}
                onDelete={onDelete}
                onRefresh={onRefresh}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
});

export const FileExplorer = memo(function FileExplorer({
  workspace,
  onOpenFile,
  className
}: FileExplorerProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemType, setNewItemType] = useState<"file" | "folder" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const inputRef = useCallback((node: HTMLInputElement | null) => {
    if (node && newItemType) {
      node.focus();
    }
  }, [newItemType]);
  const { showToast } = useToast();

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await window.ide.listDir(".");
      setEntries(entries.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === "directory" ? -1 : 1;
      }));
    } catch (error) {
      console.error("Failed to load directory", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleCreate = useCallback(async () => {
    if (!newItemName.trim()) {
      setNewItemType(null);
      return;
    }
    try {
      if (newItemType === "file") {
        await window.ide.createFile({ path: newItemName, content: "" });
      } else {
        await window.ide.createDir({ path: newItemName });
      }
      setNewItemType(null);
      setNewItemName("");
      showToast(`Created ${newItemName}`, "success");
      loadEntries();
    } catch (error) {
      showToast("Failed to create", "error");
      console.error(error);
    }
  }, [newItemType, newItemName, loadEntries, showToast]);

  const handleRename = useCallback(async (oldPath: string, newPath: string) => {
    const oldName = oldPath.split("/").pop() || "";
    const newName = newPath.split("/").pop() || "";
    await window.ide.renamePath({ sourcePath: oldPath, targetPath: newPath });
    loadEntries();
  }, [loadEntries]);

  const handleDelete = useCallback(async (path: string) => {
    await window.ide.deletePath({ path });
    loadEntries();
  }, [loadEntries]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreate();
    } else if (e.key === "Escape") {
      setNewItemType(null);
      setNewItemName("");
    }
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center justify-between border-b border-zed-border-alt px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-zed-text-muted">Explorer</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setNewItemType("file")}
            className="rounded p-1 text-zed-text-muted hover:bg-zed-element hover:text-zed-text"
            title="New File"
          >
            <FilePlus size={14} />
          </button>
          <button
            onClick={() => setNewItemType("folder")}
            className="rounded p-1 text-zed-text-muted hover:bg-zed-element hover:text-zed-text"
            title="New Folder"
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      {newItemType && (
        <div className="border-b border-zed-border-alt px-3 py-2">
          <Input
            ref={inputRef}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={handleKeyDown}
            placeholder={`New ${newItemType}...`}
            className="h-7 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto py-1">
        {loading ? (
          <div className="px-3 py-2 text-xs text-zed-text-muted">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="px-3 py-2 text-xs text-zed-text-muted">No files</div>
        ) : (
          entries.map((entry) => (
            <FileTreeItem
              key={entry.path}
              entry={entry}
              workspace={workspace}
              depth={0}
              onOpenFile={onOpenFile}
              onRename={handleRename}
              onDelete={handleDelete}
              onRefresh={loadEntries}
            />
          ))
        )}
      </div>
    </div>
  );
});
