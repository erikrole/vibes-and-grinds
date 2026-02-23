const express = require('express');
const cors = require('cors');
const { initDatabase, getDatabase } = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const DEFAULT_NET_RANKINGS_URL = 'https://big-ten-standings.erikrole.workers.dev';

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

function normalizeTeamName(name) {
  const normalized = name.toUpperCase().trim();
  const mapping = {
    'MICHIGAN ST': 'MICHIGAN STATE',
    'MICHIGAN ST.': 'MICHIGAN STATE',
    'OHIO ST': 'OHIO STATE',
    'OHIO ST.': 'OHIO STATE',
    'PENN ST': 'PENN STATE',
    'PENN ST.': 'PENN STATE',
    'INDIANA ST': 'INDIANA STATE',
    'INDIANA ST.': 'INDIANA STATE',
    'BALL ST': 'BALL STATE',
    'BALL ST.': 'BALL STATE',
    'IOWA ST': 'IOWA STATE',
    'IOWA ST.': 'IOWA STATE',
  };
  return mapping[normalized] || normalized;
}

function parseNcaaNetRankings(html = '') {
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [...html.matchAll(rowRegex)];
  const rankings = [];

  // Try to find the largest table (likely the NET rankings table)
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = html.match(tableRegex);

  if (tables && tables.length > 0) {
    // Use the table with the most rows
    const netTable = tables.reduce((best, t) =>
      (t.match(/<tr/gi) || []).length > (best.match(/<tr/gi) || []).length ? t : best
    );
    const tableRows = [...netTable.matchAll(rowRegex)];

    // WarrenNolan format: NET Rank (col 0) | Team (col 1) | Conference | Record | ...
    for (let i = 1; i < tableRows.length; i++) {
      const rowHtml = tableRows[i][1] || '';
      if (rowHtml.includes('<th')) continue;

      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells = [...rowHtml.matchAll(cellRegex)].map((cellMatch) => stripHtmlTags(cellMatch[1]));

      if (cells.length < 2) continue;

      const rank = Number.parseInt(cells[0], 10);
      if (!Number.isFinite(rank)) continue;

      let teamName = cells[1]?.trim();
      if (!teamName) continue;

      // Normalize team name (handle abbreviations like "Ohio St." → "Ohio State")
      teamName = normalizeTeamName(teamName);

      rankings.push({ team: teamName, rank });
    }
  }

  return rankings;
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

    // Validation
    if (!date || !coffee_shop_name || vibe_rating === undefined || coffee_rating === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (vibe_rating < 0 || vibe_rating > 10 || coffee_rating < 0 || coffee_rating > 10) {
      return res.status(400).json({ error: 'Ratings must be between 0 and 10' });
    }

    const result = await db.run(
      `INSERT INTO coffee_visits (
        date, coffee_shop_name, city, opponent, sport, coffee_shop_address, coffee_shop_place_id,
        coffee_shop_lat, coffee_shop_lng, coffee_order, vibe_rating, coffee_rating, notes, photo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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

    // Validation
    if (vibe_rating < 0 || vibe_rating > 10 || coffee_rating < 0 || coffee_rating > 10) {
      return res.status(400).json({ error: 'Ratings must be between 0 and 10' });
    }

    await db.run(
      `UPDATE coffee_visits SET
        date = ?, coffee_shop_name = ?, city = ?, opponent = ?, sport = ?, coffee_shop_address = ?,
        coffee_shop_place_id = ?, coffee_shop_lat = ?, coffee_shop_lng = ?,
        coffee_order = ?, vibe_rating = ?, coffee_rating = ?, notes = ?, photo_url = ?
      WHERE id = ?`,
      [
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
        photo_url,
        req.params.id
      ]
    );

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
    await db.run('DELETE FROM coffee_visits WHERE id = ?', [req.params.id]);
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


app.get('/api/vest/schedule', async (req, res) => {
  const season = String(req.query.season || '2025');
  const teamId = '275'; // Wisconsin

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${teamId}/schedule?season=${season}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

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


app.get('/api/vest/net-rankings', async (req, res) => {
  const netRankingsUrl = process.env.NET_RANKINGS_URL || DEFAULT_NET_RANKINGS_URL;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(netRankingsUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; vibes-and-grinds/1.0)',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({
        error: 'Failed to fetch NET rankings from upstream source.',
        status: response.status,
      });
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      const html = await response.text();
      const rankings = parseNcaaNetRankings(html);

      if (!rankings.length) {
        return res.status(502).json({
          error: 'Failed to parse NET rankings from WarrenNolan.',
        });
      }

      return res.json({ rankings, source: 'WarrenNolan' });
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

