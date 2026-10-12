import test from 'node:test';
import assert from 'node:assert/strict';
import { toScheduleGame, toScheduleGames, vestScheduleRoute } from '../../shared/vest-schedule.mjs';

const request = (query = '') => new Request(`https://vests.example.test/api/vest/schedule${query}`);
const event = (id, date, { opponent = 'Denver', home = true, neutral = false, completed = false, wi = 70, opp = 60, rank = 99 } = {}) => ({
  id,
  date,
  competitions: [{
    neutralSite: neutral,
    status: { type: { completed } },
    competitors: [
      { team: { id: '275', location: 'Wisconsin' }, homeAway: home ? 'home' : 'away', score: completed ? { value: wi } : {} },
      { team: { id: 'other', location: opponent }, homeAway: home ? 'away' : 'home', score: completed ? { value: opp } : {}, curatedRank: { current: rank } },
    ],
  }],
});

test('a TBD tip stays on the announced date and does not invent a result', () => {
  const game = toScheduleGame(event('401920893', '2026-11-02T05:00:00Z'));
  assert.equal(game.date, '2026-11-02');
  assert.equal(game.opponent, 'Denver');
  assert.equal(game.location, 'vs');
  assert.equal(game.result, '');
  assert.equal(game.ranking, null);
  assert.equal(game.source, 'espn');
});

test('home, road, neutral, and ranked finals keep the saved-game shape', () => {
  assert.equal(toScheduleGame(event('road', '2026-12-02T01:00:00Z', { home: false })).location, '@');
  assert.equal(toScheduleGame(event('neutral', '2026-11-21T23:00:00Z', { neutral: true, home: false })).location, 'N');
  const win = toScheduleGame(event('final', '2026-11-08T01:00:00Z', { completed: true, rank: 8 }));
  assert.equal(win.result, 'W');
  assert.equal(win.ranking, 8);
  assert.equal(win.date, '2026-11-07');
  const loss = toScheduleGame(event('loss', '2026-11-08T01:00:00Z', { completed: true, wi: 60, opp: 70 }));
  assert.equal(loss.result, 'L');
});

test('the schedule route is read-only and falls back when the tournament slate is empty', async () => {
  const calls = [];
  const fetcher = async (url) => {
    calls.push(url);
    const type = new URL(url).searchParams.get('seasontype');
    if (type === '3') return Response.json({ events: [] });
    return Response.json({ events: [
      event('401920893', '2026-11-02T05:00:00Z'),
      event('later', '2027-03-06T23:00:00Z', { opponent: 'Michigan State', home: false }),
      event('401920893', '2026-11-02T05:00:00Z'),
    ] });
  };
  const response = await vestScheduleRoute(request('?season=2027'), fetcher);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.season, 2027);
  assert.equal(body.label, '2026–27');
  assert.equal(body.source, 'espn');
  assert.deepEqual(body.events.map((game) => game.opponent), ['Denver', 'Michigan State']);
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=900');
  assert.deepEqual(calls.map((url) => new URL(url).searchParams.get('seasontype')), ['2', '3']);
  assert.equal(toScheduleGames([]).length, 0);
});

test('an invalid season never calls ESPN', async () => {
  let called = false;
  const response = await vestScheduleRoute(request('?season=season'), async () => { called = true; return Response.json({ events: [] }); });
  assert.equal(response.status, 400);
  assert.equal(called, false);
});
