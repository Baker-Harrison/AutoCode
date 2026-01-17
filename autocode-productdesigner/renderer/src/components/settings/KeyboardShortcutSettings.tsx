import { useState } from 'react';
import { keyboardShortcuts } from '@/types/settings';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RotateCcw, Search } from 'lucide-react';

export const KeyboardShortcutSettings = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShortcuts = keyboardShortcuts.filter(
    shortcut =>
      shortcut.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.shortcut.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-zed-text">Keyboard Shortcuts</h3>
        <Button variant="secondary" size="sm">
          <RotateCcw size={14} />
          Reset to Defaults
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zed-text-muted" size={14} />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search shortcuts..."
          className="pl-9"
        />
      </div>

      <div className="space-y-1">
        {filteredShortcuts.length === 0 ? (
          <div className="py-8 text-center text-sm text-zed-text-muted">
            No shortcuts found
          </div>
        ) : (
          filteredShortcuts.map(shortcut => (
            <div
              key={shortcut.id}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-zed-element"
            >
              <div>
                <div className="text-zed-text">{shortcut.name}</div>
                <div className="text-xs text-zed-text-muted">{shortcut.description}</div>
              </div>
              <kbd className="rounded bg-zed-element px-2 py-1 font-mono text-xs text-zed-text-muted border border-zed-border-alt">
                {shortcut.shortcut}
              </kbd>
            </div>
          ))
        )}
      </div>

      <div className="rounded-md border border-zed-border-alt bg-zed-element p-4">
        <h4 className="mb-2 text-sm font-medium text-zed-text">Tip</h4>
        <p className="text-sm text-zed-text-muted">
          Press <kbd className="rounded bg-zed-panel px-1.5 py-0.5 font-mono text-xs border border-zed-border">Ctrl+Shift+P</kbd> to open the command palette where you can search for commands and see their shortcuts.
        </p>
      </div>
    </div>
  );
};
