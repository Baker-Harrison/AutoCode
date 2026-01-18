const { randomUUID } = require("crypto");
const { getDb } = require("./db");

class EventLogger {
  constructor() {
    this.eventBuffer = [];
    this.maxBufferSize = 1000;
  }

  logEvent(toolId, level, message, metadata = {}, sessionId = null) {
    const event = {
      id: `evt_${randomUUID()}`,
      sessionId,
      toolId,
      level,
      message,
      metadata,
      timestamp: new Date().toISOString()
    };

    this.eventBuffer.push(event);

    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer.shift();
    }

    const db = getDb();
    db.run(
      `INSERT INTO tool_events 
       (id, session_id, tool_id, level, message, metadata_json, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.sessionId,
        event.toolId,
        event.level,
        event.message,
        JSON.stringify(event.metadata),
        event.timestamp
      ]
    );

    return event;
  }

  getEvents(filters = {}, limit = 100) {
    const db = getDb();
    let query = "SELECT id, session_id, tool_id, level, message, metadata_json, timestamp FROM tool_events";
    const conditions = [];
    const params = [];

    if (filters.sessionId) {
      conditions.push("session_id = ?");
      params.push(filters.sessionId);
    }

    if (filters.toolId) {
      conditions.push("tool_id = ?");
      params.push(filters.toolId);
    }

    if (filters.level) {
      conditions.push("level = ?");
      params.push(filters.level);
    }

    if (filters.startTime) {
      conditions.push("timestamp >= ?");
      params.push(filters.startTime);
    }

    if (filters.endTime) {
      conditions.push("timestamp <= ?");
      params.push(filters.endTime);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY timestamp DESC LIMIT ?";
    params.push(limit);

    const result = db.exec(query, params);

    if (result.length === 0) return [];

    return result[0].values.map(row => {
      const columns = result[0].columns;
      const event = {};
      columns.forEach((col, i) => {
        event[col] = col === "metadata_json" ? JSON.parse(row[i]) : row[i];
      });
      return event;
    });
  }

  getEventsBySession(sessionId, level = null, limit = 100) {
    return this.getEvents({ sessionId, level }, limit);
  }

  getEventsByTool(toolId, limit = 100) {
    return this.getEvents({ toolId }, limit);
  }

  getRecentEvents(limit = 50) {
    return this.getEvents({}, limit);
  }

  getEventStats(sessionId = null) {
    const db = getDb();
    let query = "SELECT level, COUNT(*) as count FROM tool_events";
    const params = [];

    if (sessionId) {
      query += " WHERE session_id = ?";
      params.push(sessionId);
    }

    query += " GROUP BY level";

    const result = db.exec(query, params);

    if (result.length === 0) return {};

    const stats = {};
    result[0].values.forEach(row => {
      stats[row[0]] = row[1];
    });

    return stats;
  }

  searchEvents(searchTerm, sessionId = null, limit = 100) {
    const db = getDb();
    let query = "SELECT id, session_id, tool_id, level, message, metadata_json, timestamp FROM tool_events";
    const params = [];

    const conditions = [];

    if (sessionId) {
      conditions.push("session_id = ?");
      params.push(sessionId);
    }

    conditions.push("(message LIKE ? OR tool_id LIKE ?)");
    const likePattern = `%${searchTerm}%`;
    params.push(likePattern, likePattern);

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY timestamp DESC LIMIT ?";
    params.push(limit);

    const result = db.exec(query, params);

    if (result.length === 0) return [];

    return result[0].values.map(row => {
      const columns = result[0].columns;
      const event = {};
      columns.forEach((col, i) => {
        event[col] = col === "metadata_json" ? JSON.parse(row[i]) : row[i];
      });
      return event;
    });
  }

  clearEvents(sessionId = null) {
    const db = getDb();

    if (sessionId) {
      db.run("DELETE FROM tool_events WHERE session_id = ?", [sessionId]);
    } else {
      db.run("DELETE FROM tool_events");
    }

    this.eventBuffer = [];
  }

  exportEvents(format = "json", sessionId = null) {
    const events = this.getEvents({ sessionId }, 10000);

    if (format === "json") {
      return JSON.stringify(events, null, 2);
    } else if (format === "csv") {
      const headers = ["id", "session_id", "tool_id", "level", "message", "metadata", "timestamp"];
      const rows = events.map(e => [
        e.id,
        e.sessionId || "",
        e.toolId,
        e.level,
        e.message,
        JSON.stringify(e.metadata),
        e.timestamp
      ]);

      return [headers, ...rows].map(row => row.join(",")).join("\n");
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  getTimeline(sessionId = null, granularity = "minute") {
    const db = getDb();
    let query = "SELECT timestamp, level FROM tool_events";
    const params = [];

    if (sessionId) {
      query += " WHERE session_id = ?";
      params.push(sessionId);
    }

    query += " ORDER BY timestamp ASC";

    const result = db.exec(query, params);

    if (result.length === 0) return [];

    const timeline = {};
    result[0].values.forEach(row => {
      const timestamp = row[0];
      const level = row[1];
      const key = timestamp.substring(0, granularity === "minute" ? 16 : 13);

      if (!timeline[key]) {
        timeline[key] = { info: 0, warning: 0, error: 0, debug: 0 };
      }

      if (timeline[key][level] !== undefined) {
        timeline[key][level]++;
      } else {
        timeline[key].info++;
      }
    });

    return Object.entries(timeline).map(([time, stats]) => ({
      time,
      ...stats
    }));
  }
}

const eventLogger = new EventLogger();

module.exports = { eventLogger };
