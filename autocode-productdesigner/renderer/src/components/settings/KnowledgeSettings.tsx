import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { Database, Search, Plus, Trash2, RefreshCw, FileText, Folder, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { MemoryItem, MemoryArea, KnowledgeImportResult } from '@/types/ipc';

export const KnowledgeSettings = () => {
  const { settings, updateSettings } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<MemoryArea | ''>('');
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [stats, setStats] = useState<Record<MemoryArea, number>>({
    MAIN: 0,
    FRAGMENTS: 0,
    SOLUTIONS: 0,
    INSTRUMENTS: 0,
    KNOWLEDGE: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<KnowledgeImportResult | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemoryArea, setNewMemoryArea] = useState<MemoryArea>('MAIN');
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<MemoryItem[]>([]);

  const MEMORY_AREAS: MemoryArea[] = ['MAIN', 'FRAGMENTS', 'SOLUTIONS', 'INSTRUMENTS', 'KNOWLEDGE'];

  useEffect(() => {
    loadMemories();
    loadStats();
  }, [selectedArea]);

  const loadMemories = async () => {
    try {
      setIsLoading(true);
      const response = await (window as any).ide.memoryList(selectedArea || undefined);
      setMemories(response || []);
      setSearchResults(response || []);
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await (window as any).ide.memoryStats();
      if (response) {
        setStats(response);
      }
    } catch (error) {
      console.error('Failed to load memory stats:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(memories);
      return;
    }

    try {
      setIsLoading(true);
      const response = await (window as any).ide.memorySearch({
        query: searchQuery,
        limit: 50,
        threshold: 0.05,
        area: selectedArea || undefined
      });
      setSearchResults(response || []);
    } catch (error) {
      console.error('Failed to search memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults(memories);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handlePreload = async () => {
    try {
      setIsLoading(true);
      setImportResult(null);
      const result = await (window as any).ide.memoryPreload();
      setImportResult(result);
      await loadMemories();
      await loadStats();
    } catch (error) {
      console.error('Failed to preload knowledge:', error);
      setImportResult({ imported: 0, skipped: 0, errors: [{ path: 'error', error: String(error) }] });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMemory = async () => {
    if (!newMemoryText.trim()) return;

    try {
      await (window as any).ide.memoryInsert({
        texts: [newMemoryText],
        metadata: { area: newMemoryArea }
      });
      setNewMemoryText('');
      setShowAddDialog(false);
      await loadMemories();
      await loadStats();
    } catch (error) {
      console.error('Failed to add memory:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMemories.size === 0) return;

    try {
      await (window as any).ide.memoryDelete({ ids: Array.from(selectedMemories) });
      setSelectedMemories(new Set());
      await loadMemories();
      await loadStats();
    } catch (error) {
      console.error('Failed to delete memories:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedMemories.size === searchResults.length) {
      setSelectedMemories(new Set());
    } else {
      setSelectedMemories(new Set(searchResults.map(m => m.id)));
    }
  };

  const toggleMemorySelection = (id: string) => {
    const newSelection = new Set(selectedMemories);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedMemories(newSelection);
  };

  const getAreaColor = (area: MemoryArea) => {
    const colors = {
      MAIN: 'text-blue-400',
      FRAGMENTS: 'text-green-400',
      SOLUTIONS: 'text-purple-400',
      INSTRUMENTS: 'text-orange-400',
      KNOWLEDGE: 'text-cyan-400'
    };
    return colors[area];
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Knowledge Import</h3>
        <div className="space-y-4">
          <div className="rounded-md bg-zed-element p-4">
            <div className="mb-3 flex items-center gap-2 text-sm text-zed-text-muted">
              <Folder size={14} />
              Place knowledge files in <code className="rounded bg-zed-panel px-1.5 py-0.5 text-xs">.knowledge/</code> directory
            </div>
            <div className="mb-3 text-xs text-zed-text-muted">
              Supported formats: .txt, .md, .pdf, .csv, .json, .html
            </div>
            <Button
              onClick={handlePreload}
              disabled={isLoading}
              className="flex items-center gap-2"
              variant="secondary"
            >
              {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
              Import Knowledge
            </Button>
          </div>

          {importResult && (
            <div className="rounded-md bg-zed-element p-4">
              <div className="mb-2 text-sm font-medium text-zed-text">Import Results</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-400">{importResult.imported}</div>
                  <div className="text-xs text-zed-text-muted">Imported</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{importResult.skipped}</div>
                  <div className="text-xs text-zed-text-muted">Skipped</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">{importResult.errors.length}</div>
                  <div className="text-xs text-zed-text-muted">Errors</div>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-3 space-y-1">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-400">
                      {error.path}: {error.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <hr className="border-zed-border-alt" />

      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Memory Stats</h3>
        <div className="grid grid-cols-5 gap-3">
          {MEMORY_AREAS.map(area => (
            <div key={area} className="rounded-md bg-zed-element p-3 text-center">
              <div className="text-xl font-bold">{stats[area]}</div>
              <div className={`text-xs ${getAreaColor(area)}`}>{area}</div>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-zed-border-alt" />

      <div>
        <h3 className="mb-4 text-lg font-medium text-zed-text">Memory Browser</h3>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="text-xs text-zed-text-muted">Search</Label>
              </div>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories..."
                className="w-full"
              />
            </div>
            <div className="w-40">
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="text-xs text-zed-text-muted">Area</Label>
              </div>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value as MemoryArea | '')}
                className="w-full rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
              >
                <option value="">All Areas</option>
                {MEMORY_AREAS.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSelectAll}
                variant="secondary"
                size="sm"
                className="text-xs"
              >
                {selectedMemories.size === searchResults.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                onClick={handleDeleteSelected}
                disabled={selectedMemories.size === 0 || isLoading}
                variant="destructive"
                size="sm"
                className="text-xs"
              >
                <Trash2 size={12} className="mr-1" />
                Delete ({selectedMemories.size})
              </Button>
            </div>
            <Button
              onClick={() => setShowAddDialog(true)}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              <Plus size={12} className="mr-1" />
              Add Memory
            </Button>
          </div>

          <div className="max-h-96 overflow-auto rounded-md border border-zed-border">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-zed-text-muted">
                <RefreshCw size={16} className="mr-2 animate-spin" />
                Loading...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-sm text-zed-text-muted">
                <FileText size={24} className="mb-2 opacity-50" />
                No memories found
              </div>
            ) : (
              <div className="divide-y divide-zed-border">
                {searchResults.map((memory) => (
                  <div
                    key={memory.id}
                    className="flex items-start gap-3 p-3 hover:bg-zed-element"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemories.has(memory.id)}
                      onChange={() => toggleMemorySelection(memory.id)}
                      className="mt-1 h-4 w-4 cursor-pointer rounded border-zed-border bg-zed-element"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <span className={`text-xs font-medium ${getAreaColor(memory.area)}`}>
                          {memory.area}
                        </span>
                        <span className="text-xs text-zed-text-muted">
                          {new Date(memory.created_at).toLocaleString()}
                        </span>
                        {memory.score !== undefined && (
                          <span className="text-xs text-zed-text-muted">
                            Score: {memory.score.toFixed(3)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-zed-text line-clamp-3">
                        {memory.text}
                      </div>
                      {memory.metadata && Object.keys(memory.metadata).length > 0 && (
                        <div className="mt-1 text-xs text-zed-text-muted">
                          {Object.entries(memory.metadata)
                            .filter(([key]) => key !== 'area')
                            .map(([key, value]) => (
                              <span key={key} className="mr-2">
                                {key}: {String(value).slice(0, 20)}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-md bg-zed-panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-zed-text">Add Memory</h3>
              <button
                onClick={() => setShowAddDialog(false)}
                className="text-zed-text-muted hover:text-zed-text"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs text-zed-text-muted">Memory Area</Label>
                <select
                  value={newMemoryArea}
                  onChange={(e) => setNewMemoryArea(e.target.value as MemoryArea)}
                  className="w-full rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
                >
                  {MEMORY_AREAS.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-zed-text-muted">Content</Label>
                <textarea
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  placeholder="Enter memory content..."
                  rows={6}
                  className="w-full rounded-md border border-zed-border bg-zed-element px-3 py-2 text-sm text-zed-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setShowAddDialog(false)}
                  variant="secondary"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddMemory}
                  disabled={!newMemoryText.trim()}
                  size="sm"
                >
                  Add Memory
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
