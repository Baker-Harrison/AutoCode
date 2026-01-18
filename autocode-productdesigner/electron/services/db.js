const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { runMigrations, getMigrationStatus, backupDatabase } = require("./migration");
const { createApprovalSystem } = require("./approvalSystem");

let db = null;
let dbPath = null;
let SQL = null;
let approvalSystem = null;

function closeDatabase() {
  if (db) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (error) {
      console.error("Failed to close database", error);
    } finally {
      db = null;
    }
  }
}

async function initDatabase(workspacePath) {
  closeDatabase();
  const dataDir = path.join(workspacePath, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  dbPath = path.join(dataDir, "ide.db");

  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      text TEXT NOT NULL,
      options_json TEXT NOT NULL,
      recommended_option TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS specs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      spec_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS memory (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      metadata TEXT,
      area TEXT NOT NULL DEFAULT 'MAIN',
      created_at TEXT NOT NULL,
      terms TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS knowledge_checksums (
      filepath TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const migrationsApplied = runMigrations(db);
  if (migrationsApplied > 0) {
    console.log(`Applied ${migrationsApplied} database migrations`);
  }

  approvalSystem = createApprovalSystem(db);
}

function getApprovalSystem() {
  if (!approvalSystem) {
    throw new Error("Approval system not initialized. Select workspace first.");
  }
  return approvalSystem;
}

function getMigrationInfo() {
  const database = getDb();
  return getMigrationStatus(database);
}

function backupCurrentDatabase(workspacePath) {
  const database = getDb();
  return backupDatabase(database, workspacePath);
}

function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Select workspace first.");
  }
  return db;
}

function insertEvent(sessionId, level, message) {
  const database = getDb();
  database.run(
    "INSERT INTO events (id, session_id, level, message, created_at) VALUES (?, ?, ?, ?, ?)",
    [`evt_${randomUUID()}`, sessionId, level, message, new Date().toISOString()]
  );
}

module.exports = {
  initDatabase,
  closeDatabase,
  getDb,
  insertEvent,
  getApprovalSystem,
  getMigrationInfo,
  backupCurrentDatabase
};
