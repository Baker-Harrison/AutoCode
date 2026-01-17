const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

let db = null;
let dbPath = null;
let SQL = null;

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
  insertEvent
};
