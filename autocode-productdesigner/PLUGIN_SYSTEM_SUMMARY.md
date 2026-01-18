# Plugin System Implementation Summary

## Overview
Implemented a comprehensive extension hooks and plugin system inspired by AgentZero architecture. The system provides hook points for various agent lifecycle events, a hook registry, plugin discovery, lifecycle management, tool/instrument registration, and a basic plugin marketplace UI.

## Files Modified

### 1. `autocode-productdesigner/electron/services/pluginSystem.js` (NEW)
Created the core plugin system service with the following features:

**Hook Points (22 total ordered hooks):**
- agent_init
- workspace_init
- before_main_llm_call
- system_prompt
- message_loop_start
- message_loop_prompts_before
- message_loop_prompts_after
- message_loop_end
- monologue_start
- monologue_end
- reasoning_stream
- response_stream
- tool_execute
- tool_complete
- tool_error
- before_workspace_change
- after_workspace_change
- before_git_operation
- after_git_operation
- approval_requested
- approval_granted
- approval_denied
- escalation_requested

**Hook Registry:**
- `registerHook(hookName, handler, priority)` - Register hook with priority
- `unregisterHook(hookName, hookId)` - Unregister a hook
- `executeHook(hookName, context)` - Execute hooks asynchronously in order
- `executeHookSync(hookName, context)` - Execute hooks synchronously

**Plugin System:**
- `scanPluginDirectories()` - Scan global, team, and project plugin directories
- `loadPlugin(pluginPath, manifest)` - Load plugin from manifest
- `activatePlugin(pluginId)` - Activate plugin and call its activate() function
- `deactivatePlugin(pluginId)` - Deactivate plugin and call cleanup

**Plugin Discovery:**
- Global hooks in `~/.autocode/plugins/`
- Team-specific hooks in `.ai/agents/{team}/extensions/`
- Project hooks in `.ai/projects/{workspace}/extensions/`

**Tool & Instrument Registration:**
- `registerTool(toolId, toolConfig)` - Register custom tools via plugins
- `registerInstrument(instrumentId, instrumentConfig)` - Register reusable procedures
- `getTool(toolId)` / `getAllTools()` - Query registered tools
- `getInstrument(instrumentId)` / `getAllInstruments()` - Query registered instruments

**Plugin Lifecycle:**
- `installPlugin(manifestUrl)` - Install plugin from manifest URL
- `uninstallPlugin(pluginId)` - Remove plugin
- `updatePlugin(pluginId)` - Update plugin (placeholder)
- `validateManifest(manifest)` - Validate plugin manifest

### 2. `autocode-productdesigner/electron/preload.js` (MODIFIED)
Added plugin API exposure to renderer process:

```javascript
pluginList: () => ipcRenderer.invoke("plugin:list"),
pluginGet: (pluginId) => ipcRenderer.invoke("plugin:get", pluginId),
pluginActivate: (pluginId) => ipcRenderer.invoke("plugin:activate", pluginId),
pluginDeactivate: (pluginId) => ipcRenderer.invoke("plugin:deactivate", pluginId),
pluginInstall: (manifestUrl) => ipcRenderer.invoke("plugin:install", manifestUrl),
pluginUninstall: (pluginId) => ipcRenderer.invoke("plugin:uninstall", pluginId),
pluginUpdate: (pluginId) => ipcRenderer.invoke("plugin:update", pluginId),
pluginGetHooks: () => ipcRenderer.invoke("plugin:get-hooks"),
pluginGetTools: () => ipcRenderer.invoke("plugin:get-tools"),
pluginGetInstruments: () => ipcRenderer.invoke("plugin:get-instruments"),
pluginGetActivePlugins: () => ipcRenderer.invoke("plugin:get-active")
```

### 3. `autocode-productdesigner/electron/main.js` (MODIFIED)
Added plugin system initialization and IPC handlers:

**Initialization:**
```javascript
const { createPluginSystem, getPluginSystem } = require("./services/pluginSystem");
```

**Workspace Setup:**
```javascript
const pluginSystem = createPluginSystem();
pluginSystem.setWorkspace(workspacePath);
```

**IPC Handlers:**
- `plugin:list` - List all installed plugins
- `plugin:get` - Get plugin details by ID
- `plugin:activate` - Activate a plugin
- `plugin:deactivate` - Deactivate a plugin
- `plugin:install` - Install from manifest URL
- `plugin:uninstall` - Uninstall a plugin
- `plugin:update` - Update a plugin
- `plugin:get-hooks` - Get list of available hook points
- `plugin:get-tools` - Get registered custom tools
- `plugin:get-instruments` - Get registered instruments
- `plugin:get-active` - Get active plugins

### 4. `autocode-productdesigner/renderer/src/types/ipc.ts` (MODIFIED)
Added TypeScript types for plugin system:

```typescript
export type Plugin = {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  scope: "user" | "workspace";
  manifest?: PluginManifest;
};

export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  main?: string;
  contributes?: {
    hooks?: PluginHook[];
    tools?: PluginTool[];
    instruments?: PluginInstrument[];
  };
  permissions?: string[];
  dependencies?: Record<string, string>;
  engines?: {
    node?: string;
    autocode?: string;
  };
  files?: PluginFile[];
};

export type PluginToolDefinition = {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  permissions: string[];
};

export type PluginInstrumentDefinition = {
  id: string;
  name: string;
  description: string;
  procedure: string;
  parameters: Record<string, unknown>;
};
```

### 5. `autocode-productdesigner/renderer/src/types/ide.d.ts` (MODIFIED)
Added plugin API methods to IDE interface:

```typescript
pluginList: () => Promise<Plugin[]>;
pluginGet: (pluginId: string) => Promise<Plugin>;
pluginActivate: (pluginId: string) => Promise<{ success: boolean; pluginId: string }>;
pluginDeactivate: (pluginId: string) => Promise<{ success: boolean; pluginId: string }>;
pluginInstall: (manifestUrl: string) => Promise<{ success: boolean; pluginId: string }>;
pluginUninstall: (pluginId: string) => Promise<{ success: boolean; pluginId: string }>;
pluginUpdate: (pluginId: string) => Promise<{ success: boolean; pluginId: string }>;
pluginGetHooks: () => Promise<string[]>;
pluginGetTools: () => Promise<PluginToolDefinition[]>;
pluginGetInstruments: () => Promise<PluginInstrumentDefinition[]>;
pluginGetActivePlugins: () => Promise<Plugin[]>;
```

### 6. `autocode-productdesigner/renderer/src/components/settings/PluginSettings.tsx` (NEW)
Created complete UI for plugin management with:

**Three Tabs:**
1. **Installed Plugins** - List, enable/disable, uninstall plugins
2. **Install Plugin** - Install from manifest URL with examples
3. **Hooks & Tools** - View available hooks, custom tools, instruments

**Features:**
- Refresh plugin list
- Browse marketplace (link)
- Toggle plugin enable/disable
- Uninstall plugins
- Install from manifest URL
- View available hook points
- View custom tools and instruments
- Error and success notifications
- Security notice about plugin permissions

### 7. `autocode-productdesigner/renderer/src/components/settings/index.ts` (MODIFIED)
Added export:
```typescript
export { PluginSettings } from './PluginSettings';
```

### 8. `autocode-productdesigner/renderer/src/components/settings/SettingsPanel.tsx` (MODIFIED)
Added Plugin tab to settings navigation:
- Import PluginSettings component
- Add "Plugins" category with Plug icon
- Render PluginSettings when plugins tab selected

### 9. `autocode-productdesigner/examples/sample-plugin/` (NEW)
Created sample plugin demonstrating the system:

**Files:**
- `agentzero.json` - Plugin manifest with hooks, tools, instruments
- `index.js` - Plugin main file with activate/deactivate
- `README.md` - Documentation

**Sample Plugin Features:**
- Hooks into agent_init and message_loop_start
- Provides "Say Hello" custom tool
- Provides "Greeting" reusable instrument

## Plugin Manifest Schema (agentzero.json)

```json
{
  "id": "plugin-id",
  "name": "Plugin Name",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": "Author Name",
  "main": "index.js",
  "engines": {
    "autocode": ">=1.0.0"
  },
  "permissions": ["fs:read", "hooks:register"],
  "contributes": {
    "hooks": [
      { "name": "hook_name", "priority": 50 }
    ],
    "tools": [
      {
        "id": "tool-id",
        "name": "Tool Name",
        "description": "Tool description",
        "parameters": { }
      }
    ],
    "instruments": [
      {
        "id": "instrument-id",
        "name": "Instrument Name",
        "description": "Instrument description"
      }
    ]
  }
}
```

## New APIs Added

### Backend (Electron Service)

**HookRegistry:**
- `registerHook(hookName, handler, priority)`
- `unregisterHook(hookName, hookId)`
- `executeHook(hookName, context)`
- `executeHookSync(hookName, context)`

**Plugin System:**
- `scanPluginDirectories()`
- `loadPlugin(pluginPath, manifest)`
- `activatePlugin(pluginId)`
- `deactivatePlugin(pluginId)`
- `installPlugin(manifestUrl)`
- `uninstallPlugin(pluginId)`
- `updatePlugin(pluginId)`
- `validateManifest(manifest)`

**Tool/Instrument Registry:**
- `registerTool(toolId, toolConfig)`
- `registerInstrument(instrumentId, instrumentConfig)`
- `getTool(toolId)`
- `getAllTools()`
- `getInstrument(instrumentId)`
- `getAllInstruments()`

### Frontend (Renderer API)

All available via `window.ide`:
- `pluginList()`
- `pluginGet(pluginId)`
- `pluginActivate(pluginId)`
- `pluginDeactivate(pluginId)`
- `pluginInstall(manifestUrl)`
- `pluginUninstall(pluginId)`
- `pluginUpdate(pluginId)`
- `pluginGetHooks()`
- `pluginGetTools()`
- `pluginGetInstruments()`
- `pluginGetActivePlugins()`

## Plugin Context Object

When a plugin's `activate()` function is called, it receives a context object:

```javascript
{
  registerHook,        // Function to register hooks
  registerTool,        // Function to register custom tools
  registerInstrument,   // Function to register instruments
  pluginId,            // The plugin's ID
  pluginPath           // Path to plugin directory
}
```

## Extension Directory Locations

1. **Global Plugins:** `~/.autocode/plugins/`
2. **Team-specific:** `.ai/agents/{team}/extensions/`
3. **Project-specific:** `.ai/projects/{workspace}/extensions/`

## Security Considerations

- Plugins are sandboxed to Electron main process
- Permissions system in manifest
- Only install from trusted sources
- Plugin code is executed in Node.js context with file system access

## Next Steps

To integrate with the agent system, call hooks at appropriate points in agent execution:

```javascript
const pluginSystem = getPluginSystem();

// Before initializing agent
await pluginSystem.executeHook('agent_init', { agentId, config });

// Before LLM call
const modifiedPrompt = await pluginSystem.executeHook('system_prompt', { prompt });

// After workspace change
await pluginSystem.executeHook('after_workspace_change', { oldPath, newPath });
```