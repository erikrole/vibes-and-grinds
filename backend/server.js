const express = require('express');
const path = require('node:path');
const fs = require('node:fs/promises');
const { initDatabase, getDatabase } = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const ESPN_SUMMARY_BASE = 'https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary';
const FETCH_TIMEOUT_MS = 10000;

let scoreWritesModulePromise;
let espnModulePromise;
let httpModulePromise;

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

// Middleware
app.use(express.json({ limit: '64kb' }));
app.use('/api/upload', express.raw({ type: 'multipart/form-data', limit: '16mb' }));

// Initialize database then start listening — prevents requests arriving before db is ready
let db;
let apiDB;
let auth;
let visitsApi;
initDatabase()
  .then(async (database) => {
    db = database;
    auth = await import('../shared/auth.mjs');
    visitsApi = await import('../shared/visits.mjs');
    const { sqliteAdapter } = await import('../shared/sqlite-adapter.mjs');
    apiDB = sqliteAdapter(db);
    const { backfillShops } = await import('../shared/shops.mjs');
    await backfillShops(apiDB);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// Routes
app.get('/api/maps-config', (req, res) => {
  res.set('Cache-Control', 'no-store').json({ token: process.env.APPLE_MAPS_TOKEN || null });
});


// ── Shared helpers ──

/**
 * Validate the required fields for a coffee visit.
 * Returns an error string if invalid, or null if valid.
 */
function validateVisit({ date, coffee_shop_name, vibe_rating, coffee_rating }) {
  if (!date || !String(date).trim()) return 'Date is required';
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

function webRequest(req) {
  const origin = process.env.LOCAL_ORIGIN || `http://${req.get('host')}`;
  const headers = new Headers(req.headers);
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body || {});
  return new Request(`${origin}${req.originalUrl}`, { method: req.method, headers, body });
}

async function sendResponse(res, response) {
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
}

const ownerEnv = () => ({ DB: apiDB, OWNER_KEY_HASH: process.env.OWNER_KEY_HASH, CONTRIB_KEY_HASH: process.env.CONTRIB_KEY_HASH });
app.use('/api', async (req, res, next) => {
  const pathname = req.originalUrl.split('?')[0];
  if (!auth.mutationRequiresOwner(req.method, pathname)) return next();
  try {
    const denied = await auth.authorizeWrite(webRequest(req), ownerEnv());
    if (denied) return sendResponse(res, denied);
    next();
  } catch { res.status(500).json({ error: 'Could not authorize this request.' }); }
});
app.all('/api/owner/session', async (req, res) => {
  try { await sendResponse(res, await auth.ownerSession(webRequest(req), ownerEnv())); }
  catch { res.status(500).json({ error: 'Could not sign in. Please try again.' }); }
});
app.all(['/api/owner/trash', '/api/owner/trash/:id', '/api/owner/export', '/api/owner/backfill', '/api/owner/vest-history', '/api/owner/vest-history/:id'], async (req, res) => {
  try { await sendResponse(res, await visitsApi.ownerDataRoute(webRequest(req), ownerEnv(), req.params.id)); }
  catch { res.status(500).json({ error: 'Could not complete this request.' }); }
});
app.all(['/api/visits', '/api/visits/:id'], async (req, res) => sendResponse(res, await visitsApi.visitRoute(webRequest(req), apiDB, req.params.id)));
const uploadsDir = process.env.UPLOAD_DIR || path.resolve('uploads');
app.use('/api/photos', express.static(uploadsDir));
app.post('/api/upload', async (req, res) => {
  const { onRequestPost } = await import('../functions/api/upload.js');
  await sendResponse(res, await onRequestPost({ request: webRequest(req), env: {
    R2_PUBLIC_URL: '/api/photos', PHOTOS: { put: async (name, stream) => {
      await fs.mkdir(path.dirname(path.join(uploadsDir, name)), { recursive: true });
      await fs.writeFile(path.join(uploadsDir, name), Buffer.from(await new Response(stream).arrayBuffer()));
    } },
  } }));
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
      FROM coffee_visits WHERE deleted_at IS NULL
    `);

    const topShops = await db.all(`
      SELECT
        coffee_shop_name,
        COUNT(*) as visit_count,
        ROUND(AVG(composite_score), 2) as avg_composite
      FROM coffee_visits WHERE deleted_at IS NULL
      GROUP BY shop_id
      ORDER BY avg_composite DESC
      LIMIT 5
    `);

    res.json({ ...stats, topShops });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});



app.all('/api/vest/games', async (req, res) => {
  try { const { vestRoute } = await import('../shared/vest.mjs'); await sendResponse(res, await vestRoute(webRequest(req), apiDB)); }
  catch { res.status(500).json({ error: 'Could not save games. Please try again.' }); }
});

app.get('/api/photo', async (req, res) => {
  try { const { photoProxyRoute } = await import('../shared/photo-proxy.mjs'); await sendResponse(res, await photoProxyRoute(webRequest(req), { R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || '' })); }
  catch { res.status(500).json({ error: 'Could not load photo.' }); }
});

app.get('/api/badger-games', async (req, res) => {
  try { const { gamesRoute } = await import('../shared/badger-schedule.mjs'); await sendResponse(res, await gamesRoute(webRequest(req))); }
  catch { res.status(500).json({ error: 'Could not load games.', games: [] }); }
});

app.get('/api/vest/schedule', async (req, res) => {
  try { const { vestScheduleRoute } = await import('../shared/vest-schedule.mjs'); await sendResponse(res, await vestScheduleRoute(webRequest(req))); }
  catch { res.status(502).json({ error: 'Failed to fetch vest schedule' }); }
});


// ── ESPN Scores: fetch schedule + scores and cache in vest_game_stats ──

app.get('/api/vest/scores', async (req, res) => {
  try {
    const { vestScoresRoute } = await import('../shared/vest-scores.mjs');
    const response = await vestScoresRoute(new Request(`http://localhost:${PORT}${req.originalUrl}`), apiDB);
    res.status(response.status).set('Cache-Control', 'no-store').json(await response.json());
  } catch { res.status(502).json({ error: 'ESPN scores are unavailable. Try again later.' }); }
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
  try { const { netRankingsRoute } = await import('../shared/net-rankings.mjs'); await sendResponse(res, await netRankingsRoute(webRequest(req))); }
  catch { res.status(502).json({ error: 'Failed to fetch vest NET rankings' }); }
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
