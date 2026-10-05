-- Additive migration: original visits and IDs are preserved.
ALTER TABLE coffee_visits ADD COLUMN shop_id TEXT;
ALTER TABLE coffee_visits ADD COLUMN deleted_at TEXT;
CREATE TABLE IF NOT EXISTS coffee_shops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  address TEXT,
  lat REAL,
  lng REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS coffee_shop_aliases (
  provider_id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES coffee_shops(id)
);
CREATE INDEX IF NOT EXISTS idx_visit_shop ON coffee_visits(shop_id);
CREATE TABLE IF NOT EXISTS owner_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS owner_login_attempts (client_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_start INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS vest_state (id INTEGER PRIMARY KEY CHECK(id = 1), revision INTEGER NOT NULL DEFAULT 0, commit_token TEXT);
INSERT OR IGNORE INTO vest_state (id, revision) VALUES (1, 0);
CREATE TABLE IF NOT EXISTS vest_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, games_json TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
