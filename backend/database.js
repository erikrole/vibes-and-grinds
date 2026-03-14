require('dotenv').config();

// For simplicity in v1, using SQLite
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let db;

async function initDatabase() {
  db = await open({
    filename: './vibes-and-grinds.db',
    driver: sqlite3.Database
  });

  // Create tables
  await db.exec(`
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
    CREATE INDEX IF NOT EXISTS idx_sport ON coffee_visits(sport);
    CREATE INDEX IF NOT EXISTS idx_shop_name ON coffee_visits(coffee_shop_name);

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
  `);

  // Lightweight migrations for older local databases
  const columns = await db.all('PRAGMA table_info(coffee_visits)');
  const columnNames = new Set(columns.map((column) => column.name));

  const missingColumns = [
    { name: 'city', ddl: 'ALTER TABLE coffee_visits ADD COLUMN city TEXT' },
    { name: 'opponent', ddl: 'ALTER TABLE coffee_visits ADD COLUMN opponent TEXT' },
    { name: 'sport', ddl: 'ALTER TABLE coffee_visits ADD COLUMN sport TEXT' },
    { name: 'photo_url', ddl: 'ALTER TABLE coffee_visits ADD COLUMN photo_url TEXT' },
  ];

  for (const column of missingColumns) {
    if (!columnNames.has(column.name)) {
      await db.exec(column.ddl);
    }
  }

  console.log('Database initialized successfully');
  return db;
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

module.exports = { initDatabase, getDatabase };
