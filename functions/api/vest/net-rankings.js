// GET /api/vest/net-rankings - Proxy NET ranking feed for frontend usage

const DEFAULT_NET_RANKINGS_URL = 'https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings';

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

function parseNcaaNetRankings(html = '') {
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [...html.matchAll(rowRegex)];
  const rankings = [];

  for (const match of rows) {
    const rowHtml = match[1] || '';
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    const cells = [...rowHtml.matchAll(cellRegex)].map((cellMatch) => stripHtmlTags(cellMatch[1]));

    if (cells.length < 2) continue;

    const rank = Number.parseInt(cells[0], 10);
    if (!Number.isFinite(rank)) continue;

    const team = cells[1]?.trim();
    if (!team) continue;

    rankings.push({ team, rank });
  }

  return rankings;
}

export async function onRequestGet({ env }) {
  const netRankingsUrl = env.NET_RANKINGS_URL || DEFAULT_NET_RANKINGS_URL;

  try {
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
      const rankings = parseNcaaNetRankings(html);

      if (!rankings.length) {
        return new Response(JSON.stringify({
          error: 'Failed to parse NCAA NET rankings from upstream HTML source.',
        }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ rankings, source: 'NCAA' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
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
