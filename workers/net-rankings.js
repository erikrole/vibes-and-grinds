/**
 * Cloudflare Worker for Basketball NET Rankings + AP Poll
 *
 * Tries multiple sources for all D1 NET rankings, also fetches AP Poll
 * from NCAA.com. Parsing/source logic lives in shared/ncaa.js.
 */

import {
  UA,
  NCAA_URLS,
  fetchAllNetRankings,
  parseAPPoll,
} from '../shared/ncaa.js';

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
      const apPollPromise = fetch(NCAA_URLS.apPoll, { headers: { 'User-Agent': UA } })
        .then((r) => (r.ok ? r.text() : ''))
        .catch(() => '');

      const netResult = await fetchAllNetRankings();
      if (netResult.rankings.length === 0) {
        throw new Error('All NET ranking sources failed');
      }

      const apRankings = parseAPPoll(await apPollPromise);

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
