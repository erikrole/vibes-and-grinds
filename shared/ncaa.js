// Shared NCAA basketball helpers used by Cloudflare Pages Functions
// (functions/api/vest/*) and Cloudflare Workers (workers/*).
//
// Backend (Node CJS, backend/server.js) intentionally does not import
// from here — its NET endpoint is a dev-only mirror with a stripped-down
// parser and converting it requires dynamic ESM import wiring.

export const WISCONSIN_TEAM_ID = '275';

export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const ESPN_SCHEDULE_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams';
export const ESPN_SUMMARY_BASE =
  'https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary';

const NCAA_NET_URL =
  'https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings';
const NCAA_API_NET_URL =
  'https://ncaa-api.henrygd.me/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings';
const NCAA_AP_POLL_URL =
  'https://www.ncaa.com/rankings/basketball-men/d1/associated-press';
const WARREN_NOLAN_NET_DEFAULT = 'https://www.warrennolan.com/basketball/2026/net';

export const NCAA_URLS = {
  ncaaNet: NCAA_NET_URL,
  ncaaApiNet: NCAA_API_NET_URL,
  apPoll: NCAA_AP_POLL_URL,
  warrenNolanNet: WARREN_NOLAN_NET_DEFAULT,
};

const TEAM_NAME_ALIASES = {
  'MICHIGAN ST': 'MICHIGAN STATE',
  'MICHIGAN ST.': 'MICHIGAN STATE',
  'OHIO ST': 'OHIO STATE',
  'OHIO ST.': 'OHIO STATE',
  'PENN ST': 'PENN STATE',
  'PENN ST.': 'PENN STATE',
};

export function stripHtmlTags(value = '') {
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

export function normalizeTeamName(name) {
  const normalized = (name || '').toUpperCase().trim();
  return TEAM_NAME_ALIASES[normalized] || normalized;
}

// Generic D1 rankings table parser with header auto-detection.
// Tries embedded JSON first, then falls back to the largest <table>.
// Returns [{ team, rank, record }, ...]
export function parseGenericRankingsTable(html = '') {
  const results = [];
  if (!html) return results;

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
    } catch {
      // not JSON, keep scanning
    }
  }

  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = html.match(tableRegex);
  if (!tables || tables.length === 0) return results;

  const bestTable = tables.reduce((best, t) =>
    (t.match(/<tr/gi) || []).length > (best.match(/<tr/gi) || []).length ? t : best
  );

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [...bestTable.matchAll(rowRegex)];

  let rankCol = -1;
  let teamCol = -1;
  let recordCol = -1;
  if (rows.length > 0) {
    const headerCells = [...rows[0][1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)]
      .map((m) => stripHtmlTags(m[1]).toLowerCase());
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
    const rowHtml = rows[i][1] || '';
    if (rowHtml.includes('<th')) continue;

    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [...rowHtml.matchAll(cellRegex)].map((m) => stripHtmlTags(m[1]));
    if (cells.length < 2) continue;

    const rank = Number.parseInt(cells[rankCol], 10);
    const team = normalizeTeamName(cells[teamCol] || '');
    if (!Number.isFinite(rank) || !team || rank < 1 || rank > 363) continue;

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

// Parse the AP Poll table on NCAA.com. Returns { TEAM_NAME: rank, ... }
export function parseAPPoll(html = '') {
  const rankings = {};
  if (!html) return rankings;

  try {
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables = html.match(tableRegex);
    if (!tables || tables.length === 0) return rankings;

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = [...tables[0].matchAll(rowRegex)];

    for (let i = 1; i < rows.length; i++) {
      const rowHtml = rows[i][1] || '';
      if (rowHtml.includes('<th')) continue;

      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells = [...rowHtml.matchAll(cellRegex)].map((m) => stripHtmlTags(m[1]));
      if (cells.length < 2) continue;

      const rank = parseInt(cells[0], 10);
      const teamName = normalizeTeamName(
        cells[1].replace(/\([^)]*\)/g, '').replace(/\d+-\d+/g, '').trim()
      );
      if (rank && teamName) rankings[teamName] = rank;
    }
  } catch (error) {
    console.error('AP Poll parse error:', error);
  }

  return rankings;
}

// Try multiple sources for D1 NET rankings. Returns the first source that
// produces > 50 teams. On total failure returns { rankings: [], netRankings: {},
// source: 'none', errors: [...] } so callers can decide how to surface it.
export async function fetchAllNetRankings({ warrenNolanUrl } = {}) {
  const errors = [];
  const sources = [
    { name: 'ncaa.com', fn: () => fetchPaginated(NCAA_NET_URL, parseHtmlPage) },
    { name: 'ncaa-api', fn: () => fetchPaginated(NCAA_API_NET_URL, parseJsonPage) },
    {
      name: 'warrennolan',
      fn: async () => {
        const url = warrenNolanUrl || WARREN_NOLAN_NET_DEFAULT;
        const resp = await fetch(url, { headers: { 'User-Agent': UA } });
        if (!resp.ok) throw new Error(`WarrenNolan returned ${resp.status}`);
        const html = await resp.text();
        const rankings = parseGenericRankingsTable(html);
        return rankings;
      },
    },
  ];

  for (const { name, fn } of sources) {
    try {
      const rankings = await fn();
      if (rankings.length > 50) {
        const netRankings = Object.fromEntries(rankings.map((e) => [e.team, e.rank]));
        return { rankings, netRankings, source: name };
      }
      errors.push(`${name}: only ${rankings.length} teams`);
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
      console.error(`NET source ${name} failed:`, err.message);
    }
  }

  return { rankings: [], netRankings: {}, source: 'none', errors };
}

async function fetchPaginated(baseUrl, parsePage) {
  const seen = {};
  const rankings = [];
  for (let page = 1; page <= 10; page++) {
    const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
    const resp = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!resp.ok) {
      if (page === 1) throw new Error(`${baseUrl} returned ${resp.status}`);
      break;
    }
    const { entries, totalPages } = await parsePage(resp);
    if (entries.length === 0) break;
    for (const entry of entries) {
      if (!seen[entry.team]) {
        seen[entry.team] = entry.rank;
        rankings.push(entry);
      }
    }
    if (page === 1 && entries.length > 300) break;
    if (totalPages && page >= totalPages) break;
  }
  return rankings;
}

async function parseHtmlPage(resp) {
  const html = await resp.text();
  return { entries: parseGenericRankingsTable(html), totalPages: null };
}

async function parseJsonPage(resp) {
  const data = await resp.json();
  const items = data.data || data.rankings || [];
  const entries = [];
  for (const item of items) {
    const rank = parseInt(item.RANK || item.rank || item.NET, 10);
    const rawTeam = item.SCHOOL || item.school || item.team || item.name || '';
    const team = normalizeTeamName(rawTeam.replace(/\([^)]*\)/g, '').trim());
    const record = item.RECORD || item.record || item['W-L'] || null;
    if (rank && team) entries.push({ team, rank, record });
  }
  return { entries, totalPages: data.pages || null };
}
