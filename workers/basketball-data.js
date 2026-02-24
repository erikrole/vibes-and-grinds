/**
 * Cloudflare Worker for Basketball Data
 *
 * Fetches from two WarrenNolan pages in parallel:
 *   1. Big Ten conference standings (/conference/Big-Ten) — conf records, overall records, NET
 *   2. Full D1 NET rankings (/net-rankings) — all ~360 teams, used for non-Big Ten opponent lookups
 *
 * Also fetches AP Poll from NCAA.com.
 *
 * Response shape:
 *   {
 *     standings: [ { team, conf, ovr, apRank, netRank, wins, losses, confWins, confLosses } ],
 *     netRankings: { "DUKE": 1, "BYU": 14, ... }   // all D1 teams
 *   }
 */

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
      const [conferenceResponse, netPageResponse, apPollResponse] = await Promise.all([
        fetch('https://www.warrennolan.com/basketball/2026/conference/Big-Ten', {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VestTracker/1.0)' },
        }),
        fetch('https://www.warrennolan.com/basketball/2026/net', {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VestTracker/1.0)' },
        }),
        fetch('https://www.ncaa.com/rankings/basketball-men/d1/associated-press', {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VestTracker/1.0)' },
        }),
      ]);

      if (!conferenceResponse.ok) {
        throw new Error(`WarrenNolan conference returned ${conferenceResponse.status}`);
      }

      const conferenceHTML = await conferenceResponse.text();
      const netPageHTML = netPageResponse.ok ? await netPageResponse.text() : '';
      const apPollHTML = apPollResponse.ok ? await apPollResponse.text() : '';

      // Big Ten standings with conf records + NET
      const standings = parseConferenceTable(conferenceHTML);
      if (!standings || standings.length === 0) {
        throw new Error('No standings data found');
      }

      // AP rankings
      const apRankings = parseAPPoll(apPollHTML);
      for (const team of standings) {
        team.apRank = apRankings[team.team] ?? 999;
      }

      // Full D1 NET rankings map — covers non-Big Ten opponents
      const netRankings = parseNetRankingsPage(netPageHTML);

      // Backfill netRankings with Big Ten data we already have
      for (const team of standings) {
        if (team.netRank && !netRankings[team.team]) {
          netRankings[team.team] = team.netRank;
        }
      }

      return new Response(JSON.stringify({ standings, netRankings }), {
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
 * Returns { "DUKE": 1, "AUBURN": 2, ... } for all D1 teams.
 *
 * NET page columns: NET Rank | Team | Conference | Record | ...
 * If results look wrong, check the Cloudflare Worker logs and adjust
 * RANK_COL / TEAM_COL below to match the actual column positions.
 */
function parseNetRankingsPage(html) {
  const rankings = {};

  if (!html) return rankings;

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
      teamName = teamName.replace(
        /\s+(ACC|SEC|Big Ten|Big 12|Pac-12|Big East|AAC|MWC|WCC|A-10|MAC|C-USA|Sun Belt|WAC|Summit|Horizon|CAA|MVC|SoCon|Southland|NEC|MAAC|Ivy|Patriot|MEAC|SWAC|Big Sky|Big South|OVC|AEC|ASun).*$/i,
        ''
      );
      teamName = normalizeTeamName(teamName.replace(/\s+\d+-\d+.*$/, '').trim());

      if (teamName && teamName.length > 1) {
        rankings[teamName] = rank;
      }
    }
    if (Object.keys(rankings).length > 0) return rankings;
  }

  // Fallback: HTML table parsing
  // Adjust these if the column positions differ on the actual page
  const RANK_COL = 0;
  const TEAM_COL = 1;

  try {
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables = html.match(tableRegex);
    if (!tables) return rankings;

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

      rankings[teamName] = rank;
    }
  } catch (error) {
    // Non-fatal — standings still work without the full NET map
    console.error('NET rankings parse error:', error.message);
  }

  return rankings;
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
