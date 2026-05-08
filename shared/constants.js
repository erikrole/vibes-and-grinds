// Shared constants used by both the Express backend and the Cloudflare
// Pages Functions. Keep this file framework-free (no Node-specifics, no
// Workers globals) so it can be imported from either runtime.

export const WISCONSIN_TEAM_ID = '275';

export const ESPN_SCHEDULE_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams';

export const ESPN_SUMMARY_BASE =
  'https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary';

export const DEFAULT_NET_RANKINGS_URL =
  'https://www.warrennolan.com/basketball/2026/net';

// External fetches go through this default timeout. Cloudflare Workers
// support `AbortSignal.timeout(ms)` natively; Node 18+ does too.
export const FETCH_TIMEOUT_MS = 10_000;

// How long to cache NET rankings / ESPN scoreboard responses in the runtime
// cache (KV / Cache API). 5 minutes is short enough that updates show up
// quickly during games but long enough to absorb traffic spikes.
export const EXTERNAL_CACHE_TTL_S = 300;

// Helpers that compose the constants. These are pure to keep them trivial
// to test.
export function espnTeamScheduleUrl(season, teamId = WISCONSIN_TEAM_ID) {
  return `${ESPN_SCHEDULE_BASE}/${teamId}/schedule?season=${season}`;
}

export function espnSummaryUrl(eventId) {
  return `${ESPN_SUMMARY_BASE}?event=${eventId}`;
}
