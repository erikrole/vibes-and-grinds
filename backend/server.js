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

// Middleware
app.use(cors());
app.use(express.json());

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


function stripHtmlTags(value = '') {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNetRankingsHtml(html = '') {
  const rankings = [];

  if (!html) return rankings;

  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = html.match(tableRegex);
  if (!tables || tables.length === 0) return rankings;

  const netTable = tables.reduce((best, table) => {
    const bestRows = (best.match(/<tr/gi) || []).length;
    const tableRows = (table.match(/<tr/gi) || []).length;
    return tableRows > bestRows ? table : best;
  });

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [...netTable.matchAll(rowRegex)];

  for (let i = 1; i < rows.length; i++) {
    const rowHtml = rows[i][1] || '';
    if (rowHtml.includes('<th')) continue;

    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [...rowHtml.matchAll(cellRegex)].map((cellMatch) => stripHtmlTags(cellMatch[1]));
    if (cells.length < 2) continue;

    const rank = Number.parseInt(cells[0], 10);
    const team = (cells[1] || '').trim();

    if (!Number.isFinite(rank) || !team) continue;

    // Scan remaining cells for a W-L record pattern
    let record = null;
    for (let c = 2; c < cells.length; c++) {
      if (/^\d+-\d+$/.test(cells[c])) {
        record = cells[c];
        break;
      }
    }

    rankings.push({ team, rank, record });
  }

  return rankings;
}

// ── Shared helpers ──

/**
 * Validate the required fields for a coffee visit.
 * Returns an error string if invalid, or null if valid.
 */
function validateVisit({ date, coffee_shop_name, vibe_rating, coffee_rating }) {
  if (!date || !coffee_shop_name || vibe_rating === undefined || coffee_rating === undefined) {
    return 'Missing required fields';
  }
  if (vibe_rating < 0 || vibe_rating > 10 || coffee_rating < 0 || coffee_rating > 10) {
    return 'Ratings must be between 0 and 10';
  }
  if (!(coffee_shop_name || '').trim()) {
    return 'Coffee shop name cannot be empty';
  }
  return null;
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

    const validationError = validateVisit({ date, coffee_shop_name, vibe_rating, coffee_rating });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const trimmedName = coffee_shop_name.trim();

    const result = await db.run(
      `INSERT INTO coffee_visits (
        date, coffee_shop_name, city, opponent, sport, coffee_shop_address, coffee_shop_place_id,
        coffee_shop_lat, coffee_shop_lng, coffee_order, vibe_rating, coffee_rating, notes, photo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        date,
        trimmedName,
        (city || '').trim() || null,
        (opponent || '').trim() || null,
        sport || null,
        coffee_shop_address || null,
        coffee_shop_place_id || null,
        coffee_shop_lat,
        coffee_shop_lng,
        (coffee_order || '').trim() || null,
        vibe_rating,
        coffee_rating,
        (notes || '').trim() || null,
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

    const validationError = validateVisit({ date, coffee_shop_name, vibe_rating, coffee_rating });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const trimmedName = coffee_shop_name.trim();

    const updateResult = await db.run(
      `UPDATE coffee_visits SET
        date = ?, coffee_shop_name = ?, city = ?, opponent = ?, sport = ?, coffee_shop_address = ?,
        coffee_shop_place_id = ?, coffee_shop_lat = ?, coffee_shop_lng = ?,
        coffee_order = ?, vibe_rating = ?, coffee_rating = ?, notes = ?, photo_url = ?
      WHERE id = ?`,
      [
        date,
        trimmedName,
        (city || '').trim() || null,
        (opponent || '').trim() || null,
        sport || null,
        coffee_shop_address || null,
        coffee_shop_place_id || null,
        coffee_shop_lat,
        coffee_shop_lng,
        (coffee_order || '').trim() || null,
        vibe_rating,
        coffee_rating,
        (notes || '').trim() || null,
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
    await db.exec('BEGIN TRANSACTION');
    await db.run('DELETE FROM vest_games');

    const stmt = await db.prepare(`
      INSERT INTO vest_games (game_id, date, location, opponent, ranking, outfit, result, overtime, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    let skipped = 0;
    try {
      for (const game of incoming) {
        const gameId = Number.parseInt(game.id, 10);
        const ranking = game.ranking === null || game.ranking === '' || game.ranking === undefined
          ? null
          : Number.parseInt(game.ranking, 10);

        if (!Number.isFinite(gameId) || !`${game.opponent || ''}`.trim()) {
          skipped++;
          continue;
        }

        await stmt.run([
          gameId,
          game.date || null,
          game.location || 'vs',
          `${game.opponent}`.trim(),
          Number.isFinite(ranking) ? ranking : null,
          `${game.outfit || ''}`.trim(),
          game.result || '',
          game.overtime ? 1 : 0,
        ]);
      }
    } finally {
      await stmt.finalize();
    }

    await db.exec('COMMIT');
    return res.json({ success: true, saved: incoming.length - skipped, skipped });
  } catch (error) {
    await db.exec('ROLLBACK');
    console.error('Error syncing vest games:', error);
    return res.status(500).json({ error: 'Failed to sync vest games' });
  }
});

app.get('/api/vest/schedule', async (req, res) => {
  const season = String(req.query.season || '2025');
  const teamId = '275'; // Wisconsin

  try {
    const response = await fetchWithTimeout(
      `${ESPN_SCHEDULE_BASE}/${teamId}/schedule?season=${season}`
    );

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch schedule from ESPN', status: response.status });
    }

    const data = await response.json();
    const events = Array.isArray(data.events) ? data.events : [];

    const games = events.map((event) => {
      const competition = event.competitions?.[0] || {};
      const competitors = competition.competitors || [];
      const badgers = competitors.find((c) => String(c.team?.id) === teamId);
      const opponent = competitors.find((c) => String(c.team?.id) !== teamId);

      const location = badgers?.homeAway === 'away' ? '@' : 'vs';
      const isCompleted = competition.status?.type?.completed;
      const overtime = (competition.status?.type?.description || '').toUpperCase().includes('OT');

      let result = '';
      if (isCompleted && badgers && opponent) {
        const badgersScore = Number(badgers.score);
        const opponentScore = Number(opponent.score);
        if (Number.isFinite(badgersScore) && Number.isFinite(opponentScore)) {
          result = badgersScore > opponentScore ? 'W' : 'L';
        }
      }

      return {
        date: event.date,
        opponent: opponent?.team?.displayName || event.shortName || 'TBD',
        location,
        result,
        overtime,
        completed: Boolean(isCompleted),
      };
    });

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

function parseFloat2(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}

function extractTeamStat(stats, label) {
  if (!Array.isArray(stats)) return null;
  const entry = stats.find((s) => s.label === label || s.abbreviation === label);
  return entry?.displayValue || null;
}

function extractTeamStatNum(stats, label) {
  const val = extractTeamStat(stats, label);
  if (!val) return null;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : null;
}

function parseEspnEvent(event) {
  const competition = event.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const badgers = competitors.find((c) => String(c.team?.id) === WISCONSIN_TEAM_ID);
  const opponent = competitors.find((c) => String(c.team?.id) !== WISCONSIN_TEAM_ID);
  if (!badgers || !opponent) return null;

  const isCompleted = competition.status?.type?.completed;
  const statusDesc = competition.status?.type?.description || '';

  const wiScore = Number(badgers.score);
  const oppScore = Number(opponent.score);

  const wiLinescores = Array.isArray(badgers.linescores) ? badgers.linescores : [];
  const oppLinescores = Array.isArray(opponent.linescores) ? opponent.linescores : [];

  const otPeriods = Math.max(0, wiLinescores.length - 2);

  const venue = competition.venue;
  const broadcasts = competition.broadcasts || [];
  const broadcastName = broadcasts[0]?.names?.[0] || broadcasts[0]?.name || null;

  return {
    espnEventId: String(event.id),
    date: event.date,
    opponentName: opponent.team?.displayName || 'TBD',
    location: badgers.homeAway === 'away' ? '@' : (competition.neutralSite ? 'N' : 'vs'),
    completed: Boolean(isCompleted),
    overtime: statusDesc.toUpperCase().includes('OT'),
    result: isCompleted && Number.isFinite(wiScore) && Number.isFinite(oppScore)
      ? (wiScore > oppScore ? 'W' : 'L') : '',
    wisconsinScore: Number.isFinite(wiScore) ? wiScore : null,
    opponentScore: Number.isFinite(oppScore) ? oppScore : null,
    wisconsinH1: wiLinescores[0]?.value ?? null,
    wisconsinH2: wiLinescores[1]?.value ?? null,
    opponentH1: oppLinescores[0]?.value ?? null,
    opponentH2: oppLinescores[1]?.value ?? null,
    otPeriods,
    venue: venue?.fullName || null,
    venueCity: venue?.address?.city || null,
    broadcast: broadcastName,
    attendance: competition.attendance || null,
    oppRanking: opponent.curatedRank?.current ?? null,
    wiRanking: badgers.curatedRank?.current ?? null,
    wiRecord: badgers.records?.[0]?.summary || null,
  };
}

app.get('/api/vest/scores', async (req, res) => {
  const season = String(req.query.season || '2025');

  const cacheQuery = `
    SELECT s.*, v.outfit, v.game_id
    FROM vest_game_stats s
    LEFT JOIN vest_games v ON v.espn_event_id = s.espn_event_id
    ORDER BY s.id ASC
  `;

  try {
    // Fetch fresh from ESPN
    const response = await fetchWithTimeout(
      `${ESPN_SCHEDULE_BASE}/${WISCONSIN_TEAM_ID}/schedule?season=${season}`
    );

    if (!response.ok) {
      // Return cached if ESPN is down
      const cached = await db.all(cacheQuery);
      if (cached.length) return res.json({ games: cached, source: 'cache' });
      return res.status(502).json({ error: 'ESPN unavailable', status: response.status });
    }

    const data = await response.json();
    const events = Array.isArray(data.events) ? data.events : [];
    const parsed = events.map(parseEspnEvent).filter(Boolean);

    // Upsert into vest_game_stats
    for (const game of parsed) {
      if (!game.completed) continue;

      // Try to match to a vest_game by date
      const vestGame = await db.get(
        'SELECT game_id FROM vest_games WHERE date = ? LIMIT 1',
        [game.date?.slice(0, 10)]
      );

      // Update vest_games espn_event_id if matched
      if (vestGame) {
        await db.run(
          'UPDATE vest_games SET espn_event_id = ? WHERE game_id = ?',
          [game.espnEventId, vestGame.game_id]
        );
      }

      // Upsert stats
      await db.run(`
        INSERT INTO vest_game_stats (
          espn_event_id, game_id, wisconsin_score, opponent_score,
          wisconsin_h1, wisconsin_h2, opponent_h1, opponent_h2,
          ot_periods, venue, venue_city, broadcast, attendance,
          opp_ranking, wi_ranking, wi_record, fetched_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(espn_event_id) DO UPDATE SET
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
        game.espnEventId, vestGame?.game_id || null,
        game.wisconsinScore, game.opponentScore,
        game.wisconsinH1, game.wisconsinH2, game.opponentH1, game.opponentH2,
        game.otPeriods, game.venue, game.venueCity, game.broadcast, game.attendance,
        game.oppRanking, game.wiRanking, game.wiRecord,
      ]);
    }

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
  const eventId = req.params.eventId;

  try {
    // Check cache first
    const cached = await db.get(
      'SELECT * FROM vest_game_stats WHERE espn_event_id = ?',
      [eventId]
    );

    // If we already have box score data, return it
    if (cached?.wi_fg) {
      return res.json({ stats: cached, source: 'cache' });
    }

    // Fetch from ESPN summary
    const response = await fetchWithTimeout(
      `${ESPN_SUMMARY_BASE}?event=${eventId}`
    );

    if (!response.ok) {
      if (cached) return res.json({ stats: cached, source: 'cache-partial' });
      return res.status(502).json({ error: 'ESPN summary unavailable' });
    }

    const summary = await response.json();

    // Extract box score team stats
    const boxTeams = summary.boxscore?.teams || [];
    const wiBox = boxTeams.find((t) => String(t.team?.id) === WISCONSIN_TEAM_ID);
    const oppBox = boxTeams.find((t) => String(t.team?.id) !== WISCONSIN_TEAM_ID);

    const wiStats = wiBox?.statistics || [];
    const oppStats = oppBox?.statistics || [];

    // Extract player leaders
    const competition = summary.header?.competitions?.[0] || {};
    const competitors = competition.competitors || [];
    const wiComp = competitors.find((c) => String(c.id) === WISCONSIN_TEAM_ID);
    const wiLeaders = wiComp?.leaders || [];

    const ptsLeader = wiLeaders.find((l) => l.name === 'points' || l.abbreviation === 'PTS');
    const rebLeader = wiLeaders.find((l) => l.name === 'rebounds' || l.abbreviation === 'REB');
    const astLeader = wiLeaders.find((l) => l.name === 'assists' || l.abbreviation === 'AST');

    const updates = {
      wi_fg: extractTeamStat(wiStats, 'FG'),
      wi_3pt: extractTeamStat(wiStats, '3PT'),
      wi_ft: extractTeamStat(wiStats, 'FT'),
      wi_rebounds: extractTeamStatNum(wiStats, 'REB'),
      wi_turnovers: extractTeamStatNum(wiStats, 'TO'),
      wi_fg_pct: parseFloat2(extractTeamStat(wiStats, 'FG%')),
      wi_3pt_pct: parseFloat2(extractTeamStat(wiStats, '3PT%')),
      wi_ft_pct: parseFloat2(extractTeamStat(wiStats, 'FT%')),
      opp_fg: extractTeamStat(oppStats, 'FG'),
      opp_3pt: extractTeamStat(oppStats, '3PT'),
      opp_ft: extractTeamStat(oppStats, 'FT'),
      opp_rebounds: extractTeamStatNum(oppStats, 'REB'),
      opp_turnovers: extractTeamStatNum(oppStats, 'TO'),
      opp_fg_pct: parseFloat2(extractTeamStat(oppStats, 'FG%')),
      opp_3pt_pct: parseFloat2(extractTeamStat(oppStats, '3PT%')),
      opp_ft_pct: parseFloat2(extractTeamStat(oppStats, 'FT%')),
      wi_leader_pts_name: ptsLeader?.leaders?.[0]?.athlete?.displayName || null,
      wi_leader_pts_value: ptsLeader?.leaders?.[0]?.displayValue || null,
      wi_leader_reb_name: rebLeader?.leaders?.[0]?.athlete?.displayName || null,
      wi_leader_reb_value: rebLeader?.leaders?.[0]?.displayValue || null,
      wi_leader_ast_name: astLeader?.leaders?.[0]?.athlete?.displayName || null,
      wi_leader_ast_value: astLeader?.leaders?.[0]?.displayValue || null,
    };

    // Update the cached row
    if (cached) {
      await db.run(`
        UPDATE vest_game_stats SET
          wi_fg = ?, wi_3pt = ?, wi_ft = ?, wi_rebounds = ?, wi_turnovers = ?,
          wi_fg_pct = ?, wi_3pt_pct = ?, wi_ft_pct = ?,
          opp_fg = ?, opp_3pt = ?, opp_ft = ?, opp_rebounds = ?, opp_turnovers = ?,
          opp_fg_pct = ?, opp_3pt_pct = ?, opp_ft_pct = ?,
          wi_leader_pts_name = ?, wi_leader_pts_value = ?,
          wi_leader_reb_name = ?, wi_leader_reb_value = ?,
          wi_leader_ast_name = ?, wi_leader_ast_value = ?,
          fetched_at = CURRENT_TIMESTAMP
        WHERE espn_event_id = ?
      `, [
        updates.wi_fg, updates.wi_3pt, updates.wi_ft, updates.wi_rebounds, updates.wi_turnovers,
        updates.wi_fg_pct, updates.wi_3pt_pct, updates.wi_ft_pct,
        updates.opp_fg, updates.opp_3pt, updates.opp_ft, updates.opp_rebounds, updates.opp_turnovers,
        updates.opp_fg_pct, updates.opp_3pt_pct, updates.opp_ft_pct,
        updates.wi_leader_pts_name, updates.wi_leader_pts_value,
        updates.wi_leader_reb_name, updates.wi_leader_reb_value,
        updates.wi_leader_ast_name, updates.wi_leader_ast_value,
        eventId,
      ]);
    }

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

    if (contentType.includes('text/html')) {
      const html = await response.text();
      const rankings = parseNetRankingsHtml(html);

      if (!rankings.length) {
        return res.status(502).json({
          error: 'Failed to parse NET rankings from upstream HTML source.',
        });
      }

      const netRankings = Object.fromEntries(
        rankings.map((entry) => [entry.team.toUpperCase(), entry.rank])
      );

      return res.json({ rankings, netRankings, source: 'WarrenNolan' });
    }

    const data = await response.json();
    return res.json(data);
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

app.get('/api/places-autocomplete', async (req, res) => {
  const input = `${req.query.input || ''}`.trim();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return res.status(503).json({ error: 'Google Places is not configured on the server.' });
  }

  if (input.length < 2) {
    return res.json({ suggestions: [] });
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: ['cafe', 'coffee_shop', 'restaurant'],
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      const errorPayload = buildPlacesErrorResponse('Autocomplete failed', response.status, details);
      console.error('Places autocomplete failed:', errorPayload);
      return res.status(502).json(errorPayload);
    }

    const data = await response.json();
    const suggestions = (data.suggestions || [])
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
  const placeId = `${req.query.placeId || ''}`.trim();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return res.status(503).json({ error: 'Google Places is not configured on the server.' });
  }

  if (!placeId) {
    return res.status(400).json({ error: 'placeId is required.' });
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
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

