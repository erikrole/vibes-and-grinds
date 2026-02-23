/**
 * Cloudflare Worker for Basketball NET Rankings + AP Poll
 * Fetches all D1 teams from WarrenNolan NET page + AP Poll from NCAA
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
      const [netResponse, apPollResponse] = await Promise.all([
        fetch('https://www.warrennolan.com/basketball/2026/net', {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VestTracker/1.0)' },
        }),
        fetch('https://www.ncaa.com/rankings/basketball-men/d1/associated-press', {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VestTracker/1.0)' },
        }),
      ]);

      if (!netResponse.ok) {
        throw new Error(`WarrenNolan returned ${netResponse.status}`);
      }

      const netHTML = await netResponse.text();
      const apPollHTML = apPollResponse.ok ? await apPollResponse.text() : '';

      const netRankings = parseNetRankingsTable(netHTML);
      if (Object.keys(netRankings).length === 0) {
        throw new Error('No NET rankings data found');
      }

      const apRankings = parseAPPoll(apPollHTML);

      return new Response(JSON.stringify({ netRankings, apRankings }), {
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
 * Parse WarrenNolan full NET rankings page (/basketball/2026/net)
 * Returns { "DUKE": 1, "AUBURN": 2, ... }
 */
function parseNetRankingsTable(html) {
  const rankings = {};

  try {
    // Try to find pre-formatted text data (some pages return plain text tables)
    const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (preMatch) {
      const lines = preMatch[1].split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) continue;

        const rank = parseInt(parts[0], 10);
        if (!rank || rank < 1 || rank > 363) continue;

        // Team name is everything after the rank until we hit numbers/conference
        let teamName = parts.slice(1).join(' ');
        // Remove trailing conference/record info
        teamName = teamName.replace(/\s+(ACC|SEC|Big Ten|Big 12|Pac-12|Big East|AAC|MWC|WCC|A-10|MAC|C-USA|Sun Belt|WAC|Summit|Horizon|CAA|MVC|SoCon|Southland|NEC|MAAC|Ivy|Patriot|MEAC|SWAC|Big Sky|Big South|OVC|AEC|ASun).*$/i, '');
        teamName = teamName.replace(/\s+\d+-\d+.*$/, '').trim().toUpperCase();

        if (teamName && teamName.length > 1) {
          rankings[teamName] = rank;
        }
      }
      if (Object.keys(rankings).length > 0) return rankings;
    }

    // Fallback: try HTML table parsing
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
      const teamName = cells[1]?.trim().toUpperCase();

      if (!rank || !teamName) continue;

      rankings[teamName] = rank;
    }
  } catch (error) {
    throw new Error(`NET parse error: ${error.message}`);
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

/**
 * Normalize team names for consistency
 */
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
 * Strip HTML tags and decode entities
 */
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
