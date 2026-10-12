import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyNetRelease, collectNetRankings, netRankingsRoute, parseNcaaApiPayload } from '../../shared/net-rankings.mjs';

const now = new Date('2026-10-12T16:00:00Z');
const rows = (count, updated) => ({
  updated,
  pages: 1,
  data: Array.from({ length: count }, (_, index) => ({
    Rank: String(index + 1),
    School: index === 26 ? 'Wisconsin' : `Team ${index + 1}`,
    Record: '10-1',
  })),
});

test('April 2026 NET is last season and stays unreleased in October 2026', () => {
  assert.equal(classifyNetRelease({ updated: 'Through Games Apr. 06 2026', teamCount: 365, now }), 'unreleased');
  assert.equal(classifyNetRelease({ updated: 'Through Games Jan. 15 2027', teamCount: 300, now: new Date('2027-01-20T18:00:00Z') }), 'released');
  assert.equal(classifyNetRelease({ teamCount: 365, now }), 'unreleased');
  assert.equal(classifyNetRelease({ teamCount: 300, now: new Date('2027-01-20T18:00:00Z') }), 'released');
  const parsed = parseNcaaApiPayload(rows(365, 'Through Games Apr. 06 2026'));
  assert.equal(parsed.rankings.find((team) => team.team === 'Wisconsin').rank, 27);
});

test('the ncaa-api JSON is the primary source and an old updated date does not fall through', async () => {
  const calls = [];
  const fetcher = async (url) => {
    calls.push(url);
    return Response.json(rows(365, 'Through Games Apr. 06 2026'));
  };
  const payload = await collectNetRankings(fetcher, now);
  assert.equal(payload.status, 'unreleased');
  assert.equal(payload.season, 2027);
  assert.equal(payload.source, 'ncaa-api');
  assert.deepEqual(payload.rankings, []);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /ncaa-api\.henrygd\.me/);
});

test('a current-season JSON feed is served, and a dead primary source can use the NCAA page', async () => {
  const released = await collectNetRankings(async () => Response.json(rows(120, 'Through Games Jan. 15 2027')), new Date('2027-01-20T18:00:00Z'));
  assert.equal(released.status, 'released');
  assert.equal(released.rankings.length, 120);
  assert.equal(released.rankings[26].team, 'Wisconsin');

  const html = `<p>Through Games Jan. 18 2027</p><table><tr><th>Rank</th><th>School</th><th>Record</th></tr>${
    Array.from({ length: 60 }, (_, index) => `<tr><td>${index + 1}</td><td>${index === 0 ? 'Michigan' : `School ${index + 1}`}</td><td>12-2</td></tr>`).join('')
  }</table>`;
  let step = 0;
  const fallback = await collectNetRankings(async (url) => {
    step += 1;
    if (String(url).includes('ncaa-api')) return new Response('no', { status: 503 });
    if (String(url).includes('ncaa.com')) return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    throw new Error('warren should not be required');
  }, new Date('2027-01-20T18:00:00Z'));
  assert.equal(fallback.status, 'released');
  assert.equal(fallback.source, 'ncaa.com');
  assert.equal(fallback.rankings[0].team, 'Michigan');
  assert.equal(step, 2);
});

test('upstream failure serves a cached ranking and otherwise reports the outage', async () => {
  const request = new Request('https://vests.example.test/api/vest/net-rankings');
  const cachedBody = JSON.stringify({ status: 'unreleased', season: 2027, rankings: [], source: 'cache' });
  const cache = {
    async put() {},
    async match() { return new Response(cachedBody, { status: 200, headers: { 'Content-Type': 'application/json' } }); },
  };
  const failed = await netRankingsRoute(request, { fetcher: async () => { throw new Error('offline'); }, cache, now });
  assert.equal(failed.status, 200);
  assert.equal((await failed.json()).source, 'cache');

  const empty = await netRankingsRoute(request, {
    fetcher: async () => new Response('no', { status: 503 }),
    cache: { async put() {}, async match() { return undefined; } },
    now,
  });
  assert.equal(empty.status, 502);
  const fresh = await netRankingsRoute(request, {
    fetcher: async () => Response.json(rows(365, 'Through Games Apr. 06 2026')),
    cache: { saved: null, async put(_key, response) { this.saved = response.headers.get('Cache-Control'); }, async match() { return undefined; } },
    now,
  });
  assert.equal(fresh.status, 200);
  assert.equal(fresh.headers.get('Cache-Control'), 'public, max-age=3600');
  assert.equal((await fresh.json()).status, 'unreleased');
});
