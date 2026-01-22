const { Pool } = require('pg');
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
      coffee_shop_address TEXT,
      coffee_shop_place_id TEXT,
      coffee_shop_lat REAL,
      coffee_shop_lng REAL,
      coffee_order TEXT,
      vibe_rating REAL NOT NULL CHECK(vibe_rating >= 0 AND vibe_rating <= 10),
      coffee_rating REAL NOT NULL CHECK(coffee_rating >= 0 AND coffee_rating <= 10),
      composite_score REAL GENERATED ALWAYS AS (vibe_rating + coffee_rating) STORED,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_date ON coffee_visits(date DESC);
    CREATE INDEX IF NOT EXISTS idx_composite ON coffee_visits(composite_score DESC);
  `);

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
