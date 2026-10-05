import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { sqliteAdapter } from '../../shared/sqlite-adapter.mjs';
import { parseScheduleEvent, seasonForDate, vestScoresRoute } from '../../shared/vest-scores.mjs';
const require = createRequire(import.meta.url);
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const request = (query = '') => new Request('https://coffee.example.test/api/vest/scores' + query);
const event = (id, date, opponent = 'Campbell') => ({ id, date, competitions: [{
  status: { type: { completed: true } },
  venue: { fullName: 'Kohl Center', address: { city: 'Madison' } },
  competitors: [
    { team: { id: '275', location: 'Wisconsin' }, score: { value: 96, displayValue: '96' }, linescores: [{ value: 47 }, { value: 49 }] },
    { team: { id: 'other', location: opponent }, score: { value: 64, displayValue: '64' }, linescores: [{ value: 30 }, { value: 34 }] },
  ],
}] });
async function fixture() {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await db.exec(await readFile(new URL('../../schema.sql', import.meta.url), 'utf8'));
  await db.run(`INSERT INTO vest_games (game_id,date,opponent,location,outfit,result,espn_event_id) VALUES
    (1,'2025-11-03','Campbell','vs','Black Vest','W','regular'),
    (2,'2026-03-20','High Point','N','Black Pullover','L','tournament'),
    (3,'2024-11-03','Old opponent','@','Black Zipup Vest','W','old')`);
  await db.run('UPDATE vest_state SET revision=7');
  await db.run("INSERT INTO vest_snapshots (games_json) VALUES ('[]')");
  return { db, DB: sqliteAdapter(db) };
}

test('ESPN scores parse objects and use the Chicago game date and season end year', () => {
  const parsed = parseScheduleEvent(event('regular', '2025-11-04T01:00Z'));
  assert.equal(parsed.date, '2025-11-03');
  assert.equal(parsed.wisconsinScore, 96);
  assert.equal(parsed.opponentScore, 64);
  assert.equal(parsed.wisconsinH1, 47);
  assert.equal(seasonForDate('2025-11-03'), 2026);
  assert.equal(seasonForDate('2026-03-20'), 2026);
  const incomplete = event('regular', '2025-11-04T01:00Z');
  delete incomplete.competitions[0].competitors[0].score;
  assert.equal(parseScheduleEvent(incomplete).wisconsinScore, null);
});

test('regular and tournament scores only enrich exact saved links without changing owner records', async () => {
  const { db, DB } = await fixture();
  try {
    const before = await db.all('SELECT * FROM vest_games ORDER BY game_id');
    const state = await db.get('SELECT * FROM vest_state');
    const snapshots = await db.all('SELECT * FROM vest_snapshots');
    const calls = [];
    const fetcher = async (url) => {
      calls.push(url);
      const regular = event('regular', '2025-11-04T01:00Z');
      return Response.json({ events: new URL(url).searchParams.get('seasontype') === '2'
        ? [regular, event('unrelated', '2025-11-04T01:00Z'), event('tournament', '2026-03-20T18:00Z', 'Wrong opponent')]
        : [regular, event('tournament', '2026-03-20T18:00Z', 'High Point')] });
    };
    const response = await vestScoresRoute(request(), DB, fetcher);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.season, '2026');
    assert.equal(data.source, 'espn');
    assert.deepEqual(data.games.map((game) => game.espn_event_id), ['regular', 'tournament']);
    assert.ok(calls.every((url) => new URL(url).searchParams.get('season') === '2026'));
    assert.deepEqual(calls.map((url) => new URL(url).searchParams.get('seasontype')), ['2', '3']);
    assert.equal((await db.get('SELECT count(*) AS count FROM vest_game_stats')).count, 2);
    assert.deepEqual(await db.all('SELECT * FROM vest_games ORDER BY game_id'), before);
    assert.deepEqual(await db.get('SELECT * FROM vest_state'), state);
    assert.deepEqual(await db.all('SELECT * FROM vest_snapshots'), snapshots);
  } finally { await db.close(); }
});

test('offline score cache excludes unlinked events and other seasons; invalid seasons fail before fetching', async () => {
  const { db, DB } = await fixture();
  try {
    await db.run("INSERT INTO vest_game_stats (espn_event_id,game_id,wisconsin_score,opponent_score) VALUES ('regular',1,96,64),('old',3,80,70),('orphan',99,12,20)");
    const offline = async () => { throw new Error('offline'); };
    const current = await (await vestScoresRoute(request(), DB, offline)).json();
    assert.equal(current.source, 'cache');
    assert.deepEqual(current.games.map((game) => game.espn_event_id), ['regular']);
    const old = await (await vestScoresRoute(request('?season=2025'), DB, offline)).json();
    assert.deepEqual(old.games.map((game) => game.espn_event_id), ['old']);
    assert.equal((await vestScoresRoute(request('?season=2027'), DB, offline)).status, 502);
    assert.equal((await vestScoresRoute(request('?season=bad'), DB, () => assert.fail('Invalid season fetched'))).status, 400);
    const wrong = await vestScoresRoute(request(), DB, async () => Response.json({ events: [event('regular', '2025-11-04T01:00Z', 'Wrong opponent')] }));
    assert.equal((await wrong.json()).games[0].wisconsin_score, 96);
  } finally { await db.close(); }
});
