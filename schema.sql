-- Cloudflare D1 Database Schema

CREATE TABLE IF NOT EXISTS coffee_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  coffee_shop_name TEXT NOT NULL,
  city TEXT,
  opponent TEXT,
  sport TEXT,
  coffee_shop_address TEXT,
  coffee_shop_place_id TEXT,
  coffee_shop_lat REAL,
  coffee_shop_lng REAL,
  coffee_order TEXT,
  vibe_rating REAL NOT NULL CHECK(vibe_rating >= 0 AND vibe_rating <= 10),
  coffee_rating REAL NOT NULL CHECK(coffee_rating >= 0 AND coffee_rating <= 10),
  composite_score REAL GENERATED ALWAYS AS (vibe_rating + coffee_rating) STORED,
  notes TEXT,
  photo_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_date ON coffee_visits(date DESC);
CREATE INDEX IF NOT EXISTS idx_composite ON coffee_visits(composite_score DESC);


CREATE TABLE IF NOT EXISTS vest_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL UNIQUE,
  date TEXT,
  location TEXT,
  opponent TEXT NOT NULL,
  ranking INTEGER,
  outfit TEXT,
  result TEXT,
  overtime INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vest_game_id ON vest_games(game_id);
CREATE INDEX IF NOT EXISTS idx_vest_date ON vest_games(date DESC);
