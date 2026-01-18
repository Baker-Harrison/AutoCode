const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");

const MIGRATIONS_TABLE = "schema_migrations";

const migrations = [
  {
    version: 1,
    name: "initial_teams_schema",
    up: (db) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS teams (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          leader_branch TEXT NOT NULL,
          leader_agent_id TEXT,
          created_at TEXT NOT NULL
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          team_id TEXT NOT NULL,
          name TEXT NOT NULL,
          branch TEXT NOT NULL,
          role TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS approvals (
          id TEXT PRIMARY KEY,
          team_id TEXT NOT NULL,
          action_id TEXT NOT NULL,
          action_type TEXT NOT NULL,
          risk_level TEXT NOT NULL,
          approver_role TEXT NOT NULL,
          approver_id TEXT,
          comments TEXT,
          timestamp TEXT NOT NULL,
          escalated_from TEXT,
          FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS agent_tasks (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL,
          parent_task_id TEXT,
          team_id TEXT NOT NULL,
          branch TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
          FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
          FOREIGN KEY (parent_task_id) REFERENCES agent_tasks(id) ON DELETE CASCADE
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS memory_documents (
          id TEXT PRIMARY KEY,
          workspace TEXT NOT NULL,
          area TEXT NOT NULL DEFAULT 'MAIN',
          content TEXT NOT NULL,
          embeddings BLOB,
          metadata TEXT,
          timestamp TEXT NOT NULL
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS knowledge_files (
          id TEXT PRIMARY KEY,
          workspace TEXT NOT NULL,
          filename TEXT NOT NULL,
          checksum TEXT NOT NULL,
          imported_at TEXT NOT NULL,
          state TEXT NOT NULL DEFAULT 'active'
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS hooks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          handler_file TEXT NOT NULL,
          priority INTEGER NOT NULL DEFAULT 0,
          enabled INTEGER NOT NULL DEFAULT 1
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS plugins (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          version TEXT NOT NULL,
          manifest_json TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          installed_at TEXT NOT NULL
        );
      `);
    },
    down: (db) => {
      db.run("DROP TABLE IF EXISTS plugins;");
      db.run("DROP TABLE IF EXISTS hooks;");
      db.run("DROP TABLE IF EXISTS knowledge_files;");
      db.run("DROP TABLE IF EXISTS memory_documents;");
      db.run("DROP TABLE IF EXISTS agent_tasks;");
      db.run("DROP TABLE IF EXISTS approvals;");
      db.run("DROP TABLE IF EXISTS agents;");
      db.run("DROP TABLE IF EXISTS teams;");
    }
  },
  {
    version: 2,
    name: "extend_sessions",
    up: (db) => {
      const columns = db.exec("PRAGMA table_info(sessions);");
      const hasTeamId = columns[0]?.values?.some(row => row[1] === 'team_id');
      
      if (!hasTeamId) {
        db.run("ALTER TABLE sessions ADD COLUMN team_id TEXT;");
        db.run("ALTER TABLE sessions ADD COLUMN approval_required INTEGER NOT NULL DEFAULT 0;");
      }
    },
    down: (db) => {
      db.run("CREATE TABLE sessions_backup AS SELECT id, prompt, status, created_at FROM sessions;");
      db.run("DROP TABLE sessions;");
      db.run("ALTER TABLE sessions_backup RENAME TO sessions;");
    }
  },
  {
    version: 3,
    name: "extend_events",
    up: (db) => {
      const columns = db.exec("PRAGMA table_info(events);");
      const hasTeamId = columns[0]?.values?.some(row => row[1] === 'team_id');
      
      if (!hasTeamId) {
        db.run("ALTER TABLE events ADD COLUMN team_id TEXT;");
        db.run("ALTER TABLE events ADD COLUMN agent_id TEXT;");
      }
    },
    down: (db) => {
      db.run("CREATE TABLE events_backup AS SELECT id, session_id, level, message, created_at FROM events;");
      db.run("DROP TABLE events;");
      db.run("ALTER TABLE events_backup RENAME TO events;");
    }
  },
  {
    version: 4,
    name: "extend_tasks",
    up: (db) => {
      const columns = db.exec("PRAGMA table_info(tasks);");
      const hasAgentId = columns[0]?.values?.some(row => row[1] === 'agent_id');
      
      if (!hasAgentId) {
        db.run("ALTER TABLE tasks ADD COLUMN agent_id TEXT;");
        db.run("ALTER TABLE tasks ADD COLUMN branch TEXT;");
        db.run("ALTER TABLE tasks ADD COLUMN team_id TEXT;");
      }
    },
    down: (db) => {
      db.run("CREATE TABLE tasks_backup AS SELECT id, session_id, title, status, created_at FROM tasks;");
      db.run("DROP TABLE tasks;");
      db.run("ALTER TABLE tasks_backup RENAME TO tasks;");
    }
  },
  {
    version: 5,
    name: "create_indexes",
    up: (db) => {
      db.run("CREATE INDEX IF NOT EXISTS idx_teams_leader_branch ON teams(leader_branch);");
      
      db.run("CREATE INDEX IF NOT EXISTS idx_agents_team ON agents(team_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_agents_branch ON agents(branch);");
      
      db.run("CREATE INDEX IF NOT EXISTS idx_approvals_team ON approvals(team_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_approvals_risk ON approvals(risk_level);");
      db.run("CREATE INDEX IF NOT EXISTS idx_approvals_timestamp ON approvals(timestamp);");
      
      db.run("CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);");
      db.run("CREATE INDEX IF NOT EXISTS idx_tasks_branch ON tasks(branch);");
      
      db.run("CREATE INDEX IF NOT EXISTS idx_memory_workspace ON memory_documents(workspace);");
      db.run("CREATE INDEX IF NOT EXISTS idx_memory_area ON memory_documents(area);");
      db.run("CREATE INDEX IF NOT EXISTS idx_memory_timestamp ON memory_documents(timestamp);");
      
      db.run("CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent ON agent_tasks(agent_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_agent_tasks_team ON agent_tasks(team_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);");
      db.run("CREATE INDEX IF NOT EXISTS idx_agent_tasks_branch ON agent_tasks(branch);");
    },
    down: (db) => {
      db.run("DROP INDEX IF EXISTS idx_teams_leader_branch;");
      db.run("DROP INDEX IF EXISTS idx_agents_team;");
      db.run("DROP INDEX IF EXISTS idx_agents_branch;");
      db.run("DROP INDEX IF EXISTS idx_approvals_team;");
      db.run("DROP INDEX IF EXISTS idx_approvals_risk;");
      db.run("DROP INDEX IF EXISTS idx_approvals_timestamp;");
      db.run("DROP INDEX IF EXISTS idx_tasks_agent;");
      db.run("DROP INDEX IF EXISTS idx_tasks_team;");
      db.run("DROP INDEX IF EXISTS idx_tasks_status;");
      db.run("DROP INDEX IF EXISTS idx_tasks_branch;");
      db.run("DROP INDEX IF EXISTS idx_memory_workspace;");
      db.run("DROP INDEX IF EXISTS idx_memory_area;");
      db.run("DROP INDEX IF EXISTS idx_memory_timestamp;");
      db.run("DROP INDEX IF EXISTS idx_agent_tasks_agent;");
      db.run("DROP INDEX IF EXISTS idx_agent_tasks_team;");
      db.run("DROP INDEX IF EXISTS idx_agent_tasks_status;");
      db.run("DROP INDEX IF EXISTS idx_agent_tasks_branch;");
    }
  },
  {
    version: 6,
    name: "workflow_orchestration",
    up: (db) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS workflow_sessions (
          id TEXT PRIMARY KEY,
          prompt TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS workflow_tasks (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL,
          parent_task_id TEXT,
          agent_id TEXT,
          branch TEXT,
          team_id TEXT,
          priority INTEGER DEFAULT 0,
          dependencies_json TEXT,
          created_at TEXT NOT NULL,
          started_at TEXT,
          completed_at TEXT
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS workflow_agents (
          id TEXT PRIMARY KEY,
          profile TEXT NOT NULL,
          level TEXT NOT NULL,
          context_json TEXT,
          superior TEXT,
          subordinates_json TEXT,
          status TEXT NOT NULL,
          current_task_id TEXT,
          created_at TEXT NOT NULL
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS tool_events (
          id TEXT PRIMARY KEY,
          session_id TEXT,
          tool_id TEXT NOT NULL,
          level TEXT NOT NULL,
          message TEXT NOT NULL,
          metadata_json TEXT,
          timestamp TEXT NOT NULL
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS tool_executions (
          id TEXT PRIMARY KEY,
          session_id TEXT,
          tool_name TEXT NOT NULL,
          status TEXT NOT NULL,
          result TEXT,
          metadata_json TEXT,
          started_at TEXT NOT NULL,
          completed_at TEXT
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS monologue_entries (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          message TEXT NOT NULL,
          timestamp TEXT NOT NULL
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS interventions (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          level TEXT NOT NULL,
          message TEXT NOT NULL,
          timestamp TEXT NOT NULL
        );
      `);

      db.run("CREATE INDEX IF NOT EXISTS idx_workflow_tasks_session ON workflow_tasks(session_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_workflow_tasks_agent ON workflow_tasks(agent_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status);");
      db.run("CREATE INDEX IF NOT EXISTS idx_workflow_tasks_parent ON workflow_tasks(parent_task_id);");

      db.run("CREATE INDEX IF NOT EXISTS idx_tool_events_session ON tool_events(session_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_tool_events_tool ON tool_events(tool_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_tool_events_timestamp ON tool_events(timestamp);");

      db.run("CREATE INDEX IF NOT EXISTS idx_tool_executions_session ON tool_executions(session_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_tool_executions_status ON tool_executions(status);");
      db.run("CREATE INDEX IF NOT EXISTS idx_tool_executions_started ON tool_executions(started_at);");

      db.run("CREATE INDEX IF NOT EXISTS idx_monologue_agent ON monologue_entries(agent_id);");
      db.run("CREATE INDEX IF NOT EXISTS idx_monologue_timestamp ON monologue_entries(timestamp);");
    },
    down: (db) => {
      db.run("DROP INDEX IF EXISTS idx_monologue_timestamp;");
      db.run("DROP INDEX IF EXISTS idx_monologue_agent;");
      db.run("DROP INDEX IF EXISTS idx_tool_executions_started;");
      db.run("DROP INDEX IF EXISTS idx_tool_executions_status;");
      db.run("DROP INDEX IF EXISTS idx_tool_executions_session;");
      db.run("DROP INDEX IF EXISTS idx_tool_events_timestamp;");
      db.run("DROP INDEX IF EXISTS idx_tool_events_tool;");
      db.run("DROP INDEX IF EXISTS idx_tool_events_session;");
      db.run("DROP INDEX IF EXISTS idx_workflow_tasks_parent;");
      db.run("DROP INDEX IF EXISTS idx_workflow_tasks_status;");
      db.run("DROP INDEX IF EXISTS idx_workflow_tasks_agent;");
      db.run("DROP INDEX IF EXISTS idx_workflow_tasks_session;");
      db.run("DROP TABLE IF EXISTS interventions;");
      db.run("DROP TABLE IF EXISTS monologue_entries;");
      db.run("DROP TABLE IF EXISTS tool_executions;");
      db.run("DROP TABLE IF EXISTS tool_events;");
      db.run("DROP TABLE IF EXISTS workflow_agents;");
      db.run("DROP TABLE IF EXISTS workflow_tasks;");
      db.run("DROP TABLE IF EXISTS workflow_sessions;");
    }
  }
];

function initMigrations(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

function getCurrentVersion(db) {
  try {
    const result = db.exec(`SELECT MAX(version) as version FROM ${MIGRATIONS_TABLE};`);
    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values[0][0] || 0;
    }
  } catch (error) {
    console.error("Error getting current version:", error);
  }
  return 0;
}

function setMigrationVersion(db, version, name) {
  db.run(
    `INSERT INTO ${MIGRATIONS_TABLE} (version, name, applied_at) VALUES (?, ?, ?)`,
    [version, name, new Date().toISOString()]
  );
}

function runMigrations(db) {
  initMigrations(db);
  const currentVersion = getCurrentVersion(db);
  const pendingMigrations = migrations.filter(m => m.version > currentVersion);

  for (const migration of pendingMigrations) {
    console.log(`Applying migration ${migration.version}: ${migration.name}`);
    try {
      migration.up(db);
      setMigrationVersion(db, migration.version, migration.name);
      console.log(`Successfully applied migration ${migration.version}`);
    } catch (error) {
      console.error(`Failed to apply migration ${migration.version}:`, error);
      throw error;
    }
  }

  return pendingMigrations.length;
}

function rollbackToVersion(db, targetVersion) {
  initMigrations(db);
  const currentVersion = getCurrentVersion(db);
  
  if (targetVersion >= currentVersion) {
    console.log("No migrations to rollback.");
    return 0;
  }

  const migrationsToRollback = migrations.filter(
    m => m.version > targetVersion && m.version <= currentVersion
  ).sort((a, b) => b.version - a.version);

  for (const migration of migrationsToRollback) {
    console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
    try {
      if (migration.down) {
        migration.down(db);
        db.run(`DELETE FROM ${MIGRATIONS_TABLE} WHERE version = ?`, [migration.version]);
        console.log(`Successfully rolled back migration ${migration.version}`);
      }
    } catch (error) {
      console.error(`Failed to rollback migration ${migration.version}:`, error);
      throw error;
    }
  }

  return migrationsToRollback.length;
}

function getMigrationStatus(db) {
  initMigrations(db);
  const currentVersion = getCurrentVersion(db);
  const applied = db.exec(`SELECT * FROM ${MIGRATIONS_TABLE} ORDER BY version;`);
  
  return {
    currentVersion,
    totalMigrations: migrations.length,
    appliedMigrations: applied.length > 0 ? applied[0].values.map(row => ({
      version: row[0],
      name: row[1],
      appliedAt: row[2]
    })) : [],
    pendingMigrations: migrations.filter(m => m.version > currentVersion).map(m => ({
      version: m.version,
      name: m.name
    }))
  };
}

function backupDatabase(db, workspacePath) {
  const dataDir = path.join(workspacePath, "data");
  const backupsDir = path.join(dataDir, "backups");
  fs.mkdirSync(backupsDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `ide_backup_${timestamp}.db`);
  
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(backupPath, buffer);
    console.log(`Database backed up to: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error("Failed to backup database:", error);
    throw error;
  }
}

function restoreDatabase(SQL, backupPath, targetDbPath) {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  
  const fileBuffer = fs.readFileSync(backupPath);
  const restoredDb = new SQL.Database(fileBuffer);
  
  const data = restoredDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(targetDbPath, buffer);
  
  console.log(`Database restored from: ${backupPath}`);
  return restoredDb;
}

function listBackups(workspacePath) {
  const backupsDir = path.join(workspacePath, "data", "backups");
  
  if (!fs.existsSync(backupsDir)) {
    return [];
  }
  
  const files = fs.readdirSync(backupsDir)
    .filter(file => file.startsWith("ide_backup_") && file.endsWith(".db"))
    .map(file => {
      const filePath = path.join(backupsDir, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        path: filePath,
        size: stats.size,
        created: stats.birthtime
      };
    })
    .sort((a, b) => b.created - a.created);
  
  return files;
}

module.exports = {
  migrations,
  runMigrations,
  rollbackToVersion,
  getMigrationStatus,
  backupDatabase,
  restoreDatabase,
  listBackups
};
