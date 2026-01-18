import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ExternalLink,
  Trash2,
  Power,
  Download,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { Plugin, PluginToolDefinition, PluginInstrumentDefinition } from '@/types/ipc';

interface IDEApi {
  pluginList: () => Promise<Plugin[]>;
  pluginGet: (id: string) => Promise<Plugin>;
  pluginActivate: (id: string) => Promise<{ success: boolean; pluginId: string }>;
  pluginDeactivate: (id: string) => Promise<{ success: boolean; pluginId: string }>;
  pluginInstall: (manifestUrl: string) => Promise<{ success: boolean; pluginId: string }>;
  pluginUninstall: (id: string) => Promise<{ success: boolean; pluginId: string }>;
  pluginGetHooks: () => Promise<string[]>;
  pluginGetTools: () => Promise<PluginToolDefinition[]>;
  pluginGetInstruments: () => Promise<PluginInstrumentDefinition[]>;
  pluginGetActivePlugins: () => Promise<Plugin[]>;
}

declare global {
  interface Window {
    ide: IDEApi;
  }
}

export const PluginSettings = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [installUrl, setInstallUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'installed' | 'browse' | 'hooks'>('installed');
  const [hooks, setHooks] = useState<string[]>([]);
  const [tools, setTools] = useState<PluginToolDefinition[]>([]);
  const [instruments, setInstruments] = useState<PluginInstrumentDefinition[]>([]);

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const pluginList = await window.ide.pluginList();
      setPlugins(pluginList);
      setError(null);
    } catch (err) {
      setError('Failed to load plugins');
      console.error('Failed to load plugins:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHooks = async () => {
    try {
      const hookList = await window.ide.pluginGetHooks();
      setHooks(hookList);
    } catch (err) {
      console.error('Failed to load hooks:', err);
    }
  };

  const loadTools = async () => {
    try {
      const toolList = await window.ide.pluginGetTools();
      setTools(toolList);
    } catch (err) {
      console.error('Failed to load tools:', err);
    }
  };

  const loadInstruments = async () => {
    try {
      const instrumentList = await window.ide.pluginGetInstruments();
      setInstruments(instrumentList);
    } catch (err) {
      console.error('Failed to load instruments:', err);
    }
  };

  useEffect(() => {
    loadPlugins();
    loadHooks();
    loadTools();
    loadInstruments();
  }, []);

  const togglePlugin = async (pluginId: string) => {
    try {
      const plugin = plugins.find(p => p.id === pluginId);
      if (!plugin) return;

      if (plugin.enabled) {
        await window.ide.pluginDeactivate(pluginId);
      } else {
        await window.ide.pluginActivate(pluginId);
      }
      await loadPlugins();
      setSuccess(`Plugin ${plugin.enabled ? 'deactivated' : 'activated'} successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to toggle plugin');
      console.error('Failed to toggle plugin:', err);
      setTimeout(() => setError(null), 3000);
    }
  };

  const removePlugin = async (pluginId: string) => {
    if (!confirm('Are you sure you want to uninstall this plugin?')) return;

    try {
      await window.ide.pluginUninstall(pluginId);
      await loadPlugins();
      setSuccess('Plugin uninstalled successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to uninstall plugin');
      console.error('Failed to uninstall plugin:', err);
      setTimeout(() => setError(null), 3000);
    }
  };

  const installPlugin = async () => {
    if (!installUrl.trim()) return;

    try {
      setInstalling(true);
      setError(null);
      await window.ide.pluginInstall(installUrl);
      setInstallUrl('');
      await loadPlugins();
      setSuccess('Plugin installed successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to install plugin. Check the manifest URL.');
      console.error('Failed to install plugin:', err);
      setTimeout(() => setError(null), 3000);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-900/50 bg-red-900/10 p-3 text-red-400">
          <XCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-md border border-green-900/50 bg-green-900/10 p-3 text-green-400">
          <CheckCircle size={16} />
          <span className="text-sm">{success}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-zed-text">Plugin System</h3>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadPlugins}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open('https://autocode.ai/plugins', '_blank')}
          >
            <ExternalLink size={14} />
            Browse Marketplace
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-zed-border-alt">
        <button
          onClick={() => setActiveTab('installed')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'installed'
              ? 'border-b-2 border-zed-accent text-zed-text'
              : 'text-zed-text-muted hover:text-zed-text'
          }`}
        >
          Installed Plugins
        </button>
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'browse'
              ? 'border-b-2 border-zed-accent text-zed-text'
              : 'text-zed-text-muted hover:text-zed-text'
          }`}
        >
          Install Plugin
        </button>
        <button
          onClick={() => setActiveTab('hooks')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'hooks'
              ? 'border-b-2 border-zed-accent text-zed-text'
              : 'text-zed-text-muted hover:text-zed-text'
          }`}
        >
          Hooks & Tools
        </button>
      </div>

      {activeTab === 'installed' && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-8 text-center text-sm text-zed-text-muted">
              Loading plugins...
            </div>
          ) : plugins.length === 0 ? (
            <div className="py-8 text-center text-sm text-zed-text-muted">
              No plugins installed
            </div>
          ) : (
            plugins.map(plugin => (
              <div
                key={plugin.id}
                className="flex items-start justify-between rounded-md border border-zed-border-alt bg-zed-element p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zed-text">{plugin.name}</span>
                    <span className="text-xs text-zed-text-muted">v{plugin.version}</span>
                    {plugin.scope === 'workspace' && (
                      <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                        Workspace
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-zed-text-muted">{plugin.description}</p>
                  {plugin.manifest?.author && (
                    <p className="mt-1 text-xs text-zed-text-muted">by {plugin.manifest.author}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePlugin(plugin.id)}
                    className={`rounded p-1.5 ${
                      plugin.enabled
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-zed-panel text-zed-text-muted hover:text-zed-text'
                    }`}
                    title={plugin.enabled ? 'Disable' : 'Enable'}
                  >
                    <Power size={16} />
                  </button>
                  <button
                    onClick={() => removePlugin(plugin.id)}
                    className="rounded p-1.5 text-zed-text-muted hover:text-red-400"
                    title="Uninstall"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'browse' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zed-text">
              Install Plugin from Manifest URL
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="https://example.com/plugin/agentzero.json"
                value={installUrl}
                onChange={(e) => setInstallUrl(e.target.value)}
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && installPlugin()}
              />
              <Button
                onClick={installPlugin}
                disabled={installing || !installUrl.trim()}
              >
                {installing ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Install
              </Button>
            </div>
            <p className="text-xs text-zed-text-muted">
              Enter a URL to an AgentZero plugin manifest (agentzero.json) file.
            </p>
          </div>

          <hr className="border-zed-border-alt" />

          <div className="space-y-3">
            <h4 className="font-medium text-zed-text">Quick Install Examples</h4>
            <div className="space-y-2">
              <button
                onClick={() => setInstallUrl('https://github.com/example/plugin1/raw/main/agentzero.json')}
                className="w-full rounded-md border border-zed-border-alt bg-zed-element p-3 text-left text-sm hover:border-zed-accent"
              >
                <div className="font-medium text-zed-text">Example Plugin 1</div>
                <div className="text-zed-text-muted">Sample plugin for demonstration</div>
              </button>
              <button
                onClick={() => setInstallUrl('https://github.com/example/plugin2/raw/main/agentzero.json')}
                className="w-full rounded-md border border-zed-border-alt bg-zed-element p-3 text-left text-sm hover:border-zed-accent"
              >
                <div className="font-medium text-zed-text">Example Plugin 2</div>
                <div className="text-zed-text-muted">Another sample plugin</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hooks' && (
        <div className="space-y-6">
          <div>
            <h4 className="mb-3 font-medium text-zed-text">Available Hook Points</h4>
            <div className="grid grid-cols-2 gap-2">
              {hooks.map(hook => (
                <div
                  key={hook}
                  className="rounded border border-zed-border-alt bg-zed-element px-3 py-2 text-sm text-zed-text"
                >
                  {hook}
                </div>
              ))}
            </div>
          </div>

          {tools.length > 0 && (
            <div>
              <h4 className="mb-3 font-medium text-zed-text">
                Custom Tools ({tools.length})
              </h4>
              <div className="space-y-2">
                {tools.map(tool => (
                  <div
                    key={tool.id}
                    className="flex items-start justify-between rounded border border-zed-border-alt bg-zed-element p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-zed-text">{tool.name}</div>
                      {tool.description && (
                        <div className="mt-1 text-sm text-zed-text-muted">
                          {tool.description}
                        </div>
                      )}
                    </div>
                    <Settings size={14} className="text-zed-text-muted" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {instruments.length > 0 && (
            <div>
              <h4 className="mb-3 font-medium text-zed-text">
                Custom Instruments ({instruments.length})
              </h4>
              <div className="space-y-2">
                {instruments.map(instrument => (
                  <div
                    key={instrument.id}
                    className="flex items-start justify-between rounded border border-zed-border-alt bg-zed-element p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-zed-text">{instrument.name}</div>
                      {instrument.description && (
                        <div className="mt-1 text-sm text-zed-text-muted">
                          {instrument.description}
                        </div>
                      )}
                    </div>
                    <Settings size={14} className="text-zed-text-muted" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tools.length === 0 && instruments.length === 0 && (
            <div className="py-8 text-center text-sm text-zed-text-muted">
              No custom tools or instruments registered yet. Install plugins to add them.
            </div>
          )}
        </div>
      )}

      <hr className="border-zed-border-alt" />

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle size={14} />
          <span className="text-sm font-medium">Security Notice</span>
        </div>
        <p className="text-sm text-zed-text-muted">
          Plugins can read and modify your workspace files. Only install plugins from sources you trust.
          Review the plugin manifest and code before installing.
        </p>
      </div>
    </div>
  );
};