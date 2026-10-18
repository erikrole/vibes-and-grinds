const express = require('express');
const cors = require('cors');
const { initDatabase, getDatabase } = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const DEFAULT_NET_RANKINGS_URL = 'https://www.warrennolan.com/basketball/2026/net';
const WISCONSIN_TEAM_ID = '275';
const ESPN_SCHEDULE_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams';
const ESPN_SUMMARY_BASE = 'https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary';
const FETCH_TIMEOUT_MS = 10000;

let scoreWritesModulePromise;
let espnModulePromise;
let httpModulePromise;
let netModulePromise;
let gameSyncModulePromise;
let scoresMemoryCheckedAt = 0;

function loadScoreWrites() {
  if (!scoreWritesModulePromise) {
    scoreWritesModulePromise = import('../functions/api/vest/_scoreWrites.js');
  }
  return scoreWritesModulePromise;
}

function loadEspn() {
  if (!espnModulePromise) espnModulePromise = import('../functions/api/vest/_espn.js');
  return espnModulePromise;
}

function loadHttp() {
  if (!httpModulePromise) httpModulePromise = import('../functions/api/_http.js');
  return httpModulePromise;
}

function loadNetParse() {
  if (!netModulePromise) netModulePromise = import('../functions/api/vest/_netParse.js');
  return netModulePromise;
}

function loadGameSync() {
  if (!gameSyncModulePromise) gameSyncModulePromise = import('../functions/api/vest/_gameSync.js');
  return gameSyncModulePromise;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '256kb' }));

// Initialize database then start listening — prevents requests arriving before db is ready
let db;
initDatabase()
  .then((database) => {
    db = database;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// Routes


// ── Shared helpers ──

function isIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Validate the required fields for a coffee visit.
 * Returns an error string if invalid, or null if valid.
 */
function validateVisit({ date, coffee_shop_name, vibe_rating, coffee_rating }) {
  if (!date || !String(date).trim()) return 'Date is required';
  if (!isIsoDate(date)) return 'Date must be a real YYYY-MM-DD day';
  if (!coffee_shop_name || !String(coffee_shop_name).trim()) return 'Coffee shop name is required';

  // Coerce before range-checking: a string like "abc" passes `< 0 || > 10`
  // (both false) and would only fail later on the column's CHECK constraint.
  for (const [label, value] of [['Vibe', vibe_rating], ['Coffee', coffee_rating]]) {
    const num = Number(value);
    if (value === undefined || value === null || value === '' || !Number.isFinite(num)) {
      return `${label} rating is required`;
    }
    if (num < 0 || num > 10) return `${label} rating must be between 0 and 10`;
  }

  return null;
}

function normalizeOptionalText(value) {
  return (value || '').trim() || null;
}

// Only 'home' (around Madison) and 'road' are valid; anything else falls back to 'road'.
function normalizeVisitType(value) {
  return value === 'home' ? 'home' : 'road';
}

/**
 * Fetch a URL with an AbortController timeout.
 * Returns the fetch Response. Caller is responsible for checking response.ok.
 */
function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// Get all coffee visits
app.get('/api/visits', async (req, res) => {
  try {
    const visits = await db.all(
      'SELECT * FROM coffee_visits ORDER BY date DESC, created_at DESC'
    );
    res.json(visits);
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

// Get a single visit
app.get('/api/visits/:id', async (req, res) => {
  try {
    const visit = await db.get(
      'SELECT * FROM coffee_visits WHERE id = ?',
      [req.params.id]
    );
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    res.json(visit);
  } catch (error) {
    console.error('Error fetching visit:', error);
    res.status(500).json({ error: 'Failed to fetch visit' });
  }
});

// Create a new visit
app.post('/api/visits', async (req, res) => {
  try {
    const {
      date,
      coffee_shop_name,
      city,
      opponent,
      sport,
      visit_type,
      coffee_shop_address,
      coffee_shop_place_id,
      coffee_shop_lat,
      coffee_shop_lng,
      coffee_order,
      vibe_rating,
      coffee_rating,
      notes,
      photo_url
    } = req.body;

    const cleanDate = String(date ?? '').trim();
    const trimmedName = String(coffee_shop_name ?? '').trim();
    const validationError = validateVisit({
      date: cleanDate,
      coffee_shop_name: trimmedName,
      vibe_rating,
      coffee_rating,
    });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { optionalCoord } = await loadHttp();
    const result = await db.run(
      `INSERT INTO coffee_visits (
        date, coffee_shop_name, city, opponent, sport, visit_type, coffee_shop_address, coffee_shop_place_id,
        coffee_shop_lat, coffee_shop_lng, coffee_order, vibe_rating, coffee_rating, notes, photo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanDate,
        trimmedName,
        normalizeOptionalText(city),
        normalizeOptionalText(opponent),
        sport || null,
        normalizeVisitType(visit_type),
        coffee_shop_address || null,
        coffee_shop_place_id || null,
        optionalCoord(coffee_shop_lat),
        optionalCoord(coffee_shop_lng),
        normalizeOptionalText(coffee_order),
        Number(vibe_rating),
        Number(coffee_rating),
        normalizeOptionalText(notes),
        photo_url || null
      ]
    );

    const newVisit = await db.get(
      'SELECT * FROM coffee_visits WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json(newVisit);
  } catch (error) {
    console.error('Error creating visit:', error);
    res.status(500).json({ error: 'Failed to create visit' });
  }
});

// Update a visit
app.put('/api/visits/:id', async (req, res) => {
  try {
    const {
      date,
      coffee_shop_name,
      city,
      opponent,
      sport,
      visit_type,
      coffee_shop_address,
      coffee_shop_place_id,
      coffee_shop_lat,
      coffee_shop_lng,
      coffee_order,
      vibe_rating,
      coffee_rating,
      notes,
      photo_url
    } = req.body;

    const cleanDate = String(date ?? '').trim();
    const trimmedName = String(coffee_shop_name ?? '').trim();
    const validationError = validateVisit({
      date: cleanDate,
      coffee_shop_name: trimmedName,
      vibe_rating,
      coffee_rating,
    });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { optionalCoord } = await loadHttp();
    const updateResult = await db.run(
      `UPDATE coffee_visits SET
        date = ?, coffee_shop_name = ?, city = ?, opponent = ?, sport = ?, visit_type = ?, coffee_shop_address = ?,
        coffee_shop_place_id = ?, coffee_shop_lat = ?, coffee_shop_lng = ?,
        coffee_order = ?, vibe_rating = ?, coffee_rating = ?, notes = ?, photo_url = ?
      WHERE id = ?`,
      [
        cleanDate,
        trimmedName,
        normalizeOptionalText(city),
        normalizeOptionalText(opponent),
        sport || null,
        normalizeVisitType(visit_type),
        coffee_shop_address || null,
        coffee_shop_place_id || null,
        optionalCoord(coffee_shop_lat),
        optionalCoord(coffee_shop_lng),
        normalizeOptionalText(coffee_order),
        Number(vibe_rating),
        Number(coffee_rating),
        normalizeOptionalText(notes),
        photo_url || null,
        req.params.id
      ]
    );

    if (updateResult.changes === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const updatedVisit = await db.get(
      'SELECT * FROM coffee_visits WHERE id = ?',
      [req.params.id]
    );

    res.json(updatedVisit);
  } catch (error) {
    console.error('Error updating visit:', error);
    res.status(500).json({ error: 'Failed to update visit' });
  }
});

// Delete a visit
app.delete('/api/visits/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM coffee_visits WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting visit:', error);
    res.status(500).json({ error: 'Failed to delete visit' });
  }
});

// Get dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.get(`
      SELECT
        COUNT(*) as total_visits,
        ROUND(AVG(vibe_rating), 2) as avg_vibe,
        ROUND(AVG(coffee_rating), 2) as avg_coffee,
        ROUND(AVG(composite_score), 2) as avg_composite,
        MAX(composite_score) as best_composite
      FROM coffee_visits
    `);

    const topShops = await db.all(`
      SELECT
        coffee_shop_name,
        COUNT(*) as visit_count,
        ROUND(AVG(composite_score), 2) as avg_composite
      FROM coffee_visits
      GROUP BY coffee_shop_name
      ORDER BY avg_composite DESC
      LIMIT 5
    `);

    res.json({ ...stats, topShops });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});



app.get('/api/vest/games', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT game_id, date, location, opponent, ranking, outfit, result, overtime
      FROM vest_games
      ORDER BY date ASC, game_id ASC
    `);

    const games = rows.map((row) => ({
      id: row.game_id,
      date: row.date,
      location: row.location || 'vs',
      opponent: row.opponent,
      ranking: row.ranking,
      outfit: row.outfit || '',
      result: row.result || '',
      overtime: Boolean(row.overtime),
    }));

    return res.json({ games });
  } catch (error) {
    console.error('Error fetching vest games:', error);
    return res.status(500).json({ error: 'Failed to fetch vest games' });
  }
});

app.put('/api/vest/games', async (req, res) => {
  const incoming = Array.isArray(req.body?.games) ? req.body.games : null;
  if (!incoming) {
    return res.status(400).json({ error: 'Invalid payload. Expected { games: [] }' });
  }

  try {
    const { planVestGameSync } = await loadGameSync();
    const existing = await db.all(`
      SELECT game_id, date, location, opponent, ranking, outfit, result, overtime
      FROM vest_games
    `);
    const plan = planVestGameSync(existing, incoming);
    if (plan.error) return res.status(400).json({ error: plan.error });

    if (!plan.inserts.length && !plan.updates.length && !plan.deletes.length) {
      return res.json({ success: true, saved: plan.saved, skipped: plan.skipped });
    }

    await db.exec('BEGIN TRANSACTION');
    try {
      for (const gameId of plan.deletes) {
        await db.run('DELETE FROM vest_games WHERE game_id = ?', [gameId]);
      }
      for (const game of plan.updates) {
        await db.run(`
          UPDATE vest_games SET
            date = ?, location = ?, opponent = ?, ranking = ?, outfit = ?, result = ?, overtime = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE game_id = ?
        `, [
          game.date, game.location, game.opponent, game.ranking,
          game.outfit, game.result, game.overtime, game.gameId,
        ]);
      }
      for (const game of plan.inserts) {
        await db.run(`
          INSERT INTO vest_games (game_id, date, location, opponent, ranking, outfit, result, overtime, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          game.gameId, game.date, game.location, game.opponent, game.ranking,
          game.outfit, game.result, game.overtime,
        ]);
      }
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }

    return res.json({ success: true, saved: plan.saved, skipped: plan.skipped });
  } catch (error) {
    console.error('Error syncing vest games:', error);
    return res.status(500).json({ error: 'Failed to sync vest games' });
  }
});

app.get('/api/vest/schedule', async (req, res) => {
  const { readSeason } = await loadHttp();
  const season = readSeason(req.query.season);
  if (!season) return res.status(400).json({ error: 'Season must be a 4-digit year' });

  try {
    const { scheduleGame } = await loadEspn();
    const response = await fetchWithTimeout(
      `${ESPN_SCHEDULE_BASE}/${WISCONSIN_TEAM_ID}/schedule?season=${encodeURIComponent(season)}`
    );

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch schedule from ESPN', status: response.status });
    }

    const data = await response.json();
    const events = Array.isArray(data?.events) ? data.events : [];
    const games = events.map((event) => scheduleGame(event)).filter(Boolean);

    res.json({ season, source: 'ESPN', games });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    console.error('Error fetching vest schedule:', error);
    res.status(502).json({
      error: timedOut ? 'Schedule request timed out' : 'Failed to fetch vest schedule',
      details: timedOut ? 'ESPN did not respond in time.' : error.message,
    });
  }
});


// ── ESPN Scores: fetch schedule + scores and cache in vest_game_stats ──

app.get('/api/vest/scores', async (req, res) => {
  const { readSeason } = await loadHttp();
  const season = readSeason(req.query.season);
  if (!season) return res.status(400).json({ error: 'Season must be a 4-digit year' });

  const mergedQuery = `
    SELECT s.*, v.outfit, v.game_id, v.opponent, v.date, v.location, v.result, v.overtime
    FROM vest_game_stats s
    LEFT JOIN vest_games v ON v.espn_event_id = s.espn_event_id
    ORDER BY v.date ASC, s.id ASC
  `;

  try {
    const {
      newestFetchedAtMs,
      planScoreSync,
      SCORE_CACHE_TTL_MS,
      shouldServeCachedScores,
    } = await loadScoreWrites();
    const { parseEspnEvent } = await loadEspn();

    let cached = [];
    try {
      cached = await db.all(mergedQuery);
    } catch {
      cached = [];
    }

    if (shouldServeCachedScores({
      rowCount: cached.length,
      newestFetchedAtMs: newestFetchedAtMs(cached),
      memoryCheckedAtMs: scoresMemoryCheckedAt,
      now: Date.now(),
      ttlMs: SCORE_CACHE_TTL_MS,
    })) {
      return res.json({ games: cached, source: 'cache' });
    }

    // Fetch fresh from ESPN
    const response = await fetchWithTimeout(
      `${ESPN_SCHEDULE_BASE}/${WISCONSIN_TEAM_ID}/schedule?season=${encodeURIComponent(season)}`
    );

    if (!response.ok) {
      if (cached.length) return res.json({ games: cached, source: 'cache' });
      return res.status(502).json({ error: 'ESPN unavailable', status: response.status });
    }

    const data = await response.json();
    const events = Array.isArray(data?.events) ? data.events : [];
    const parsed = events.map((event) => parseEspnEvent(event)).filter(Boolean);

    const vestGameRows = await db.all(
      'SELECT game_id, date, espn_event_id FROM vest_games ORDER BY game_id ASC'
    );
    const existingStats = await db.all('SELECT * FROM vest_game_stats');
    const plan = planScoreSync({
      vestRows: vestGameRows,
      existingStats,
      games: parsed,
    });

    for (const clear of plan.clears) {
      await db.run(
        'UPDATE vest_games SET espn_event_id = NULL WHERE espn_event_id = ? AND game_id != ?',
        [clear.espnEventId, clear.gameId]
      );
    }
    for (const link of plan.links) {
      await db.run(
        'UPDATE vest_games SET espn_event_id = ? WHERE game_id = ?',
        [link.espnEventId, link.gameId]
      );
    }
    for (const { game, gameId } of plan.upserts) {
      await db.run(`
        INSERT INTO vest_game_stats (
          espn_event_id, game_id, wisconsin_score, opponent_score,
          wisconsin_h1, wisconsin_h2, opponent_h1, opponent_h2,
          ot_periods, venue, venue_city, broadcast, attendance,
          opp_ranking, wi_ranking, wi_record, fetched_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(espn_event_id) DO UPDATE SET
          game_id = excluded.game_id,
          wisconsin_score = excluded.wisconsin_score,
          opponent_score = excluded.opponent_score,
          wisconsin_h1 = excluded.wisconsin_h1,
          wisconsin_h2 = excluded.wisconsin_h2,
          opponent_h1 = excluded.opponent_h1,
          opponent_h2 = excluded.opponent_h2,
          ot_periods = excluded.ot_periods,
          venue = excluded.venue,
          venue_city = excluded.venue_city,
          broadcast = excluded.broadcast,
          attendance = excluded.attendance,
          opp_ranking = excluded.opp_ranking,
          wi_ranking = excluded.wi_ranking,
          wi_record = excluded.wi_record,
          fetched_at = CURRENT_TIMESTAMP
      `, [
        game.espnEventId, gameId,
        game.wisconsinScore, game.opponentScore,
        game.wisconsinH1, game.wisconsinH2, game.opponentH1, game.opponentH2,
        game.otPeriods, game.venue, game.venueCity, game.broadcast, game.attendance,
        game.oppRanking, game.wiRanking, game.wiRecord,
      ]);
    }

    scoresMemoryCheckedAt = Date.now();

    // Re-fetch merged data
    const merged = await db.all(`
      SELECT s.*, v.outfit, v.game_id, v.opponent, v.date, v.location, v.result, v.overtime
      FROM vest_game_stats s
      LEFT JOIN vest_games v ON v.espn_event_id = s.espn_event_id
      ORDER BY v.date ASC, s.id ASC
    `);

    res.json({ games: merged, source: 'espn' });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    console.error('Error fetching vest scores:', error);

    // Fallback to cache
    try {
      const cached = await db.all(`
        SELECT s.*, v.outfit, v.game_id, v.opponent, v.date, v.location, v.result, v.overtime
        FROM vest_game_stats s
        LEFT JOIN vest_games v ON v.espn_event_id = s.espn_event_id
        ORDER BY v.date ASC, s.id ASC
      `);
      if (cached.length) return res.json({ games: cached, source: 'cache' });
    } catch (cacheErr) {
      console.error('Error reading score cache fallback:', cacheErr);
    }

    res.status(502).json({
      error: timedOut ? 'ESPN request timed out' : 'Failed to fetch scores',
      details: timedOut ? 'ESPN did not respond in time.' : error.message,
    });
  }
});

// ── ESPN Game Summary: box scores + player leaders for a single game ──
app.get('/api/vest/game-stats/:eventId', async (req, res) => {
  const { readEventId } = await loadHttp();
  const eventId = readEventId(req.params.eventId);
  if (!eventId) return res.status(400).json({ error: 'Event id must be numeric' });

  try {
    const { boxScoreCacheHit, boxScoreNeedsWrite, keepStoredBoxScore } = await loadScoreWrites();
    const { parseBoxScore } = await loadEspn();
    const cached = await db.get(
      'SELECT * FROM vest_game_stats WHERE espn_event_id = ?',
      [eventId]
    );

    if (boxScoreCacheHit(cached)) {
      return res.json({ stats: cached, source: 'cache' });
    }

    const response = await fetchWithTimeout(
      `${ESPN_SUMMARY_BASE}?event=${encodeURIComponent(eventId)}`
    );

    if (!response.ok) {
      if (cached) return res.json({ stats: cached, source: 'cache-partial' });
      return res.status(502).json({ error: 'ESPN summary unavailable' });
    }

    const summary = await response.json();
    const updates = parseBoxScore(summary);
    if (!updates) {
      if (cached) return res.json({ stats: cached, source: 'cache-partial' });
      return res.status(502).json({ error: 'ESPN summary unavailable' });
    }

    if (!boxScoreNeedsWrite(cached, updates)) {
      return res.json({ stats: cached || updates, source: cached ? 'cache-partial' : 'espn' });
    }

    const merged = keepStoredBoxScore(cached, updates);
    await db.run(`
      UPDATE vest_game_stats SET
        wi_fg = COALESCE(?, wi_fg), wi_3pt = COALESCE(?, wi_3pt), wi_ft = COALESCE(?, wi_ft),
        wi_rebounds = COALESCE(?, wi_rebounds), wi_turnovers = COALESCE(?, wi_turnovers),
        wi_fg_pct = COALESCE(?, wi_fg_pct), wi_3pt_pct = COALESCE(?, wi_3pt_pct), wi_ft_pct = COALESCE(?, wi_ft_pct),
        opp_fg = COALESCE(?, opp_fg), opp_3pt = COALESCE(?, opp_3pt), opp_ft = COALESCE(?, opp_ft),
        opp_rebounds = COALESCE(?, opp_rebounds), opp_turnovers = COALESCE(?, opp_turnovers),
        opp_fg_pct = COALESCE(?, opp_fg_pct), opp_3pt_pct = COALESCE(?, opp_3pt_pct), opp_ft_pct = COALESCE(?, opp_ft_pct),
        wi_leader_pts_name = COALESCE(?, wi_leader_pts_name), wi_leader_pts_value = COALESCE(?, wi_leader_pts_value),
        wi_leader_reb_name = COALESCE(?, wi_leader_reb_name), wi_leader_reb_value = COALESCE(?, wi_leader_reb_value),
        wi_leader_ast_name = COALESCE(?, wi_leader_ast_name), wi_leader_ast_value = COALESCE(?, wi_leader_ast_value),
        wisconsin_h1 = COALESCE(?, wisconsin_h1), wisconsin_h2 = COALESCE(?, wisconsin_h2),
        opponent_h1 = COALESCE(?, opponent_h1), opponent_h2 = COALESCE(?, opponent_h2),
        ot_periods = COALESCE(?, ot_periods),
        fetched_at = CURRENT_TIMESTAMP
      WHERE espn_event_id = ?
    `, [
      merged.wi_fg, merged.wi_3pt, merged.wi_ft, merged.wi_rebounds, merged.wi_turnovers,
      merged.wi_fg_pct, merged.wi_3pt_pct, merged.wi_ft_pct,
      merged.opp_fg, merged.opp_3pt, merged.opp_ft, merged.opp_rebounds, merged.opp_turnovers,
      merged.opp_fg_pct, merged.opp_3pt_pct, merged.opp_ft_pct,
      merged.wi_leader_pts_name, merged.wi_leader_pts_value,
      merged.wi_leader_reb_name, merged.wi_leader_reb_value,
      merged.wi_leader_ast_name, merged.wi_leader_ast_value,
      merged.wisconsin_h1, merged.wisconsin_h2, merged.opponent_h1, merged.opponent_h2,
      merged.ot_periods,
      eventId,
    ]);

    const final = await db.get(
      'SELECT * FROM vest_game_stats WHERE espn_event_id = ?',
      [eventId]
    );

    res.json({ stats: final || { ...cached, ...updates }, source: 'espn' });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    console.error('Error fetching game stats:', error);
    res.status(502).json({
      error: timedOut ? 'ESPN summary timed out' : 'Failed to fetch game stats',
    });
  }
});

app.get('/api/vest/net-rankings', async (req, res) => {
  const netRankingsUrl = process.env.NET_RANKINGS_URL || DEFAULT_NET_RANKINGS_URL;

  try {
    const response = await fetchWithTimeout(netRankingsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; vibes-and-grinds/1.0)',
      },
    });

    if (!response.ok) {
      return res.status(502).json({
        error: 'Failed to fetch NET rankings from upstream source.',
        status: response.status,
      });
    }

    const contentType = response.headers.get('content-type') || '';

    const {
      itemsFromRankingPayload,
      parseGenericRankingsTable,
      rankingsFromItems,
    } = await loadNetParse();

    let rankings = [];
    if (contentType.includes('text/html')) {
      rankings = parseGenericRankingsTable(await response.text());
    } else {
      const data = await response.json();
      if (data?.netRankings && Array.isArray(data.rankings)) return res.json(data);
      rankings = rankingsFromItems(itemsFromRankingPayload(data));
    }

    if (!rankings.length) {
      return res.status(502).json({
        error: 'Failed to parse NET rankings from upstream source.',
      });
    }

    const netRankings = Object.fromEntries(
      rankings.map((entry) => [entry.team, entry.rank])
    );

    return res.json({ rankings, netRankings, source: 'WarrenNolan' });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    console.error('Error fetching vest NET rankings:', error);
    return res.status(502).json({
      error: timedOut ? 'NET rankings request timed out' : 'Failed to fetch vest NET rankings',
      details: timedOut ? 'Upstream NET feed did not respond in time.' : error.message,
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});


function buildPlacesErrorResponse(prefix, upstreamStatus, payloadText) {
  let parsed;

  try {
    parsed = JSON.parse(payloadText || '{}');
  } catch {
    parsed = null;
  }

  const googleStatus = parsed?.error?.status || '';
  const googleMessage = parsed?.error?.message || '';

  if (googleStatus === 'PERMISSION_DENIED' || googleStatus === 'REQUEST_DENIED') {
    return {
      error: `${prefix}: Google denied the request. Confirm billing is active and Places API (New) is enabled for this project.`,
      details: googleMessage || 'Permission denied by Google Places.',
      googleStatus,
      upstreamStatus,
    };
  }

  if (googleStatus === 'RESOURCE_EXHAUSTED') {
    return {
      error: `${prefix}: Google quota is exhausted.`,
      details: googleMessage || 'Quota exceeded for Google Places.',
      googleStatus,
      upstreamStatus,
    };
  }

  return {
    error: `${prefix}: Google Places is unavailable right now.`,
    details: googleMessage || payloadText || 'Unknown Google Places error.',
    googleStatus,
    upstreamStatus,
  };
}

const PLACES_MIN_INPUT_LENGTH = 3;
const PLACES_CACHE_LIMIT = 50;
const PLACES_CACHE_TTL_MS = 10 * 60 * 1000;
const PLACES_SESSION_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const placesSuggestionCache = new Map();

function readPlacesSessionToken(value) {
  const token = `${value || ''}`.trim();
  return PLACES_SESSION_TOKEN_PATTERN.test(token) ? token : '';
}

function readPlacesSuggestionCache(input) {
  const entry = placesSuggestionCache.get(input);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > PLACES_CACHE_TTL_MS) {
    placesSuggestionCache.delete(input);
    return null;
  }

  placesSuggestionCache.delete(input);
  placesSuggestionCache.set(input, entry);
  return entry.suggestions;
}

function writePlacesSuggestionCache(input, suggestions) {
  if (placesSuggestionCache.has(input)) placesSuggestionCache.delete(input);
  placesSuggestionCache.set(input, { suggestions, cachedAt: Date.now() });
  while (placesSuggestionCache.size > PLACES_CACHE_LIMIT) {
    const oldest = placesSuggestionCache.keys().next().value;
    placesSuggestionCache.delete(oldest);
  }
}

app.get('/api/places-autocomplete', async (req, res) => {
  const input = `${req.query.input || ''}`.trim();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return res.status(503).json({ error: 'Google Places is not configured on the server.' });
  }

  const { MAX_PLACES_INPUT } = await loadHttp();
  if (input.length > MAX_PLACES_INPUT) {
    return res.status(400).json({ error: `Search must be ${MAX_PLACES_INPUT} characters or fewer` });
  }

  if (input.length < PLACES_MIN_INPUT_LENGTH) {
    return res.json({ suggestions: [] });
  }

  const cachedSuggestions = readPlacesSuggestionCache(input);
  if (cachedSuggestions) {
    return res.json({ suggestions: cachedSuggestions });
  }

  const sessionToken = readPlacesSessionToken(req.query.sessionToken);

  try {
    const response = await fetchWithTimeout('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: ['cafe', 'coffee_shop', 'restaurant'],
        ...(sessionToken ? { sessionToken } : {}),
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      const errorPayload = buildPlacesErrorResponse('Autocomplete failed', response.status, details);
      console.error('Places autocomplete failed:', errorPayload);
      return res.status(502).json(errorPayload);
    }

    const data = await response.json();
    const suggestions = (data?.suggestions || [])
      .map((item) => {
        const prediction = item.placePrediction;
        if (!prediction?.placeId) return null;

        return {
          placeId: prediction.placeId,
          mainText: prediction.structuredFormat?.mainText?.text || prediction.text?.text || '',
          secondaryText: prediction.structuredFormat?.secondaryText?.text || '',
        };
      })
      .filter(Boolean);

    writePlacesSuggestionCache(input, suggestions);

    return res.json({ suggestions });
  } catch (error) {
    console.error('Error fetching places autocomplete:', error);
    return res.status(500).json({
      error: 'Autocomplete failed: Unable to reach Google Places.',
      details: error.message,
    });
  }
});

app.get('/api/places-details', async (req, res) => {
  const { readPlaceId } = await loadHttp();
  const place = readPlaceId(req.query.placeId);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return res.status(503).json({ error: 'Google Places is not configured on the server.' });
  }

  if (place.error) {
    return res.status(place.status).json({ error: place.error });
  }
  const placeId = place.id;

  const sessionToken = readPlacesSessionToken(req.query.sessionToken);
  const detailsUrl = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  if (sessionToken) detailsUrl.searchParams.set('sessionToken', sessionToken);

  try {
    const response = await fetchWithTimeout(detailsUrl, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
      },
    });

    if (!response.ok) {
      const details = await response.text();
      const errorPayload = buildPlacesErrorResponse('Place details failed', response.status, details);
      console.error('Place details failed:', errorPayload);
      return res.status(502).json(errorPayload);
    }

    const data = await response.json();

    return res.json({
      place: {
        name: data.displayName?.text || '',
        address: data.formattedAddress || '',
        place_id: data.id || placeId,
        lat: data.location?.latitude ?? '',
        lng: data.location?.longitude ?? '',
      },
    });
  } catch (error) {
    console.error('Error fetching place details:', error);
    return res.status(500).json({
      error: 'Place details failed: Unable to reach Google Places.',
      details: error.message,
    });
  }
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  if (err instanceof SyntaxError || err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  return next(err);
});
