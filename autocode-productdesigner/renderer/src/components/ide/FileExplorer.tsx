import { useEffect, useState, useCallback, useRef } from "react";
import type { FileEntry } from "@/types/ipc";
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  FileCode,
  Database,
  Image,
  GitBranch,
  Settings,
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
  Copy,
  FolderOpen,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { NewFileDialog } from "./NewFileDialog";
import { NewFolderDialog } from "./NewFolderDialog";
import { RenameDialog } from "./RenameDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

type FileExplorerProps = {
  workspace: string | null;
  onOpenFile: (file: FileEntry) => void;
  readOnly?: boolean;
};

type NodeProps = {
  entry: FileEntry;
  depth: number;
  onOpenFile: (file: FileEntry) => void;
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
  onContextMenu: (event: React.MouseEvent, entry: FileEntry) => void;
  refreshKey: number;
  readOnly?: boolean;
};

const getFileIcon = (filename: string) => {
  const ext = filename.includes(".")
    ? filename.substring(filename.lastIndexOf(".")).toLowerCase()
    : "";
  const icons: Record<string, React.ReactNode> = {
    ".js": <FileCode size={16} className="text-yellow-400" />,
    ".ts": <FileCode size={16} className="text-blue-400" />,
    ".tsx": <FileCode size={16} className="text-blue-400" />,
    ".jsx": <FileCode size={16} className="text-yellow-400" />,
    ".py": <FileCode size={16} className="text-green-400" />,
    ".rs": <FileCode size={16} className="text-orange-400" />,
    ".go": <FileCode size={16} className="text-cyan-400" />,
    ".html": <FileCode size={16} className="text-orange-400" />,
    ".css": <FileCode size={16} className="text-blue-400" />,
    ".json": <FileCode size={16} className="text-yellow-400" />,
    ".md": <FileText size={16} className="text-green-400" />,
    ".sql": <Database size={16} className="text-purple-400" />,
    ".yaml": <FileCode size={16} className="text-red-400" />,
    ".yml": <FileCode size={16} className="text-red-400" />,
    ".png": <Image size={16} className="text-pink-400" />,
    ".jpg": <Image size={16} className="text-pink-400" />,
    ".svg": <Image size={16} className="text-pink-400" />,
    ".gitignore": <GitBranch size={16} className="text-gray-400" />,
    ".env": <Settings size={16} className="text-yellow-400" />
  };
  return icons[ext] || <FileText size={16} className="text-gray-400" />;
};

const FileNode = ({ entry, depth, onOpenFile, selectedPath, onSelect, onContextMenu, refreshKey, readOnly = false }: NodeProps) => {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const childrenRef = useRef<FileEntry[]>([]);

  const loadChildren = async () => {
    setLoading(true);
    try {
      const items = await window.ide.listDir(entry.relativePath || ".");
      const sorted = items.sort((a, b) => a.name.localeCompare(b.name));
      childrenRef.current = sorted;
      setChildren(sorted);
    } catch (error) {
      showToast(`Failed to load ${entry.name}`, "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entry.type === "directory" && expanded) {
      loadChildren();
    }
  }, [entry.type, expanded, refreshKey]);

  useEffect(() => {
    if (entry.type === "directory" && expanded) {
      setChildren(childrenRef.current);
    }
  }, [entry.type, expanded]);

  const toggle = async () => {
    if (entry.type === "file") {
      onSelect(entry.path);
      onOpenFile(entry);
      return;
    }

    if (!expanded) {
      if (children.length === 0) {
        await loadChildren();
      }
    }
    setExpanded(!expanded);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(entry.path);
    toggle();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.type === "file") {
      onOpenFile(entry);
    } else {
      setExpanded(!expanded);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(entry.path);
    onContextMenu(e, entry);
  };

  const isSelected = selectedPath === entry.path;

  return (
    <div className="ml-0">
      <button
        type="button"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors ${
          isSelected
            ? "bg-zed-selection text-zed-text"
            : "text-zed-text hover:bg-zed-element-hover"
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {entry.type === "directory" ? (
          expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
        ) : (
          <span className="w-3.5" />
        )}
        {entry.type === "directory" ? (
          expanded ? (
            <FolderOpen size={16} className={isSelected ? "text-zed-text" : "text-zed-folder"} />
          ) : (
            <Folder size={16} className={isSelected ? "text-zed-text" : "text-zed-folder"} />
          )
        ) : (
          getFileIcon(entry.name)
        )}
        <span className="truncate">{entry.name}</span>
      </button>

      {expanded && entry.type === "directory" && (
        <div className="ml-2 border-l border-zed-border-alt">
          {loading && <div className="px-4 py-1 text-[11px] text-zed-text-muted">Loading...</div>}
          {children.map((child) => (
            <FileNode
              key={`${child.path}-${refreshKey}`}
              entry={child}
              depth={depth + 1}
              onOpenFile={onOpenFile}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              refreshKey={refreshKey}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileExplorer = ({ workspace, onOpenFile, readOnly = false }: FileExplorerProps) => {
  const [rootEntries, setRootEntries] = useState<FileEntry[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    entry: FileEntry | null;
  } | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newFileDialog, setNewFileDialog] = useState(false);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [renameDialog, setRenameDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const loadRoot = useCallback(async () => {
    if (!workspace) {
      setRootEntries([]);
      return;
    }
    try {
      const items = await window.ide.listDir(".");
      setRootEntries(items.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      showToast("Failed to load workspace", "error");
      console.error(error);
    }
  }, [workspace, showToast]);

  useEffect(() => {
    loadRoot();
  }, [loadRoot]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
      if (event.key === "F2" && selectedPath) {
        event.preventDefault();
        setRenameDialog(true);
      }
      if (event.key === "Delete" && selectedPath) {
        event.preventDefault();
        handleDelete();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n" && !event.shiftKey) {
        event.preventDefault();
        const entry = findEntryByPath(selectedPath);
        setNewFileDialog(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setNewFolderDialog(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && selectedPath) {
        const entry = findEntryByPath(selectedPath);
        if (entry) {
          event.preventDefault();
          navigator.clipboard.writeText(entry.relativePath);
          showToast("Path copied to clipboard", "success");
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "c" && selectedPath) {
        const entry = findEntryByPath(selectedPath);
        if (entry) {
          event.preventDefault();
          navigator.clipboard.writeText(entry.relativePath);
          showToast("Relative path copied to clipboard", "success");
        }
      }
    };

    window.addEventListener("click", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPath, showToast]);

  const findEntryByPath = (path: string | null): FileEntry | null => {
    if (!path) return null;
    const search = (entries: FileEntry[]): FileEntry | null => {
      for (const entry of entries) {
        if (entry.path === path) return entry;
      }
      return null;
    };
    return search(rootEntries);
  };

  const handleContextMenu = (event: React.MouseEvent, entry: FileEntry | null) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      entry
    });
  };

  const handleNewFile = async (name: string) => {
    const entry = contextMenu?.entry;
    const parentPath = entry?.type === "directory" ? entry.relativePath : ".";
    const fullPath = parentPath === "." ? name : `${parentPath}/${name}`;

    try {
      await window.ide.createFile({ path: fullPath });
      showToast(`Created file: ${fullPath}`, "success");
      setRefreshKey(k => k + 1);
      loadRoot();
    } catch (error) {
      showToast(`Failed to create file: ${fullPath}`, "error");
      console.error(error);
    }
  };

  const handleNewFolder = async (name: string) => {
    const entry = contextMenu?.entry;
    const parentPath = entry?.type === "directory" ? entry.relativePath : ".";
    const fullPath = parentPath === "." ? name : `${parentPath}/${name}`;

    try {
      await window.ide.createDir({ path: fullPath });
      showToast(`Created folder: ${fullPath}`, "success");
      setRefreshKey(k => k + 1);
      loadRoot();
    } catch (error) {
      showToast(`Failed to create folder: ${fullPath}`, "error");
      console.error(error);
    }
  };

  const handleRename = async (newName: string) => {
    if (!selectedPath) return;
    const entry = findEntryByPath(selectedPath);
    if (!entry) return;

    const parentPath = entry.relativePath.substring(0, entry.relativePath.lastIndexOf("/"));
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    try {
      await window.ide.renamePath({ sourcePath: entry.relativePath, targetPath: newPath });
      showToast(`Renamed to: ${newName}`, "success");
      setRefreshKey(k => k + 1);
      loadRoot();
    } catch (error) {
      showToast(`Failed to rename: ${entry.name}`, "error");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!selectedPath) return;
    const entry = findEntryByPath(selectedPath);
    if (!entry) return;

    try {
      await window.ide.deletePath({ path: entry.relativePath });
      showToast(`Deleted: ${entry.name}`, "success");
      setSelectedPath(null);
      setRefreshKey(k => k + 1);
      loadRoot();
    } catch (error) {
      showToast(`Failed to delete: ${entry.name}`, "error");
      console.error(error);
    }
  };

  const handleReveal = async () => {
    if (!selectedPath) return;
    const entry = findEntryByPath(selectedPath);
    if (!entry) return;

    try {
      const result = await window.ide.revealPath(entry.relativePath);
      if (!result?.success) {
        showToast("Could not reveal file in explorer", "error");
      }
    } catch (error) {
      showToast("Failed to reveal file", "error");
      console.error(error);
    }
  };

  const handleCopyPath = () => {
    if (!selectedPath) return;
    const entry = findEntryByPath(selectedPath);
    if (!entry) return;

    navigator.clipboard.writeText(entry.relativePath);
    showToast("Path copied to clipboard", "success");
    setContextMenu(null);
  };

  const handleCopyRelativePath = () => {
    if (!selectedPath) return;
    const entry = findEntryByPath(selectedPath);
    if (!entry) return;

    navigator.clipboard.writeText(entry.relativePath);
    showToast("Relative path copied to clipboard", "success");
    setContextMenu(null);
  };

  const handleOpenWithDefault = () => {
    if (!selectedPath) return;
    const entry = findEntryByPath(selectedPath);
    if (!entry) return;

    window.open(`file://${entry.path}`, "_blank");
    setContextMenu(null);
  };

  const contextMenuEntry = contextMenu?.entry;
  const isRootContext = !contextMenuEntry;
  const canRename = contextMenuEntry !== null;
  const canDelete = contextMenuEntry !== null;
  const canReveal = contextMenuEntry !== null;

  return (
    <div className="flex h-full flex-col gap-3" onContextMenu={(e) => handleContextMenu(e, null)}>
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="text-[11px] uppercase tracking-wide text-zed-text-muted">Explorer</div>
        <div className="flex items-center gap-1">
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => setNewFileDialog(true)}
                className="rounded p-1 text-zed-text-muted hover:bg-zed-element-hover hover:text-zed-text"
                title="New File (Ctrl+N)"
              >
                <FilePlus size={14} />
              </button>
              <button
                type="button"
                onClick={() => setNewFolderDialog(true)}
                className="rounded p-1 text-zed-text-muted hover:bg-zed-element-hover hover:text-zed-text"
                title="New Folder (Ctrl+Shift+N)"
              >
                <FolderPlus size={14} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => { setRefreshKey(k => k + 1); loadRoot(); }}
            className="rounded p-1 text-zed-text-muted hover:bg-zed-element-hover hover:text-zed-text"
            title="Refresh"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-1 pb-3">
        {rootEntries.map((entry) => (
          <FileNode
            key={`${entry.path}-${refreshKey}`}
            entry={entry}
            depth={0}
            onOpenFile={onOpenFile}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            onContextMenu={handleContextMenu}
            refreshKey={refreshKey}
            readOnly={readOnly}
          />
        ))}
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 w-48 rounded-md border border-zed-border bg-zed-panel py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            onClick={() => { setNewFileDialog(true); setContextMenu(null); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zed-text hover:bg-zed-element-hover"
          >
            <FilePlus size={14} /> New File
          </button>
          <button
            type="button"
            onClick={() => { setNewFolderDialog(true); setContextMenu(null); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zed-text hover:bg-zed-element-hover"
          >
            <FolderPlus size={14} /> New Folder
          </button>
          <div className="my-1 border-t border-zed-border-alt" />
          {canRename && (
            <button
              type="button"
              onClick={() => { setRenameDialog(true); setContextMenu(null); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zed-text hover:bg-zed-element-hover"
            >
              <Pencil size={14} /> Rename
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => { handleDelete(); setContextMenu(null); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zed-text hover:bg-zed-element-hover"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
          <div className="my-1 border-t border-zed-border-alt" />
          {canReveal && (
            <button
              type="button"
              onClick={() => { handleReveal(); setContextMenu(null); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zed-text hover:bg-zed-element-hover"
            >
              <FolderOpen size={14} /> Reveal in Explorer
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyPath}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zed-text hover:bg-zed-element-hover"
          >
            <Copy size={14} /> Copy Path
          </button>
          <button
            type="button"
            onClick={handleCopyRelativePath}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zed-text hover:bg-zed-element-hover"
          >
            <Copy size={14} /> Copy Relative Path
          </button>
          <div className="my-1 border-t border-zed-border-alt" />
          {canReveal && (
            <button
              type="button"
              onClick={handleOpenWithDefault}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zed-text hover:bg-zed-element-hover"
            >
              <ExternalLink size={14} /> Open with Default Editor
            </button>
          )}
        </div>
      )}

      <NewFileDialog
        open={newFileDialog}
        onClose={() => setNewFileDialog(false)}
        onCreate={handleNewFile}
        defaultPath={contextMenuEntry?.type === "directory" ? contextMenuEntry.relativePath : "."}
      />
      <NewFolderDialog
        open={newFolderDialog}
        onClose={() => setNewFolderDialog(false)}
        onCreate={handleNewFolder}
        defaultPath={contextMenuEntry?.type === "directory" ? contextMenuEntry.relativePath : "."}
      />
      {selectedPath && contextMenuEntry && (
        <RenameDialog
          open={renameDialog}
          onClose={() => setRenameDialog(false)}
          onRename={handleRename}
          entryName={contextMenuEntry.name}
          isDirectory={contextMenuEntry.type === "directory"}
        />
      )}
      {selectedPath && contextMenuEntry && (
        <DeleteConfirmDialog
          open={deleteDialog}
          onClose={() => setDeleteDialog(false)}
          onConfirm={handleDelete}
          entryName={contextMenuEntry.name}
          path={contextMenuEntry.relativePath}
          isDirectory={contextMenuEntry.type === "directory"}
        />
      )}
    </div>
  );
};
