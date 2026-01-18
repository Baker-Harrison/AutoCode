const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const HOOK_POINTS = [
  "agent_init",
  "workspace_init",
  "before_main_llm_call",
  "system_prompt",
  "message_loop_start",
  "message_loop_prompts_before",
  "message_loop_prompts_after",
  "message_loop_end",
  "monologue_start",
  "monologue_end",
  "reasoning_stream",
  "response_stream",
  "tool_execute",
  "tool_complete",
  "tool_error",
  "before_workspace_change",
  "after_workspace_change",
  "before_git_operation",
  "after_git_operation",
  "approval_requested",
  "approval_granted",
  "approval_denied",
  "escalation_requested"
];

const EXTENSION_DIRS = [
  ".ai/extensions",
  ".ai/agents/{team}/extensions",
  ".ai/projects/{workspace}/extensions"
];

class PluginSystem {
  constructor() {
    this.hooks = new Map();
    this.plugins = new Map();
    this.instruments = new Map();
    this.customTools = new Map();
    this.pluginPaths = new Map();
    this.activePlugins = new Map();
    this.basePluginDir = path.join(app.getPath("home"), ".autocode", "plugins");
    this.workspacePluginDir = null;
    this.initializeHooks();
    this.ensurePluginDirectories();
  }

  initializeHooks() {
    for (const hook of HOOK_POINTS) {
      this.hooks.set(hook, []);
    }
  }

  ensurePluginDirectories() {
    try {
      if (!fs.existsSync(this.basePluginDir)) {
        fs.mkdirSync(this.basePluginDir, { recursive: true });
      }
    } catch (error) {
      console.error("Failed to create plugin directories:", error);
    }
  }

  setWorkspace(workspacePath) {
    this.workspacePluginDir = workspacePath ? path.join(workspacePath, ".ai", "extensions") : null;
    if (this.workspacePluginDir && !fs.existsSync(this.workspacePluginDir)) {
      try {
        fs.mkdirSync(this.workspacePluginDir, { recursive: true });
      } catch (error) {
        console.error("Failed to create workspace plugin directory:", error);
      }
    }
    this.reloadHooks();
  }

  registerHook(hookName, handler, priority = 50) {
    if (!this.hooks.has(hookName)) {
      throw new Error(`Invalid hook point: ${hookName}`);
    }
    if (typeof handler !== "function") {
      throw new Error("Hook handler must be a function");
    }
    const hook = {
      handler,
      priority,
      id: `${hookName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    this.hooks.get(hookName).push(hook);
    this.sortHooks(hookName);
    return hook.id;
  }

  unregisterHook(hookName, hookId) {
    if (!this.hooks.has(hookName)) {
      return false;
    }
    const hooks = this.hooks.get(hookName);
    const index = hooks.findIndex(h => h.id === hookId);
    if (index !== -1) {
      hooks.splice(index, 1);
      return true;
    }
    return false;
  }

  sortHooks(hookName) {
    const hooks = this.hooks.get(hookName);
    hooks.sort((a, b) => a.priority - b.priority);
  }

  async executeHook(hookName, context = {}) {
    if (!this.hooks.has(hookName)) {
      console.warn(`Unknown hook point: ${hookName}`);
      return context;
    }
    const hooks = this.hooks.get(hookName);
    let result = context;
    for (const hook of hooks) {
      try {
        const hookResult = await hook.handler(result);
        if (hookResult !== undefined) {
          result = hookResult;
        }
      } catch (error) {
        console.error(`Hook error in ${hookName}:`, error);
      }
    }
    return result;
  }

  async executeHookSync(hookName, context = {}) {
    if (!this.hooks.has(hookName)) {
      return context;
    }
    const hooks = this.hooks.get(hookName);
    let result = context;
    for (const hook of hooks) {
      try {
        const hookResult = hook.handler(result);
        if (hookResult !== undefined) {
          result = hookResult;
        }
      } catch (error) {
        console.error(`Hook error in ${hookName}:`, error);
      }
    }
    return result;
  }

  scanPluginDirectories() {
    const plugins = [];
    const scanDir = (dirPath, scope = "user") => {
      if (!dirPath || !fs.existsSync(dirPath)) return [];
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const pluginPath = path.join(dirPath, entry.name);
            const manifestPath = path.join(pluginPath, "agentzero.json");
            if (fs.existsSync(manifestPath)) {
              try {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
                plugins.push({
                  path: pluginPath,
                  manifest,
                  scope
                });
              } catch (error) {
                console.error(`Failed to parse manifest in ${pluginPath}:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Failed to scan plugin directory ${dirPath}:`, error);
      }
      return plugins;
    };
    plugins.push(...scanDir(this.basePluginDir, "user"));
    if (this.workspacePluginDir) {
      plugins.push(...scanDir(this.workspacePluginDir, "workspace"));
    }
    return plugins;
  }

  loadPlugin(pluginPath, manifest) {
    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} is already loaded`);
    }
    const mainPath = path.join(pluginPath, manifest.main || "index.js");
    if (!fs.existsSync(mainPath)) {
      throw new Error(`Plugin main file not found: ${mainPath}`);
    }
    try {
      const pluginModule = require(mainPath);
      const plugin = {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        manifest,
        module: pluginModule,
        path: pluginPath,
        enabled: false,
        hooks: new Map(),
        tools: [],
        instruments: []
      };
      this.plugins.set(manifest.id, plugin);
      this.pluginPaths.set(manifest.id, pluginPath);
      return plugin;
    } catch (error) {
      console.error(`Failed to load plugin ${manifest.id}:`, error);
      throw error;
    }
  }

  async activatePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }
    if (plugin.enabled) {
      return true;
    }
    try {
      if (plugin.module.activate && typeof plugin.module.activate === "function") {
        const context = {
          registerHook: this.registerHook.bind(this),
          registerTool: this.registerTool.bind(this),
          registerInstrument: this.registerInstrument.bind(this),
          pluginId,
          pluginPath: plugin.path
        };
        await plugin.module.activate(context);
      }
      plugin.enabled = true;
      this.activePlugins.set(pluginId, true);
      return true;
    } catch (error) {
      console.error(`Failed to activate plugin ${pluginId}:`, error);
      return false;
    }
  }

  async deactivatePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }
    if (!plugin.enabled) {
      return true;
    }
    try {
      if (plugin.module.deactivate && typeof plugin.module.deactivate === "function") {
        await plugin.module.deactivate();
      }
      for (const [hookName, hookId] of plugin.hooks) {
        this.unregisterHook(hookName, hookId);
      }
      plugin.hooks.clear();
      for (const toolId of plugin.tools) {
        this.customTools.delete(toolId);
      }
      plugin.tools = [];
      for (const instrumentId of plugin.instruments) {
        this.instruments.delete(instrumentId);
      }
      plugin.instruments = [];
      plugin.enabled = false;
      this.activePlugins.delete(pluginId);
      return true;
    } catch (error) {
      console.error(`Failed to deactivate plugin ${pluginId}:`, error);
      return false;
    }
  }

  registerTool(toolId, toolConfig) {
    if (!toolId || typeof toolId !== "string") {
      throw new Error("Tool ID must be a non-empty string");
    }
    if (!toolConfig || typeof toolConfig !== "object") {
      throw new Error("Tool config must be an object");
    }
    if (!toolConfig.name || typeof toolConfig.name !== "string") {
      throw new Error("Tool must have a name");
    }
    if (!toolConfig.execute || typeof toolConfig.execute !== "function") {
      throw new Error("Tool must have an execute function");
    }
    const tool = {
      id: toolId,
      name: toolConfig.name,
      description: toolConfig.description || "",
      execute: toolConfig.execute,
      parameters: toolConfig.parameters || {},
      permissions: toolConfig.permissions || []
    };
    this.customTools.set(toolId, tool);
    return toolId;
  }

  registerInstrument(instrumentId, instrumentConfig) {
    if (!instrumentId || typeof instrumentId !== "string") {
      throw new Error("Instrument ID must be a non-empty string");
    }
    if (!instrumentConfig || typeof instrumentConfig !== "object") {
      throw new Error("Instrument config must be an object");
    }
    if (!instrumentConfig.name || typeof instrumentConfig.name !== "string") {
      throw new Error("Instrument must have a name");
    }
    const instrument = {
      id: instrumentId,
      name: instrumentConfig.name,
      description: instrumentConfig.description || "",
      procedure: instrumentConfig.procedure,
      parameters: instrumentConfig.parameters || {}
    };
    this.instruments.set(instrumentId, instrument);
    return instrumentId;
  }

  getTool(toolId) {
    return this.customTools.get(toolId);
  }

  getAllTools() {
    return Array.from(this.customTools.values());
  }

  getInstrument(instrumentId) {
    return this.instruments.get(instrumentId);
  }

  getAllInstruments() {
    return Array.from(this.instruments.values());
  }

  getPlugin(pluginId) {
    return this.plugins.get(pluginId);
  }

  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  getActivePlugins() {
    return Array.from(this.plugins.values()).filter(p => p.enabled);
  }

  async reloadHooks() {
    this.initializeHooks();
    const discoveredPlugins = this.scanPluginDirectories();
    for (const { path: pluginPath, manifest } of discoveredPlugins) {
      try {
        if (!this.plugins.has(manifest.id)) {
          this.loadPlugin(pluginPath, manifest);
        }
        const plugin = this.plugins.get(manifest.id);
        if (plugin && plugin.enabled) {
          await this.activatePlugin(manifest.id);
        }
      } catch (error) {
        console.error(`Failed to reload plugin ${manifest.id}:`, error);
      }
    }
  }

  async installPlugin(manifestUrl) {
    try {
      const fetch = require("node-fetch");
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`);
      }
      const manifest = await response.json();
      if (!manifest.id || !manifest.version) {
        throw new Error("Invalid manifest: missing id or version");
      }
      const pluginDir = path.join(this.basePluginDir, manifest.id);
      if (fs.existsSync(pluginDir)) {
        throw new Error(`Plugin ${manifest.id} is already installed`);
      }
      fs.mkdirSync(pluginDir, { recursive: true });
      const manifestPath = path.join(pluginDir, "agentzero.json");
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      if (manifest.files) {
        for (const file of manifest.files) {
          const fileUrl = new URL(file.url, manifestUrl).href;
          const fileResponse = await fetch(fileUrl);
          const filePath = path.join(pluginDir, file.path);
          const fileDir = path.dirname(filePath);
          if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true });
          }
          fs.writeFileSync(filePath, await fileResponse.text());
        }
      }
      this.loadPlugin(pluginDir, manifest);
      return { success: true, pluginId: manifest.id };
    } catch (error) {
      console.error("Failed to install plugin:", error);
      throw error;
    }
  }

  async uninstallPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }
    if (plugin.enabled) {
      await this.deactivatePlugin(pluginId);
    }
    this.plugins.delete(pluginId);
    this.pluginPaths.delete(pluginId);
    try {
      const pluginPath = plugin.path;
      if (fs.existsSync(pluginPath) && pluginPath.startsWith(this.basePluginDir)) {
        fs.rmSync(pluginPath, { recursive: true, force: true });
      }
      return { success: true, pluginId };
    } catch (error) {
      console.error(`Failed to uninstall plugin ${pluginId}:`, error);
      throw error;
    }
  }

  async updatePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }
    throw new Error("Plugin update not yet implemented");
  }

  validateManifest(manifest) {
    const required = ["id", "name", "version", "description"];
    for (const field of required) {
      if (!manifest[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }
    if (!/^[a-z0-9_\-]+$/i.test(manifest.id)) {
      return { valid: false, error: "Plugin ID must contain only alphanumeric characters, hyphens, and underscores" };
    }
    return { valid: true };
  }

  getHookList() {
    return HOOK_POINTS;
  }

  getRegisteredHooks(hookName) {
    return this.hooks.get(hookName) || [];
  }
}

let pluginSystemInstance = null;

function createPluginSystem() {
  if (!pluginSystemInstance) {
    pluginSystemInstance = new PluginSystem();
  }
  return pluginSystemInstance;
}

function getPluginSystem() {
  return pluginSystemInstance;
}

module.exports = {
  createPluginSystem,
  getPluginSystem,
  HOOK_POINTS,
  EXTENSION_DIRS
};