const { workflowEngine } = require("./workflow");
const { eventLogger } = require("./eventLogger");

function registerWorkflowHandlers(ipcMain) {
  ipcMain.handle(
    "workflow:createSession",
    async (_event, prompt) => {
      if (typeof prompt !== "string" || !prompt.trim()) {
        throw new Error("Prompt is required");
      }
      return workflowEngine.createSession(prompt);
    }
  );

  ipcMain.handle(
    "workflow:createTask",
    async (_event, payload) => {
      if (!payload || typeof payload.sessionId !== "string" || typeof payload.title !== "string") {
        throw new Error("Invalid task payload");
      }
      return workflowEngine.createTask(payload.sessionId, payload);
    }
  );

  ipcMain.handle(
    "workflow:getTasks",
    async (_event, sessionId) => {
      if (typeof sessionId !== "string") {
        throw new Error("Session ID is required");
      }
      return workflowEngine.getTasks(sessionId);
    }
  );

  ipcMain.handle(
    "workflow:updateTaskStatus",
    async (_event, taskId, status) => {
      if (typeof taskId !== "string" || typeof status !== "string") {
        throw new Error("Invalid parameters");
      }
      return workflowEngine.updateTaskStatus(taskId, status);
    }
  );

  ipcMain.handle(
    "workflow:pauseTask",
    async (_event, taskId) => {
      if (typeof taskId !== "string") {
        throw new Error("Task ID is required");
      }
      return workflowEngine.pauseTask(taskId);
    }
  );

  ipcMain.handle(
    "workflow:resumeTask",
    async (_event, taskId) => {
      if (typeof taskId !== "string") {
        throw new Error("Task ID is required");
      }
      return workflowEngine.resumeTask(taskId);
    }
  );

  ipcMain.handle(
    "workflow:registerAgent",
    async (_event, agentId, config) => {
      if (typeof agentId !== "string" || !config) {
        throw new Error("Invalid agent registration");
      }
      return workflowEngine.registerAgent(agentId, config);
    }
  );

  ipcMain.handle(
    "workflow:updateAgentStatus",
    async (_event, agentId, status, currentTaskId) => {
      if (typeof agentId !== "string" || typeof status !== "string") {
        throw new Error("Invalid parameters");
      }
      return workflowEngine.updateAgentStatus(agentId, status, currentTaskId);
    }
  );

  ipcMain.handle(
    "workflow:addMonologue",
    async (_event, agentId, message) => {
      if (typeof agentId !== "string" || typeof message !== "string") {
        throw new Error("Invalid parameters");
      }
      return workflowEngine.addMonologueEntry(agentId, message);
    }
  );

  ipcMain.handle(
    "workflow:getMonologue",
    async (_event, agentId, limit) => {
      if (typeof agentId !== "string") {
        throw new Error("Agent ID is required");
      }
      return workflowEngine.getAgentMonologue(agentId, limit || 100);
    }
  );

  ipcMain.handle(
    "workflow:recordToolExecution",
    async (_event, toolName, status, result, metadata) => {
      if (typeof toolName !== "string" || typeof status !== "string") {
        throw new Error("Invalid parameters");
      }
      return workflowEngine.recordToolExecution(toolName, status, result, metadata || {});
    }
  );

  ipcMain.handle(
    "workflow:updateToolExecution",
    async (_event, executionId, status, result) => {
      if (typeof executionId !== "string" || typeof status !== "string") {
        throw new Error("Invalid parameters");
      }
      return workflowEngine.updateToolExecution(executionId, status, result);
    }
  );

  ipcMain.handle(
    "workflow:getToolExecutions",
    async (_event, sessionId, limit) => {
      return workflowEngine.getToolExecutions(sessionId || null, limit || 100);
    }
  );

  ipcMain.handle(
    "workflow:broadcastIntervention",
    async (_event, sessionId, level, message) => {
      if (typeof sessionId !== "string" || typeof level !== "string" || typeof message !== "string") {
        throw new Error("Invalid parameters");
      }
      return workflowEngine.broadcastIntervention(sessionId, level, message);
    }
  );

  ipcMain.handle(
    "workflow:getSessionState",
    async (_event, sessionId) => {
      if (typeof sessionId !== "string") {
        throw new Error("Session ID is required");
      }
      return workflowEngine.getSessionState(sessionId);
    }
  );

  ipcMain.handle(
    "workflow:persistSession",
    async (_event, sessionId) => {
      if (typeof sessionId !== "string") {
        throw new Error("Session ID is required");
      }
      return workflowEngine.persistSession(sessionId);
    }
  );

  ipcMain.handle(
    "workflow:closeSession",
    async (_event, sessionId) => {
      if (typeof sessionId !== "string") {
        throw new Error("Session ID is required");
      }
      return workflowEngine.closeSession(sessionId);
    }
  );

  ipcMain.handle(
    "workflow:getAllAgents",
    async () => {
      return workflowEngine.getAllAgents();
    }
  );
}

function registerEventHandlers(ipcMain) {
  ipcMain.handle(
    "events:log",
    async (_event, toolId, level, message, metadata, sessionId) => {
      if (typeof toolId !== "string" || typeof level !== "string" || typeof message !== "string") {
        throw new Error("Invalid parameters");
      }
      return eventLogger.logEvent(toolId, level, message, metadata || {}, sessionId || null);
    }
  );

  ipcMain.handle(
    "events:get",
    async (_event, filters, limit) => {
      return eventLogger.getEvents(filters || {}, limit || 100);
    }
  );

  ipcMain.handle(
    "events:getBySession",
    async (_event, sessionId, level, limit) => {
      if (typeof sessionId !== "string") {
        throw new Error("Session ID is required");
      }
      return eventLogger.getEventsBySession(sessionId, level || null, limit || 100);
    }
  );

  ipcMain.handle(
    "events:getByTool",
    async (_event, toolId, limit) => {
      if (typeof toolId !== "string") {
        throw new Error("Tool ID is required");
      }
      return eventLogger.getEventsByTool(toolId, limit || 100);
    }
  );

  ipcMain.handle(
    "events:getRecent",
    async (_event, limit) => {
      return eventLogger.getRecentEvents(limit || 50);
    }
  );

  ipcMain.handle(
    "events:getStats",
    async (_event, sessionId) => {
      return eventLogger.getEventStats(sessionId || null);
    }
  );

  ipcMain.handle(
    "events:search",
    async (_event, searchTerm, sessionId, limit) => {
      if (typeof searchTerm !== "string") {
        throw new Error("Search term is required");
      }
      return eventLogger.searchEvents(searchTerm, sessionId || null, limit || 100);
    }
  );

  ipcMain.handle(
    "events:clear",
    async (_event, sessionId) => {
      return eventLogger.clearEvents(sessionId || null);
    }
  );

  ipcMain.handle(
    "events:export",
    async (_event, format, sessionId) => {
      if (typeof format !== "string") {
        throw new Error("Format is required");
      }
      return eventLogger.exportEvents(format, sessionId || null);
    }
  );

  ipcMain.handle(
    "events:getTimeline",
    async (_event, sessionId, granularity) => {
      return eventLogger.getTimeline(sessionId || null, granularity || "minute");
    }
  );
}

module.exports = {
  registerWorkflowHandlers,
  registerEventHandlers
};
