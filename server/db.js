import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// Table definition reproduced exactly from the assignment specification (Section 6).
const CREATE_CAPSULES_TABLE = `
CREATE TABLE IF NOT EXISTS capsules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  prompt_title TEXT NOT NULL,
  prompt_version TEXT,
  prompt_text TEXT NOT NULL,
  response_summary TEXT,
  category TEXT,
  usefulness TEXT,
  reviewed INTEGER DEFAULT 0,
  improved INTEGER DEFAULT 0,
  screenshot_url TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);`;

// Every query filters on user_id, so an index keeps those lookups fast.
// This is separate from the table definition and does not change the schema.
const CREATE_USER_INDEX = 'CREATE INDEX IF NOT EXISTS idx_capsules_user_id ON capsules (user_id);';

export function openDatabase(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(CREATE_CAPSULES_TABLE);
  db.exec(CREATE_USER_INDEX);
  return db;
}

// Converts a database row into the JSON shape the frontend receives.
// SQLite stores booleans as 0/1, so they are turned back into true/false here.
export function toCapsule(row) {
  return {
    id: row.id,
    project_name: row.project_name,
    prompt_title: row.prompt_title,
    prompt_version: row.prompt_version,
    prompt_text: row.prompt_text,
    response_summary: row.response_summary,
    category: row.category,
    usefulness: row.usefulness,
    reviewed: row.reviewed === 1,
    improved: row.improved === 1,
    screenshot_url: row.screenshot_url,
    notes: row.notes,
    created_at: row.created_at,
  };
}
