// GET /api/vest/net-rankings - Proxy NET ranking feed for frontend usage
// Supports both Cloudflare Pages Functions (onRequestGet) and Workers (default export).
//
// Tries multiple upstream sources for NET rankings:
//   1. NCAA.com direct scrape (known reachable)
//   2. NCAA API proxy at ncaa-api.henrygd.me (JSON, with pagination)
//   3. WarrenNolan /net page (fallback)

import {
  DEFAULT_NET_RANKINGS_URL,
  EXTERNAL_CACHE_TTL_S,
} from '../../../shared/constants.js';
import { normalizeTeamName, parseRankingsHtml } from '../../../shared/html-parsing.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Try to find rankings as embedded JSON first; fall back to HTML table parsing.
 */
function parseGenericRankingsTable(html = '') {
  if (!html) return [];

  const fromJson = parseEmbeddedJsonRankings(html);
  if (fromJson.length > 20) return fromJson;

  return parseRankingsHtml(html);
}

function parseEmbeddedJsonRankings(html) {
  const results = [];
  for (const match of html.matchAll(/(?:var|let|const)\s+\w+\s*=\s*(\[[\s\S]*?\]);/g)) {
    try {
      const arr = JSON.parse(match[1]);
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
    } catch { /* not JSON */ }
  }
  return results;
}

/**
 * Try multiple sources for NET rankings, return the first that succeeds.
 */
async function getNetRankingsResponse(envNetRankingsUrl) {
  const errors = [];
  const sources = [
    {
      name: 'ncaa.com',
      async fn() {
        const netRankings = {};
        const rankings = [];
        for (let page = 1; page <= 10; page++) {
          const url = page === 1
            ? 'https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings'
            : `https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings?page=${page}`;
          const resp = await fetch(url, { headers: { 'User-Agent': UA } });
          if (!resp.ok) {
            if (page === 1) throw new Error(`NCAA.com returned ${resp.status}`);
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
        return rankings;
      },
    },
    {
      name: 'ncaa-api',
      async fn() {
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
            if (rank && team && !netRankings[team]) {
              netRankings[team] = rank;
              rankings.push({ team, rank, record });
            }
          }
          const totalPages = data.pages || 1;
          if (page >= totalPages) break;
        }
        return rankings;
      },
    },
    {
      name: 'warrennolan',
      async fn() {
        const url = envNetRankingsUrl || DEFAULT_NET_RANKINGS_URL;
        const resp = await fetch(url, { headers: { 'User-Agent': UA } });
        if (!resp.ok) throw new Error(`WarrenNolan returned ${resp.status}`);
        const html = await resp.text();
        return parseGenericRankingsTable(html);
      },
    },
  ];

  for (const { name, fn } of sources) {
    try {
      const rankings = await fn();
      if (rankings.length > 50) {
        console.log(`NET rankings: ${rankings.length} teams from ${name}`);
        const netRankings = Object.fromEntries(
          rankings.map((entry) => [entry.team, entry.rank])
        );
        return new Response(JSON.stringify({ rankings, netRankings, source: name }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${EXTERNAL_CACHE_TTL_S}, s-maxage=${EXTERNAL_CACHE_TTL_S}`,
          },
        });
      }
      errors.push(`${name}: only ${rankings.length} teams`);
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
      console.error(`NET source ${name} failed:`, err.message);
    }
  }

  return new Response(JSON.stringify({
    error: 'All NET ranking sources failed.',
    details: errors,
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
