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
  espn_event_id TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vest_game_id ON vest_games(game_id);
CREATE INDEX IF NOT EXISTS idx_vest_date ON vest_games(date DESC);

CREATE TABLE IF NOT EXISTS vest_game_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  espn_event_id TEXT NOT NULL UNIQUE,
  game_id INTEGER,
  wisconsin_score INTEGER,
  opponent_score INTEGER,
  wisconsin_h1 INTEGER,
  wisconsin_h2 INTEGER,
  opponent_h1 INTEGER,
  opponent_h2 INTEGER,
  ot_periods INTEGER DEFAULT 0,
  venue TEXT,
  venue_city TEXT,
  broadcast TEXT,
  attendance INTEGER,
  opp_ranking INTEGER,
  wi_ranking INTEGER,
  wi_record TEXT,
  wi_fg TEXT,
  wi_3pt TEXT,
  wi_ft TEXT,
  wi_rebounds INTEGER,
  wi_turnovers INTEGER,
  wi_fg_pct REAL,
  wi_3pt_pct REAL,
  wi_ft_pct REAL,
  opp_fg TEXT,
  opp_3pt TEXT,
  opp_ft TEXT,
  opp_rebounds INTEGER,
  opp_turnovers INTEGER,
  opp_fg_pct REAL,
  opp_3pt_pct REAL,
  opp_ft_pct REAL,
  wi_leader_pts_name TEXT,
  wi_leader_pts_value TEXT,
  wi_leader_reb_name TEXT,
  wi_leader_reb_value TEXT,
  wi_leader_ast_name TEXT,
  wi_leader_ast_value TEXT,
  fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vest_stats_espn ON vest_game_stats(espn_event_id);
CREATE INDEX IF NOT EXISTS idx_vest_stats_game ON vest_game_stats(game_id);
