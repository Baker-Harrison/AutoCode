const { randomUUID } = require("crypto");
const { getDb, insertEvent } = require("./db");

class WorkflowEngine {
  constructor() {
    this.activeSessions = new Map();
    this.pausedTasks = new Set();
    this.agentStates = new Map();
    this.toolExecutions = new Map();
  }

  createSession(prompt) {
    const sessionId = `sess_${randomUUID()}`;
    const createdAt = new Date().toISOString();

    const db = getDb();
    db.run(
      "INSERT INTO workflow_sessions (id, prompt, status, created_at) VALUES (?, ?, ?, ?)",
      [sessionId, prompt, "initialized", createdAt]
    );

    this.activeSessions.set(sessionId, {
      id: sessionId,
      prompt,
      status: "initialized",
      createdAt,
      messages: [],
      broadcastLevel: "normal"
    });

    return sessionId;
  }

  createTask(sessionId, taskData) {
    const taskId = `task_${randomUUID()}`;
    const now = new Date().toISOString();

    const task = {
      id: taskId,
      sessionId,
      title: taskData.title,
      status: "queued",
      parentTaskId: taskData.parentTaskId || null,
      agentId: taskData.agentId || null,
      branch: taskData.branch || null,
      teamId: taskData.teamId || null,
      priority: taskData.priority || 0,
      dependencies: taskData.dependencies || [],
      createdAt: now,
      startedAt: null,
      completedAt: null
    };

    const db = getDb();
    db.run(
      `INSERT INTO workflow_tasks 
       (id, session_id, title, status, parent_task_id, agent_id, branch, team_id, 
        priority, dependencies_json, created_at, started_at, completed_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        sessionId,
        task.title,
        task.status,
        task.parentTaskId,
        task.agentId,
        task.branch,
        task.teamId,
        task.priority,
        JSON.stringify(task.dependencies),
        task.createdAt,
        task.startedAt,
        task.completedAt
      ]
    );

    return task;
  }

  getTasks(sessionId) {
    const db = getDb();
    const result = db.exec(
      "SELECT id, session_id, title, status, parent_task_id, agent_id, branch, team_id, " +
      "priority, dependencies_json, created_at, started_at, completed_at " +
      "FROM workflow_tasks WHERE session_id = ? ORDER BY created_at ASC",
      [sessionId]
    );

    if (result.length === 0) return [];

    return result[0].values.map(row => {
      const columns = result[0].columns;
      const task = {};
      columns.forEach((col, i) => {
        task[col] = col === "dependencies_json" ? JSON.parse(row[i]) : row[i];
      });
      return task;
    });
  }

  updateTaskStatus(taskId, status) {
    const db = getDb();
    const updates = ["status = ?"];
    const params = [status];

    if (status === "running") {
      updates.push("started_at = ?");
      params.push(new Date().toISOString());
    } else if (status === "completed" || status === "failed") {
      updates.push("completed_at = ?");
      params.push(new Date().toISOString());
    }

    params.push(taskId);

    db.run(
      `UPDATE workflow_tasks SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    insertEvent(null, "info", `Task ${taskId} status updated to ${status}`);
  }

  registerAgent(agentId, config) {
    const agentState = {
      id: agentId,
      profile: config.profile || "default",
      level: config.level || "junior",
      context: config.context || {},
      superior: config.superior || null,
      subordinates: config.subordinates || [],
      status: "idle",
      currentTaskId: null,
      monologue: []
    };

    this.agentStates.set(agentId, agentState);

    const db = getDb();
    db.run(
      `INSERT OR REPLACE INTO workflow_agents 
       (id, profile, level, context_json, superior, subordinates_json, status, current_task_id, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        agentId,
        agentState.profile,
        agentState.level,
        JSON.stringify(agentState.context),
        agentState.superior,
        JSON.stringify(agentState.subordinates),
        agentState.status,
        agentState.currentTaskId,
        new Date().toISOString()
      ]
    );

    return agentState;
  }

  updateAgentStatus(agentId, status, currentTaskId = null) {
    const agentState = this.agentStates.get(agentId);
    if (agentState) {
      agentState.status = status;
      agentState.currentTaskId = currentTaskId;

      const db = getDb();
      db.run(
        "UPDATE workflow_agents SET status = ?, current_task_id = ? WHERE id = ?",
        [status, currentTaskId, agentId]
      );
    }
  }

  addMonologueEntry(agentId, message) {
    const agentState = this.agentStates.get(agentId);
    if (agentState) {
      const entry = {
        id: `mono_${randomUUID()}`,
        agentId,
        message,
        timestamp: new Date().toISOString()
      };

      agentState.monologue.push(entry);

      const db = getDb();
      db.run(
        "INSERT INTO monologue_entries (id, agent_id, message, timestamp) VALUES (?, ?, ?, ?)",
        [entry.id, entry.agentId, entry.message, entry.timestamp]
      );

      return entry;
    }
  }

  getAgentMonologue(agentId, limit = 100) {
    const db = getDb();
    const result = db.exec(
      "SELECT id, agent_id, message, timestamp FROM monologue_entries " +
      "WHERE agent_id = ? ORDER BY timestamp DESC LIMIT ?",
      [agentId, limit]
    );

    if (result.length === 0) return [];

    return result[0].values.map(row => {
      const columns = result[0].columns;
      const entry = {};
      columns.forEach((col, i) => {
        entry[col] = row[i];
      });
      return entry;
    });
  }

  recordToolExecution(toolName, status, result, metadata = {}) {
    const executionId = `exec_${randomUUID()}`;
    const now = new Date().toISOString();

    const execution = {
      id: executionId,
      toolName,
      status,
      result,
      metadata,
      startedAt: now,
      completedAt: status === "running" ? null : now
    };

    this.toolExecutions.set(executionId, execution);

    const db = getDb();
    db.run(
      `INSERT INTO tool_executions 
       (id, tool_name, status, result, metadata_json, started_at, completed_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        executionId,
        toolName,
        status,
        JSON.stringify(result),
        JSON.stringify(metadata),
        execution.startedAt,
        execution.completedAt
      ]
    );

    return execution;
  }

  updateToolExecution(executionId, status, result) {
    const execution = this.toolExecutions.get(executionId);
    if (execution) {
      execution.status = status;
      execution.result = result;
      execution.completedAt = new Date().toISOString();

      const db = getDb();
      db.run(
        "UPDATE tool_executions SET status = ?, result = ?, completed_at = ? WHERE id = ?",
        [status, JSON.stringify(result), execution.completedAt, executionId]
      );
    }
  }

  getToolExecutions(sessionId = null, limit = 100) {
    const db = getDb();
    let query = "SELECT id, tool_name, status, result, metadata_json, started_at, completed_at FROM tool_executions";
    const params = [];

    if (sessionId) {
      query += " WHERE session_id = ?";
      params.push(sessionId);
    }

    query += " ORDER BY started_at DESC LIMIT ?";
    params.push(limit);

    const result = db.exec(query, params);

    if (result.length === 0) return [];

    return result[0].values.map(row => {
      const columns = result[0].columns;
      const execution = {};
      columns.forEach((col, i) => {
        execution[col] = col === "result" || col === "metadata_json" ? JSON.parse(row[i]) : row[i];
      });
      return execution;
    });
  }

  pauseTask(taskId) {
    this.pausedTasks.add(taskId);
    this.updateTaskStatus(taskId, "paused");

    const db = getDb();
    db.run(
      "UPDATE workflow_tasks SET status = 'paused' WHERE id = ?",
      [taskId]
    );

    return { success: true };
  }

  resumeTask(taskId) {
    this.pausedTasks.delete(taskId);
    this.updateTaskStatus(taskId, "running");

    const db = getDb();
    db.run(
      "UPDATE workflow_tasks SET status = 'running' WHERE id = ?",
      [taskId]
    );

    return { success: true };
  }

  broadcastIntervention(sessionId, level, message) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.broadcastLevel = level;

      const db = getDb();
      db.run(
        "INSERT INTO interventions (id, session_id, level, message, timestamp) VALUES (?, ?, ?, ?, ?)",
        [`intv_${randomUUID()}`, sessionId, level, message, new Date().toISOString()]
      );

      insertEvent(sessionId, "warning", `Intervention broadcast: ${message}`);

      return { success: true, level, message };
    }
  }

  getSessionState(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    return {
      ...session,
      tasks: this.getTasks(sessionId),
      agents: Array.from(this.agentStates.values()).filter(a => a.sessionId === sessionId),
      toolExecutions: this.getToolExecutions(sessionId)
    };
  }

  persistSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const db = getDb();
    db.run(
      "UPDATE workflow_sessions SET status = ?, updated_at = ? WHERE id = ?",
      [session.status, new Date().toISOString(), sessionId]
    );
  }

  closeSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = "closed";
      this.persistSession(sessionId);
      this.activeSessions.delete(sessionId);
    }
  }

  getAllAgents() {
    const db = getDb();
    const result = db.exec("SELECT * FROM workflow_agents ORDER BY created_at DESC");

    if (result.length === 0) return [];

    const columns = result[0].columns;
    return result[0].values.map(row => {
      const agent = {};
      columns.forEach((col, i) => {
        let value = row[i];
        if (col === "context_json" && value) {
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = {};
          }
        }
        agent[col] = value;
      });
      return agent;
    });
  }
}

const workflowEngine = new WorkflowEngine();

module.exports = { workflowEngine };
