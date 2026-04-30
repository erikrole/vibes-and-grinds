// GET /api/vest/net-rankings - Proxy NET ranking feed for frontend usage
// Supports both Cloudflare Pages Functions (onRequestGet) and Workers (default export).
//
// Tries multiple upstream sources for NET rankings:
//   1. NCAA.com direct scrape
//   2. NCAA API proxy at ncaa-api.henrygd.me
//   3. WarrenNolan /net page (fallback)

import { fetchAllNetRankings } from '../../../shared/ncaa.js';

export async function onRequestGet({ env }) {
  try {
    const { rankings, netRankings, source, errors } = await fetchAllNetRankings({
      warrenNolanUrl: env.NET_RANKINGS_URL,
    });

    if (rankings.length === 0) {
      return new Response(JSON.stringify({
        error: 'All NET ranking sources failed.',
        details: errors,
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ rankings, netRankings, source }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching vest NET rankings:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch vest NET rankings' }), {
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
