// GET /api/vest/net-rankings - Proxy NET ranking feed for frontend usage
// Supports both Cloudflare Pages Functions (onRequestGet) and Workers (default export).
//
// Tries multiple upstream sources for NET rankings:
//   1. Barttorvik teamsheets (HTML table)
//   2. WarrenNolan /net page (HTML table)
//   3. NCAA API proxy (JSON)

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

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
  };
  return mapping[normalized] || normalized;
}

/**
 * Parse an HTML page looking for a table with NET rankings.
 * Handles both WarrenNolan and Barttorvik table structures.
 */
function parseNetRankingsHtml(html = '') {
  const rankings = [];

  if (!html) return rankings;

  // Detect Cloudflare challenge page
  if (html.includes('Verifying your browser') || html.includes('cf-challenge')) {
    return rankings;
  }

  // Try embedded JSON in script tags
  const jsonMatches = html.matchAll(/(?:var|let|const)\s+\w+\s*=\s*(\[[\s\S]*?\]);/g);
  for (const jsonMatch of jsonMatches) {
    try {
      const arr = JSON.parse(jsonMatch[1]);
      if (!Array.isArray(arr) || arr.length < 50) continue;
      for (const item of arr) {
        const rank = parseInt(item.net || item.rank || item.NET || item.net_rank, 10);
        const rawTeam = item.team || item.name || item.school || '';
        const team = normalizeTeamName(rawTeam.trim());
        const record = item.record || item.rec || null;
        if (rank && team && rank >= 1 && rank <= 363) {
          rankings.push({ team, rank, record });
        }
      }
      if (rankings.length > 50) return rankings;
    } catch (e) { /* not valid JSON */ }
  }

  // HTML table parsing
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

  // Detect column positions from header row
  let netCol = -1, teamCol = -1, recordCol = -1;
  if (rows.length > 0) {
    const headerCells = [...rows[0][1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)]
      .map(m => stripHtmlTags(m[1]).trim().toLowerCase());

    for (let c = 0; c < headerCells.length; c++) {
      const h = headerCells[c];
      if (netCol === -1 && (h === 'net' || h === 'net rk' || h === 'net rank' || h === '#' || h === 'rank')) netCol = c;
      if (teamCol === -1 && (h === 'team' || h === 'school' || h === 'name')) teamCol = c;
      if (recordCol === -1 && (h === 'record' || h === 'rec' || h === 'w-l')) recordCol = c;
    }
  }

  // Defaults: assume rank in col 0, team in col 1
  if (teamCol === -1) teamCol = netCol === 0 ? 1 : 0;
  if (netCol === -1) netCol = teamCol === 0 ? 1 : 0;

  for (let i = 1; i < rows.length; i++) {
    const rowHtml = rows[i][1] || '';
    if (rowHtml.includes('<th')) continue;

    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [...rowHtml.matchAll(cellRegex)].map((cellMatch) => stripHtmlTags(cellMatch[1]));
    if (cells.length < 2) continue;

    const rank = Number.parseInt(cells[netCol], 10);
    const team = normalizeTeamName((cells[teamCol] || '').trim());

    if (!Number.isFinite(rank) || !team || rank < 1 || rank > 363) continue;

    let record = recordCol >= 0 && recordCol < cells.length ? cells[recordCol] : null;
    if (!record) {
      for (let c = 0; c < cells.length; c++) {
        if (c !== netCol && c !== teamCol && /^\d+-\d+$/.test(cells[c])) {
          record = cells[c];
          break;
        }
      }
    }

    rankings.push({ team, rank, record });
  }

  return rankings;
}

/**
 * Try multiple sources for NET rankings, return the first that succeeds.
 */
async function getNetRankingsResponse(envNetRankingsUrl) {
  const sources = [
    {
      name: 'barttorvik',
      url: 'https://barttorvik.com/teamsheets.php',
      type: 'html',
    },
    {
      name: 'warrennolan',
      url: envNetRankingsUrl || 'https://www.warrennolan.com/basketball/2026/net',
      type: 'html',
    },
    {
      name: 'ncaa-api',
      url: 'https://ncaa-api.henrygd.me/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings',
      type: 'json',
    },
  ];

  for (const { name, url, type } of sources) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': UA },
      });

      if (!response.ok) {
        console.error(`NET source ${name} returned ${response.status}`);
        continue;
      }

      let rankings = [];

      if (type === 'json') {
        const data = await response.json();
        const items = data.data || data.rankings || [];
        for (const item of items) {
          const rank = parseInt(item.RANK || item.rank || item.NET, 10);
          const rawTeam = item.SCHOOL || item.school || item.team || item.name || '';
          const team = normalizeTeamName(rawTeam.replace(/\([^)]*\)/g, '').trim());
          const record = item.RECORD || item.record || item['W-L'] || null;
          if (rank && team) rankings.push({ team, rank, record });
        }
      } else {
        const html = await response.text();
        rankings = parseNetRankingsHtml(html);
      }

      if (rankings.length > 50) {
        console.log(`NET rankings: ${rankings.length} teams from ${name}`);
        const netRankings = Object.fromEntries(
          rankings.map((entry) => [entry.team, entry.rank])
        );
        return new Response(JSON.stringify({ rankings, netRankings, source: name }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.error(`NET source ${name} returned only ${rankings.length} teams`);
    } catch (err) {
      console.error(`NET source ${name} failed:`, err.message);
    }
  }

  return new Response(JSON.stringify({
    error: 'All NET ranking sources failed.',
  }), {
    status: 502,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestGet({ env }) {
  try {
    return await getNetRankingsResponse(env.NET_RANKINGS_URL);
  } catch (error) {
    console.error('Error fetching vest NET rankings:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch vest NET rankings',
      details: error.message,
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default {
  async fetch(_request, env) {
    return onRequestGet({ env });
  },
};
