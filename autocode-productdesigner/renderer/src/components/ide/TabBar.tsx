import { useState, useCallback, useRef, useEffect } from "react";
import type { Tab } from "@/types/ipc";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TabBarProps = {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onSaveTab: (tabId: string) => void;
  onSaveAll: () => void;
  onReorderTabs: (tabs: Tab[]) => void;
  readOnly?: boolean;
};

type ContextMenuState = {
  x: number;
  y: number;
  tabId: string | null;
} | null;

type SortableTabProps = {
  tab: Tab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  readOnly?: boolean;
};

const SortableTab = ({ tab, isActive, onSelect, onClose, onMouseDown, readOnly = false }: SortableTabProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getFileIcon = (fileName: string): string => {
    if (fileName.endsWith(".ts") || fileName.endsWith(".tsx")) return "TS";
    if (fileName.endsWith(".js") || fileName.endsWith(".jsx")) return "JS";
    if (fileName.endsWith(".json")) return "JSON";
    if (fileName.endsWith(".html")) return "HTML";
    if (fileName.endsWith(".css")) return "CSS";
    if (fileName.endsWith(".py")) return "PY";
    if (fileName.endsWith(".md")) return "MD";
    return "FILE";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex min-w-0 items-center gap-1.5 border-r border-zed-border-alt px-3 py-1.5 text-[12px] select-none cursor-pointer transition-colors ${
        isActive
          ? "bg-zed-bg text-zed-text"
          : "text-zed-text-muted hover:bg-zed-element-hover hover:text-zed-text"
      }`}
      onClick={onSelect}
      onMouseDown={onMouseDown}
      onContextMenu={(e) => {
        e.preventDefault();
        // Handle right-click in parent
      }}
    >
      {isActive && <span className="absolute left-0 top-0 h-full w-0.5 bg-zed-accent" />}
      <span className="text-[10px] text-zed-text-muted font-medium">{getFileIcon(tab.file.name)}</span>
      <span className={`truncate max-w-32 ${tab.isDirty ? "italic text-amber-300" : ""}`}>
        {tab.file.name}
      </span>
      {!readOnly && (
        <button
          className={`ml-0.5 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-zed-element-active transition-all ${
            isActive ? "opacity-100" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
};

export const TabBar = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onSaveTab,
  onSaveAll,
  onReorderTabs,
  readOnly = false,
}: TabBarProps) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [overflowMenuX, setOverflowMenuX] = useState(0);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [showOverflow, setShowOverflow] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (tabBarRef.current) {
      const container = tabBarRef.current;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      setShowOverflow(scrollWidth > clientWidth);
    }
  }, [tabs]);

  const handleContextMenu = useCallback((event: React.MouseEvent, tabId: string) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, tabId });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        closeContextMenu();
      }
    };
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenu, closeContextMenu]);

  const handleMenuAction = useCallback((action: () => void) => {
    action();
    closeContextMenu();
  }, [closeContextMenu]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = tabs.findIndex((t) => t.id === active.id);
        const newIndex = tabs.findIndex((t) => t.id === over.id);
        const newTabs = arrayMove(tabs, oldIndex, newIndex);
        onReorderTabs(newTabs);
      }
    },
    [tabs, onReorderTabs]
  );

  const handleMiddleClick = useCallback(
    (tabId: string, e: React.MouseEvent) => {
      if (e.button === 1) {
        e.stopPropagation();
        onCloseTab(tabId);
      }
    },
    [onCloseTab]
  );

  const handleOverflowClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = tabBarRef.current?.getBoundingClientRect();
    if (rect) {
      setOverflowMenuX(rect.right - 160);
      setOverflowMenuOpen(true);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setOverflowMenuOpen(false);
    if (overflowMenuOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [overflowMenuOpen]);

  const dirtyCount = tabs.filter((t) => t.isDirty).length;

  if (tabs.length === 0) {
    return (
      <div className="flex items-center gap-1 border-b border-zed-border bg-zed-surface/95 px-4 py-2 text-[12px] text-zed-text-muted h-9">
        No files open
      </div>
    );
  }

  const visibleTabs = showOverflow ? tabs.slice(0, -1) : tabs;
  const hiddenTabs = showOverflow ? tabs.slice(-1) : [];

  return (
    <>
      <div
        ref={tabBarRef}
        className="flex items-center gap-0 border-b border-zed-border bg-zed-surface/95 overflow-x-auto scrollbar-thin scrollbar-thumb-zed-scrollbar-thumb scrollbar-track-transparent h-9"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex min-w-0 items-center gap-0">
              {visibleTabs.map((tab) => (
                <div
                  key={tab.id}
                  onMouseDown={(e) => handleMiddleClick(tab.id, e)}
                  onContextMenu={(e) => handleContextMenu(e, tab.id)}
                  className="drag-handle"
                  style={{ cursor: "grab" }}
                >
                  <SortableTab
                    tab={tab}
                    isActive={activeTabId === tab.id}
                    onSelect={() => onSelectTab(tab.id)}
                    onClose={() => onCloseTab(tab.id)}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {showOverflow && (
          <div className="relative">
            <button
              className="flex min-w-0 items-center gap-1.5 border-r border-zed-border-alt px-3 py-1.5 text-xs text-zed-text-muted hover:bg-zed-element-hover"
              onClick={handleOverflowClick}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <circle cx="3.5" cy="4.5" r="1.5" />
                <circle cx="10.5" cy="4.5" r="1.5" />
                <circle cx="3.5" cy="9.5" r="1.5" />
                <circle cx="10.5" cy="9.5" r="1.5" />
              </svg>
              <span>{tabs.length - 1} more</span>
            </button>

            {overflowMenuOpen && (
              <div
                className="fixed z-50 bg-zed-panel border border-zed-border rounded-md shadow-lg py-1 text-xs mt-1"
                style={{ left: overflowMenuX, top: 40 }}
              >
                <div className="px-4 py-1 text-zed-text-muted uppercase text-[10px] tracking-wide border-b border-zed-border-alt">
                  Open Tabs ({tabs.length})
                </div>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`block w-full text-left px-4 py-1.5 text-zed-text hover:bg-zed-element-hover ${
                      activeTabId === tab.id ? "bg-zed-element" : ""
                    }`}
                    onClick={() => {
                      onSelectTab(tab.id);
                      setOverflowMenuOpen(false);
                    }}
                  >
                    <span className={`${tab.isDirty ? "text-amber-300" : ""}`}>{tab.file.name}</span>
                  </button>
                ))}
                <div className="border-t border-zed-border-alt my-1" />
                <button
                  className="block w-full text-left px-4 py-1.5 text-zed-text hover:bg-zed-element-hover"
                  onClick={() => {
                    [...tabs].reverse().forEach((t) => onCloseTab(t.id));
                    setOverflowMenuOpen(false);
                  }}
                >
                  Close All
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto pr-2">
          {!readOnly && dirtyCount > 0 && (
            <button
              className="text-[10px] text-zed-text-muted hover:text-zed-text px-2 py-1 rounded hover:bg-zed-element-hover transition-colors"
              onClick={onSaveAll}
              title="Save All (Ctrl+Alt+S)"
            >
              Save All ({dirtyCount})
            </button>
          )}
        </div>
      </div>

      {contextMenu && contextMenu.tabId && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-zed-panel border border-zed-border rounded-md shadow-lg py-1 text-xs"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="block w-full text-left px-4 py-1.5 text-zed-text hover:bg-zed-element-hover"
            onClick={() => handleMenuAction(() => onSaveTab(contextMenu.tabId!))}
          >
            Save
          </button>
          <button
            className="block w-full text-left px-4 py-1.5 text-zed-text hover:bg-zed-element-hover"
            onClick={() => handleMenuAction(onSaveAll)}
          >
            Save All
          </button>
          <div className="border-t border-zed-border-alt my-1" />
          <button
            className="block w-full text-left px-4 py-1.5 text-zed-text hover:bg-zed-element-hover"
            onClick={() => handleMenuAction(() => onCloseTab(contextMenu.tabId!))}
          >
            Close
          </button>
          <button
            className="block w-full text-left px-4 py-1.5 text-zed-text hover:bg-zed-element-hover"
            onClick={() =>
              handleMenuAction(() => tabs.filter((t) => t.id !== contextMenu.tabId).forEach((t) => onCloseTab(t.id)))
            }
          >
            Close Others
          </button>
          <button
            className="block w-full text-left px-4 py-1.5 text-zed-text hover:bg-zed-element-hover"
            onClick={() => handleMenuAction(() => [...tabs].reverse().forEach((t) => onCloseTab(t.id)))}
          >
            Close All
          </button>
        </div>
      )}
    </>
  );
};
