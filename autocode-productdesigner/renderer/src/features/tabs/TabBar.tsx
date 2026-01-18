import { useCallback, memo } from "react";
import type { Tab } from "@autocode/types";
import { X, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onSaveTab: (tabId: string) => void;
  onSaveAll: () => void;
  onReorderTabs: (tabs: Tab[]) => void;
}

export const TabBar = memo(function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onSaveTab,
  onSaveAll,
  onReorderTabs
}: TabBarProps) {
  const handleDragStart = useCallback((e: React.DragEvent, tabId: string) => {
    e.dataTransfer.setData("tabId", tabId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    const draggedTabId = e.dataTransfer.getData("tabId");
    if (draggedTabId === targetTabId) return;

    const draggedIndex = tabs.findIndex(t => t.id === draggedTabId);
    const targetIndex = tabs.findIndex(t => t.id === targetTabId);

    const newTabs = [...tabs];
    const [removed] = newTabs.splice(draggedIndex, 1);
    newTabs.splice(targetIndex, 0, removed);
    onReorderTabs(newTabs);
  }, [tabs, onReorderTabs]);

  return (
    <div className="flex items-center overflow-x-auto bg-zed-surface border-b border-zed-border max-h-[33px]">
      <div className="flex items-center">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, tab.id)}
            onClick={() => onSelectTab(tab.id)}
            className={cn(
              "group flex items-center gap-2 border-r border-zed-border-alt px-3 py-1.5 text-xs cursor-pointer max-w-[180px] min-w-[100px]",
              activeTabId === tab.id
                ? "bg-zed-bg text-zed-text border-t-2 border-t-zed-accent"
                : "text-zed-text-muted hover:bg-zed-element-hover"
            )}
          >
            <FileText size={12} />
            <span className="truncate flex-1">{tab.file.name}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {tab.isDirty && (
                <span className="text-amber-400">●</span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="rounded p-0.5 hover:bg-zed-element text-zed-text-muted hover:text-zed-text"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {tabs.some(t => t.isDirty) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSaveAll}
          className="ml-auto mr-2 h-6 px-2 text-xs"
        >
          <Save size={12} className="mr-1" />
          Save All
        </Button>
      )}
    </div>
  );
});
