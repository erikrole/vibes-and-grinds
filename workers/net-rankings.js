/**
 * Cloudflare Worker for Basketball NET Rankings + AP Poll
 *
 * Tries multiple sources for all D1 NET rankings (in order):
 *   1. Barttorvik teamsheets (HTML table)
 *   2. WarrenNolan /net page (HTML table)
 *   3. NCAA API proxy (JSON)
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
  const sources = [
    { name: 'barttorvik', fn: fetchBarttorvik },
    { name: 'warrennolan', fn: fetchWarrenNolanNet },
    { name: 'ncaa-api', fn: fetchNcaaApi },
  ];

  for (const { name, fn } of sources) {
    try {
      const result = await fn();
      if (result.rankings.length > 50) {
        console.log(`NET rankings: ${result.rankings.length} teams from ${name}`);
        return { ...result, source: name };
      }
    } catch (err) {
      console.error(`NET source ${name} failed:`, err.message);
    }
  }

  return { netRankings: {}, rankings: [], source: 'none' };
}

/**
 * Fetch from Barttorvik teamsheets page.
 */
async function fetchBarttorvik() {
  const resp = await fetch('https://barttorvik.com/teamsheets.php', {
    headers: { 'User-Agent': UA },
  });
  if (!resp.ok) throw new Error(`Barttorvik returned ${resp.status}`);

  const html = await resp.text();
  return parseBarttorvik(html);
}

/**
 * Fetch from WarrenNolan /net page.
 */
async function fetchWarrenNolanNet() {
  const resp = await fetch('https://www.warrennolan.com/basketball/2026/net', {
    headers: { 'User-Agent': UA },
  });
  if (!resp.ok) throw new Error(`WarrenNolan returned ${resp.status}`);

  const html = await resp.text();
  return parseNetRankingsTable(html);
}

/**
 * Fetch from NCAA API proxy.
 */
async function fetchNcaaApi() {
  const resp = await fetch('https://ncaa-api.henrygd.me/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings', {
    headers: { 'User-Agent': UA },
  });
  if (!resp.ok) throw new Error(`NCAA API returned ${resp.status}`);

  const data = await resp.json();
  const items = data.data || data.rankings || [];
  const netRankings = {};
  const rankings = [];

  for (const item of items) {
    const rank = parseInt(item.RANK || item.rank || item.NET, 10);
    const rawTeam = item.SCHOOL || item.school || item.team || item.name || '';
    const team = normalizeTeamName(rawTeam.replace(/\([^)]*\)/g, '').trim());
    const record = item.RECORD || item.record || item['W-L'] || null;

    if (!rank || !team) continue;

    netRankings[team] = rank;
    rankings.push({ team, rank, record });
  }

  return { netRankings, rankings };
}

/**
 * Parse Barttorvik teamsheets HTML.
 */
function parseBarttorvik(html) {
  const netRankings = {};
  const rankings = [];

  if (!html) return { netRankings, rankings };

  // Detect Cloudflare challenge page
  if (html.includes('Verifying your browser') || html.includes('cf-challenge') || html.includes('cf_chl_opt')) {
    throw new Error('Barttorvik returned Cloudflare challenge page');
  }

  // Try embedded JSON in script tags
  const scriptDataMatch = html.match(/var\s+(?:teamData|data|rankings)\s*=\s*(\[[\s\S]*?\]);/);
  if (scriptDataMatch) {
    try {
      const data = JSON.parse(scriptDataMatch[1]);
      for (const item of data) {
        const rank = parseInt(item.net || item.rank || item.NET || item[0], 10);
        const rawTeam = item.team || item.name || item[1] || '';
        const team = normalizeTeamName(rawTeam.trim());
        const record = item.record || item.rec || item[2] || null;

        if (rank && team) {
          netRankings[team] = rank;
          rankings.push({ team, rank, record });
        }
      }
      if (rankings.length > 0) return { netRankings, rankings };
    } catch (e) { /* continue to table parsing */ }
  }

  // HTML table parsing with header detection
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables = html.match(tableRegex);
  if (!tables) throw new Error('No tables found in Barttorvik HTML');

  const rankingsTable = tables.reduce((best, t) =>
    (t.match(/<tr/gi) || []).length > (best.match(/<tr/gi) || []).length ? t : best
  );

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [...rankingsTable.matchAll(rowRegex)];

  let netCol = -1, teamCol = -1, recordCol = -1;

  if (rows.length > 0) {
    const headerCells = [...rows[0][1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)]
      .map(m => stripHTML(m[1]).trim().toLowerCase());

    for (let c = 0; c < headerCells.length; c++) {
      const h = headerCells[c];
      if (netCol === -1 && (h === 'net' || h === 'net rk' || h === 'net rank' || h === '#')) netCol = c;
      if (teamCol === -1 && (h === 'team' || h === 'school' || h === 'name')) teamCol = c;
      if (recordCol === -1 && (h === 'record' || h === 'rec' || h === 'w-l')) recordCol = c;
    }
  }

  if (teamCol === -1) teamCol = netCol === 0 ? 1 : 0;
  if (netCol === -1) netCol = teamCol === 0 ? 1 : 0;

  for (let i = 1; i < rows.length; i++) {
    const rowHTML = rows[i][1];
    if (rowHTML.includes('<th')) continue;

    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [...rowHTML.matchAll(cellRegex)].map(m => stripHTML(m[1]).trim());

    if (cells.length < 2) continue;

    const rank = parseInt(cells[netCol], 10);
    const team = normalizeTeamName(cells[teamCol] || '');

    if (!rank || !team || rank < 1 || rank > 363) continue;

    let record = recordCol >= 0 && recordCol < cells.length ? cells[recordCol] : null;
    if (!record) {
      for (let c = 0; c < cells.length; c++) {
        if (c !== netCol && c !== teamCol && /^\d+-\d+$/.test(cells[c])) {
          record = cells[c];
          break;
        }
      }
    }

    netRankings[team] = rank;
    rankings.push({ team, rank, record });
  }

  return { netRankings, rankings };
}

/**
 * Parse WarrenNolan full NET rankings page.
 */
function parseNetRankingsTable(html) {
  const netRankings = {};
  const rankings = [];
  const recordPattern = /\b(\d+-\d+)\b/;

  // Check for embedded JSON data in script tags
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

  try {
    // Try <pre> block
    const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (preMatch) {
      const lines = preMatch[1].split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) continue;

        const rank = parseInt(parts[0], 10);
        if (!rank || rank < 1 || rank > 363) continue;

        let teamName = parts.slice(1).join(' ');
        const recordMatch = teamName.match(recordPattern);
        const record = recordMatch ? recordMatch[1] : null;
        teamName = teamName.replace(/\s+(ACC|SEC|Big Ten|Big 12|Pac-12|Big East|AAC|MWC|WCC|A-10|MAC|C-USA|Sun Belt|WAC|Summit|Horizon|CAA|MVC|SoCon|Southland|NEC|MAAC|Ivy|Patriot|MEAC|SWAC|Big Sky|Big South|OVC|AEC|ASun).*$/i, '');
        teamName = normalizeTeamName(teamName.replace(/\s+\d+-\d+.*$/, '').trim());

        if (teamName && teamName.length > 1) {
          netRankings[teamName] = rank;
          rankings.push({ team: teamName, rank, record });
        }
      }
      if (rankings.length > 0) return { netRankings, rankings };
    }

    // HTML table parsing
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables = html.match(tableRegex);
    if (!tables) throw new Error('No tables or pre blocks found');

    const rankingsTable = tables.reduce((best, t) =>
      (t.match(/<tr/gi) || []).length > (best.match(/<tr/gi) || []).length ? t : best
    );

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = [...rankingsTable.matchAll(rowRegex)];

    for (let i = 1; i < rows.length; i++) {
      const rowHTML = rows[i][1];
      if (rowHTML.includes('<th')) continue;

      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells = [...rowHTML.matchAll(cellRegex)].map(m => stripHTML(m[1]).trim());

      if (cells.length < 2) continue;

      const rank = parseInt(cells[0], 10);
      const teamName = normalizeTeamName(cells[1]?.trim() || '');

      if (!rank || !teamName) continue;

      let record = null;
      for (let c = 2; c < cells.length; c++) {
        if (/^\d+-\d+$/.test(cells[c])) {
          record = cells[c];
          break;
        }
      }

      netRankings[teamName] = rank;
      rankings.push({ team: teamName, rank, record });
    }
  } catch (error) {
    throw new Error(`NET parse error: ${error.message}`);
  }

  return { netRankings, rankings };
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
