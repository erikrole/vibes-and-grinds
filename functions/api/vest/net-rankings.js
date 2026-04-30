// GET /api/vest/net-rankings - Proxy NET ranking feed for frontend usage
// Supports both Cloudflare Pages Functions (onRequestGet) and Workers (default export).
//
// Tries multiple upstream sources for NET rankings:
//   1. NCAA.com direct scrape
//   2. NCAA API proxy at ncaa-api.henrygd.me
//   3. WarrenNolan /net page (fallback)

import { fetchAllNetRankings } from '../../../shared/ncaa.js';
import { json, jsonError } from '../../../shared/http.js';

export async function onRequestGet({ env }) {
  try {
    const { rankings, netRankings, source, errors } = await fetchAllNetRankings({
      warrenNolanUrl: env.NET_RANKINGS_URL,
    });

    if (rankings.length === 0) {
      return jsonError('All NET ranking sources failed.', 502, { details: errors });
    }

    return json({ rankings, netRankings, source });
  } catch (error) {
    console.error('Error fetching vest NET rankings:', error);
    return jsonError('Failed to fetch vest NET rankings', 502);
  }
}

export default {
  async fetch(_request, env) {
    return onRequestGet({ env });
  },
};
