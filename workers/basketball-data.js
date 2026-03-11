/**
 * Cloudflare Worker for Basketball Data
 *
 * Fetches Big Ten conference standings from WarrenNolan, AP Poll from NCAA.com,
 * and full D1 NET rankings from multiple sources (tried in order):
 *   1. NCAA.com direct scrape (same domain as AP poll, known reachable)
 *   2. NCAA API proxy at ncaa-api.henrygd.me (JSON, with pagination)
 *   3. WarrenNolan /net page (HTML table parse, fallback)
 *
 * Response shape:
 *   {
 *     standings: [ { team, conf, ovr, apRank, netRank, wins, losses, confWins, confLosses } ],
 *     netRankings: { "DUKE": 1, "BYU": 14, ... },
 *     rankings: [ { team, rank, record }, ... ]
 *   }
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
      // Fetch Big Ten standings + AP poll in parallel
      const [conferenceResponse, apPollResponse] = await Promise.all([
        fetch('https://www.warrennolan.com/basketball/2026/conference/Big-Ten', {
          headers: { 'User-Agent': UA },
        }),
        fetch('https://www.ncaa.com/rankings/basketball-men/d1/associated-press', {
          headers: { 'User-Agent': UA },
        }),
      ]);

      if (!conferenceResponse.ok) {
        throw new Error(`WarrenNolan conference returned ${conferenceResponse.status}`);
      }

      const conferenceHTML = await conferenceResponse.text();
      const apPollHTML = apPollResponse.ok ? await apPollResponse.text() : '';

      const standings = parseConferenceTable(conferenceHTML);
      if (!standings || standings.length === 0) {
        throw new Error('No standings data found');
      }

      const apRankings = parseAPPoll(apPollHTML);
      for (const team of standings) {
        team.apRank = apRankings[team.team] ?? 999;
      }

      // Try multiple sources for full D1 NET rankings
      const netResult = await fetchAllNetRankings();

      // Backfill with Big Ten data we already have
      for (const team of standings) {
        if (team.netRank && !netResult.netRankings[team.team]) {
          netResult.netRankings[team.team] = team.netRank;
          netResult.rankings.push({ team: team.team, rank: team.netRank, record: team.ovr });
        }
      }

      return new Response(JSON.stringify({
        standings,
        netRankings: netResult.netRankings,
        rankings: netResult.rankings,
        netSource: netResult.source,
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
 * Try multiple sources for full D1 NET rankings, return the first that succeeds.
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
 * Fetch NET rankings directly from NCAA.com (same domain as AP poll, known reachable).
 * The page may have all teams in one table or may be paginated.
 */
async function fetchNcaaDirect() {
  const netRankings = {};
  const rankings = [];

  // NCAA.com NET rankings may be paginated — fetch up to 10 pages
  for (let page = 1; page <= 10; page++) {
    const url = page === 1
      ? 'https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings'
      : `https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings?page=${page}`;

    const resp = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!resp.ok) {
      if (page === 1) throw new Error(`NCAA.com NET returned ${resp.status}`);
      break; // subsequent pages may 404
    }

    const html = await resp.text();
    const pageResult = parseGenericRankingsTable(html);

    if (pageResult.length === 0) break; // no more data

    for (const entry of pageResult) {
      if (!netRankings[entry.team]) {
        netRankings[entry.team] = entry.rank;
        rankings.push(entry);
      }
    }

    // If first page had a lot of teams, likely not paginated
    if (page === 1 && pageResult.length > 300) break;
  }

  return { netRankings, rankings };
}

/**
 * Fetch NET rankings from NCAA API proxy (henrygd) with pagination support.
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
 * Fetch NET rankings from WarrenNolan /net page.
 */
async function fetchWarrenNolanNet() {
  const resp = await fetch('https://www.warrennolan.com/basketball/2026/net', {
    headers: { 'User-Agent': UA },
  });
  if (!resp.ok) throw new Error(`WarrenNolan NET returned ${resp.status}`);

  const html = await resp.text();
  return parseNetRankingsPage(html);
}

/**
 * Generic table parser — works on NCAA.com, WarrenNolan, and similar pages.
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

  // HTML table parsing with header auto-detection
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = html.match(tableRegex);
  if (!tables) return results;

  const bestTable = tables.reduce((best, t) =>
    (t.match(/<tr/gi) || []).length > (best.match(/<tr/gi) || []).length ? t : best
  );

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [...bestTable.matchAll(rowRegex)];

  // Detect columns from header
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
 * Parse WarrenNolan conference standings table (/conference/Big-Ten)
 * Columns: Rank | Team | Conf Record | Conf Win% | GB | Overall Record | Overall Win% | NET | Q1
 */
function parseConferenceTable(html) {
  const standings = [];

  try {
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables = html.match(tableRegex);
    if (!tables || tables.length === 0) throw new Error('No tables found');

    let standingsTable = null;
    for (const table of tables) {
      if (table.includes('-') && (table.match(/<tr/gi) || []).length > 5) {
        standingsTable = table;
        break;
      }
    }
    if (!standingsTable) throw new Error('Could not find standings table');

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = [...standingsTable.matchAll(rowRegex)];

    for (let i = 1; i < rows.length; i++) {
      const rowHTML = rows[i][1];
      if (rowHTML.includes('<th')) continue;

      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells = [...rowHTML.matchAll(cellRegex)].map(m => stripHTML(m[1]).trim());

      if (cells.length < 8) continue;

      const teamName = cells[1]?.trim();
      const confRecord = cells[2]?.trim();
      const ovrRecord = cells[5]?.trim();
      const netRankStr = cells[7]?.trim();

      if (!teamName || !confRecord || !ovrRecord) continue;

      const confMatch = confRecord.match(/(\d+)-(\d+)/);
      const ovrMatch = ovrRecord.match(/(\d+)-(\d+)/);

      standings.push({
        team: teamName.toUpperCase(),
        conf: confRecord,
        ovr: ovrRecord,
        apRank: 999,
        netRank: netRankStr && /^\d+$/.test(netRankStr) ? parseInt(netRankStr, 10) : null,
        wins: ovrMatch ? parseInt(ovrMatch[1], 10) : 0,
        losses: ovrMatch ? parseInt(ovrMatch[2], 10) : 0,
        confWins: confMatch ? parseInt(confMatch[1], 10) : 0,
        confLosses: confMatch ? parseInt(confMatch[2], 10) : 0,
      });
    }
  } catch (error) {
    throw new Error(`Conference parse error: ${error.message}`);
  }

  return standings;
}

/**
 * Parse WarrenNolan full NET rankings page (/net-rankings)
 * Returns { netRankings: { "DUKE": 1, ... }, rankings: [{ team, rank, record }, ...] }
 *
 * NET page columns: NET Rank | Team | Conference | Record | ...
 * If results look wrong, check the Cloudflare Worker logs and adjust
 * RANK_COL / TEAM_COL below to match the actual column positions.
 */
function parseNetRankingsPage(html) {
  const netRankings = {};
  const rankings = [];
  const recordPattern = /\b(\d+-\d+)\b/;

  if (!html) return { netRankings, rankings };

  // Try embedded JSON/JS data in script tags (some pages render data via JavaScript)
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
          netRankings[team] = rank;
          rankings.push({ team, rank, record });
        }
      }
      if (rankings.length > 50) return { netRankings, rankings };
    } catch (e) { /* not valid JSON */ }
  }

  // Try <pre> text block first (mirrors net-rankings.js logic)
  const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch) {
    const lines = preMatch[1].split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) continue;

      const rank = parseInt(parts[0], 10);
      if (!rank || rank < 1 || rank > 363) continue;

      let teamName = parts.slice(1).join(' ');
      // Capture W-L record before stripping it
      const recordMatch = teamName.match(recordPattern);
      const record = recordMatch ? recordMatch[1] : null;
      teamName = teamName.replace(
        /\s+(ACC|SEC|Big Ten|Big 12|Pac-12|Big East|AAC|MWC|WCC|A-10|MAC|C-USA|Sun Belt|WAC|Summit|Horizon|CAA|MVC|SoCon|Southland|NEC|MAAC|Ivy|Patriot|MEAC|SWAC|Big Sky|Big South|OVC|AEC|ASun).*$/i,
        ''
      );
      teamName = normalizeTeamName(teamName.replace(/\s+\d+-\d+.*$/, '').trim());

      if (teamName && teamName.length > 1) {
        netRankings[teamName] = rank;
        rankings.push({ team: teamName, rank, record });
      }
    }
    if (rankings.length > 0) return { netRankings, rankings };
  }

  // Fallback: HTML table parsing
  const RANK_COL = 0;
  const TEAM_COL = 1;

  try {
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables = html.match(tableRegex);
    if (!tables) return { netRankings, rankings };

    // Use the table with the most rows
    const netTable = tables.reduce((best, t) =>
      (t.match(/<tr/gi) || []).length > (best.match(/<tr/gi) || []).length ? t : best
    );

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = [...netTable.matchAll(rowRegex)];

    for (let i = 1; i < rows.length; i++) {
      const rowHTML = rows[i][1];
      if (rowHTML.includes('<th')) continue;

      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells = [...rowHTML.matchAll(cellRegex)].map(m => stripHTML(m[1]).trim());

      if (cells.length <= TEAM_COL) continue;

      const rank = parseInt(cells[RANK_COL], 10);
      const teamName = normalizeTeamName(cells[TEAM_COL]?.trim() || '');

      if (!rank || !teamName) continue;

      // Scan remaining cells for a W-L record pattern
      let record = null;
      for (let c = TEAM_COL + 1; c < cells.length; c++) {
        if (/^\d+-\d+$/.test(cells[c])) {
          record = cells[c];
          break;
        }
      }

      netRankings[teamName] = rank;
      rankings.push({ team: teamName, rank, record });
    }
  } catch (error) {
    // Non-fatal — standings still work without the full NET map
    console.error('NET rankings parse error:', error.message);
  }

  return { netRankings, rankings };
}

/**
 * Parse AP Poll from NCAA.com
 * Returns { "DUKE": 1, "AUBURN": 3, ... }
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
