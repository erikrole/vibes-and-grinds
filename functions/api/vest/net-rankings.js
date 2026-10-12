import { netRankingsRoute } from '../../../shared/net-rankings.mjs';

export async function onRequestGet({ request }) {
  const cache = typeof caches === 'undefined' ? undefined : caches.default;
  return netRankingsRoute(request, { cache });
}

export default {
  async fetch(request) {
    return onRequestGet({ request });
  },
};
