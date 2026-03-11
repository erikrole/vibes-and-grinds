/**
 * Cloudflare Worker for Basketball NET Rankings + AP Poll
 *
 * Tries multiple sources for all D1 NET rankings (in order):
 *   1. NCAA.com direct scrape (known reachable, same domain as AP poll)
 *   2. NCAA API proxy at ncaa-api.henrygd.me (JSON, with pagination)
 *   3. WarrenNolan /net page (fallback)
 *
 * Also fetches AP Poll from NCAA.com.
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      // Fetch AP poll in parallel with NET rankings
      const apPollPromise = fetch('https://www.ncaa.com/rankings/basketball-men/d1/associated-press', {
        headers: { 'User-Agent': UA },
      }).then(r => r.ok ? r.text() : '').catch(() => '');

      const netResult = await fetchAllNetRankings();
      if (netResult.rankings.length === 0) {
        throw new Error('All NET ranking sources failed');
      }

      const apPollHTML = await apPollPromise;
      const apRankings = parseAPPoll(apPollHTML);

      return new Response(JSON.stringify({
        netRankings: netResult.netRankings,
        rankings: netResult.rankings,
        apRankings,
        source: netResult.source,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message, timestamp: new Date().toISOString() }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};

/**
 * Try multiple sources for full D1 NET rankings.
 */
async function fetchAllNetRankings() {
  const errors = [];
  const sources = [
    { name: 'ncaa.com', fn: fetchNcaaDirect },
    { name: 'ncaa-api', fn: fetchNcaaApi },
    { name: 'warrennolan', fn: fetchWarrenNolanNet },
  ];

  for (const { name, fn } of sources) {
    try {
      const result = await fn();
      if (result.rankings.length > 50) {
        console.log(`NET rankings: ${result.rankings.length} teams from ${name}`);
        return { ...result, source: name };
      }
      errors.push(`${name}: only ${result.rankings.length} teams`);
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
      console.error(`NET source ${name} failed:`, err.message);
    }
  }

  console.warn('All NET ranking sources failed:', errors.join('; '));
  return { netRankings: {}, rankings: [], source: 'none', errors };
}

/**
 * Fetch directly from NCAA.com NET rankings page (with pagination).
 */
async function fetchNcaaDirect() {
  const netRankings = {};
  const rankings = [];

  for (let page = 1; page <= 10; page++) {
    const url = page === 1
      ? 'https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings'
      : `https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings?page=${page}`;

    const resp = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!resp.ok) {
      if (page === 1) throw new Error(`NCAA.com NET returned ${resp.status}`);
      break;
    }

    const html = await resp.text();
    const pageResult = parseGenericRankingsTable(html);
    if (pageResult.length === 0) break;

    for (const entry of pageResult) {
      if (!netRankings[entry.team]) {
        netRankings[entry.team] = entry.rank;
        rankings.push(entry);
      }
    }

    if (page === 1 && pageResult.length > 300) break;
  }

  return { netRankings, rankings };
}

/**
 * Fetch from NCAA API proxy with pagination.
 */
async function fetchNcaaApi() {
  const netRankings = {};
  const rankings = [];

  for (let page = 1; page <= 10; page++) {
    const url = page === 1
      ? 'https://ncaa-api.henrygd.me/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings'
      : `https://ncaa-api.henrygd.me/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings?page=${page}`;

    const resp = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!resp.ok) {
      if (page === 1) throw new Error(`NCAA API returned ${resp.status}`);
      break;
    }

    const data = await resp.json();
    const items = data.data || data.rankings || [];
    if (items.length === 0) break;

    for (const item of items) {
      const rank = parseInt(item.RANK || item.rank || item.NET, 10);
      const rawTeam = item.SCHOOL || item.school || item.team || item.name || '';
      const team = normalizeTeamName(rawTeam.replace(/\([^)]*\)/g, '').trim());
      const record = item.RECORD || item.record || item['W-L'] || null;

      if (!rank || !team) continue;
      if (!netRankings[team]) {
        netRankings[team] = rank;
        rankings.push({ team, rank, record });
      }
    }

    const totalPages = data.pages || 1;
    if (page >= totalPages) break;
  }

  return { netRankings, rankings };
}

/**
 * Fetch from WarrenNolan /net page (fallback).
 */
async function fetchWarrenNolanNet() {
  const resp = await fetch('https://www.warrennolan.com/basketball/2026/net', {
    headers: { 'User-Agent': UA },
  });
  if (!resp.ok) throw new Error(`WarrenNolan returned ${resp.status}`);

  const html = await resp.text();
  const results = parseGenericRankingsTable(html);
  const netRankings = {};
  for (const entry of results) {
    netRankings[entry.team] = entry.rank;
  }
  return { netRankings, rankings: results };
}

/**
 * Generic table parser with header auto-detection.
 * Returns [ { team, rank, record }, ... ] from the largest table on the page.
 */
function parseGenericRankingsTable(html) {
  const results = [];
  if (!html) return results;

  // Try embedded JSON first
  const jsonMatches = html.matchAll(/(?:var|let|const)\s+\w+\s*=\s*(\[[\s\S]*?\]);/g);
  for (const jsonMatch of jsonMatches) {
    try {
      const arr = JSON.parse(jsonMatch[1]);
      if (!Array.isArray(arr) || arr.length < 20) continue;
      for (const item of arr) {
        const rank = parseInt(item.net || item.rank || item.NET || item.net_rank || item.RANK, 10);
        const rawTeam = item.team || item.name || item.school || item.SCHOOL || '';
        const team = normalizeTeamName(rawTeam.trim());
        const record = item.record || item.rec || item.RECORD || null;
        if (rank && team && rank >= 1 && rank <= 363) {
          results.push({ team, rank, record });
        }
      }
      if (results.length > 20) return results;
    } catch (e) { /* not JSON */ }
  }

  // HTML table parsing
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = html.match(tableRegex);
  if (!tables) return results;

  const bestTable = tables.reduce((best, t) =>
    (t.match(/<tr/gi) || []).length > (best.match(/<tr/gi) || []).length ? t : best
  );

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [...bestTable.matchAll(rowRegex)];

  let rankCol = -1, teamCol = -1, recordCol = -1;
  if (rows.length > 0) {
    const headerCells = [...rows[0][1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)]
      .map(m => stripHTML(m[1]).trim().toLowerCase());
    for (let c = 0; c < headerCells.length; c++) {
      const h = headerCells[c];
      if (rankCol === -1 && /^(#|rank|net|net rk|net rank)$/.test(h)) rankCol = c;
      if (teamCol === -1 && /^(team|school|name)$/.test(h)) teamCol = c;
      if (recordCol === -1 && /^(record|rec|w-l|overall)$/.test(h)) recordCol = c;
    }
  }
  if (teamCol === -1) teamCol = rankCol === 0 ? 1 : 0;
  if (rankCol === -1) rankCol = teamCol === 0 ? 1 : 0;

  for (let i = 1; i < rows.length; i++) {
    const rowHTML = rows[i][1];
    if (rowHTML.includes('<th')) continue;

    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [...rowHTML.matchAll(cellRegex)].map(m => stripHTML(m[1]).trim());
    if (cells.length < 2) continue;

    const rank = parseInt(cells[rankCol], 10);
    const team = normalizeTeamName(cells[teamCol] || '');
    if (!rank || !team || rank < 1 || rank > 363) continue;

    let record = recordCol >= 0 && recordCol < cells.length ? cells[recordCol] : null;
    if (!record) {
      for (let c = 0; c < cells.length; c++) {
        if (c !== rankCol && c !== teamCol && /^\d+-\d+$/.test(cells[c])) {
          record = cells[c];
          break;
        }
      }
    }

    results.push({ team, rank, record });
  }

  return results;
}

/**
 * Parse AP Poll from NCAA.com
 */
function parseAPPoll(html) {
  const rankings = {};
  if (!html) return rankings;

  try {
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables = html.match(tableRegex);
    if (!tables || tables.length === 0) return rankings;

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = [...tables[0].matchAll(rowRegex)];

    for (let i = 1; i < rows.length; i++) {
      const rowHTML = rows[i][1];
      if (rowHTML.includes('<th')) continue;

      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells = [...rowHTML.matchAll(cellRegex)].map(m => stripHTML(m[1]).trim());

      if (cells.length < 2) continue;

      const rank = parseInt(cells[0], 10);
      let teamName = cells[1]
        .replace(/\([^)]*\)/g, '')
        .replace(/\d+-\d+/g, '')
        .trim();

      teamName = normalizeTeamName(teamName);
      if (rank && teamName) rankings[teamName] = rank;
    }
  } catch (error) {
    console.error('AP Poll parse error:', error);
  }

  return rankings;
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
  };
  return mapping[normalized] || normalized;
}

function stripHTML(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
