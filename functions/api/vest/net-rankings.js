// GET /api/vest/net-rankings - Proxy NET ranking feed for frontend usage
// Supports both Cloudflare Pages Functions (onRequestGet) and Workers (default export).
//
// Tries multiple upstream sources for NET rankings:
//   1. NCAA.com direct scrape (known reachable)
//   2. NCAA API proxy at ncaa-api.henrygd.me (JSON, with pagination)
//   3. WarrenNolan /net page (fallback)

import { freshPayload } from './_freshCache.js';
import {
  itemsFromRankingPayload,
  parseGenericRankingsTable,
  rankingsFromItems,
} from './_netParse.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const NET_CACHE_TTL_MS = 5 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 8000;

let rankingsMemory = null;

function fetchUpstream(url) {
  return fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
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
          const resp = await fetchUpstream(url);
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
          const resp = await fetchUpstream(url);
          if (!resp.ok) {
            if (page === 1) throw new Error(`NCAA API returned ${resp.status}`);
            break;
          }
          const data = await resp.json();
          const pageResult = rankingsFromItems(itemsFromRankingPayload(data));
          if (pageResult.length === 0) break;
          for (const entry of pageResult) {
            if (!netRankings[entry.team]) {
              netRankings[entry.team] = entry.rank;
              rankings.push(entry);
            }
          }
          const totalPages = Number(data?.pages) || 1;
          if (page >= totalPages) break;
        }
        return rankings;
      },
    },
    {
      name: 'warrennolan',
      async fn() {
        const url = envNetRankingsUrl || 'https://www.warrennolan.com/basketball/2026/net';
        const resp = await fetchUpstream(url);
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
          headers: { 'Content-Type': 'application/json' },
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

function rankingsResponse(payload) {
  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

export function resetNetRankingsCache() {
  rankingsMemory = null;
}

export async function onRequestGet({ env }) {
  try {
    const cached = freshPayload(rankingsMemory, Date.now(), NET_CACHE_TTL_MS);
    if (cached) return rankingsResponse(cached);

    const response = await getNetRankingsResponse(env.NET_RANKINGS_URL);
    if (response.ok) {
      const payload = await response.clone().json();
      rankingsMemory = { storedAt: Date.now(), payload };
    }
    return response;
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
