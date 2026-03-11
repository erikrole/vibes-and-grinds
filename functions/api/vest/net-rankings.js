// GET /api/vest/net-rankings - Proxy NET ranking feed for frontend usage
// Supports both Cloudflare Pages Functions (onRequestGet) and Workers (default export).

const DEFAULT_NET_RANKINGS_URL = 'https://www.warrennolan.com/basketball/2026/net';

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

async function getNetRankingsResponse(netRankingsUrl) {
  const response = await fetch(netRankingsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; vibes-and-grinds/1.0)',
    },
  });

  if (!response.ok) {
    return new Response(JSON.stringify({
      error: 'Failed to fetch NET rankings from upstream source.',
      status: response.status,
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('text/html')) {
    const html = await response.text();
    const rankings = parseNetRankingsHtml(html);

    if (!rankings.length) {
      return new Response(JSON.stringify({
        error: 'Failed to parse NET rankings from upstream HTML source.',
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const netRankings = Object.fromEntries(
      rankings.map((entry) => [entry.team.toUpperCase(), entry.rank])
    );

    return new Response(JSON.stringify({ rankings, netRankings, source: 'WarrenNolan' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestGet({ env }) {
  const netRankingsUrl = env.NET_RANKINGS_URL || DEFAULT_NET_RANKINGS_URL;

  try {
    return await getNetRankingsResponse(netRankingsUrl);
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
