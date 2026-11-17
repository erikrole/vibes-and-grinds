import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { sqliteAdapter } from '../../shared/sqlite-adapter.mjs';
import { onRequestGet as autocomplete } from '../../functions/api/places-autocomplete.js';
import { onRequestGet as placeDetails } from '../../functions/api/places-details.js';
import { onRequestGet as statsGet } from '../../functions/api/stats.js';
import { onRequestPost as uploadPost } from '../../functions/api/upload.js';
import * as visitRoute from '../../functions/api/visits/[id].js';
import * as visitsRoute from '../../functions/api/visits.js';
import { resetGameStatsState, onRequestGet as gameStatsGet } from '../../functions/api/vest/game-stats/[eventId].js';
import * as gamesRoute from '../../functions/api/vest/games.js';
import * as netRoute from '../../functions/api/vest/net-rankings.js';
import * as scoresRoute from '../../functions/api/vest/scores.js';

const require = createRequire(import.meta.url);
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

// main routes each Pages file through one `onRequest` (owner checks live in _middleware.js),
// so the per-method names this suite was written against map onto it. Handlers read
// `request.method`, so the wrappers below build the request the old per-method export implied.
const gamesGet = ({ env }) => gamesRoute.onRequest({ request: new Request('https://example.test/api/vest/games'), env });
const gamesPut = gamesRoute.onRequestPut ?? gamesRoute.onRequest;
const netGet = ({ env }) => netRoute.onRequestGet({ request: new Request('https://example.test/api/vest/net-rankings'), env });
const scoresGet = scoresRoute.onRequestGet ?? scoresRoute.onRequest;
// main's shared NET and score routes keep no in-isolate cache, so there is nothing to reset.
const resetNetRankingsCache = netRoute.resetNetRankingsCache ?? (() => {});
const resetScoreRouteState = scoresRoute.resetScoreRouteState ?? (() => {});

// main's visit and vest routes run real SQL (soft delete, revisions, shop resolution), so those
// tests use an in-memory SQLite built from schema.sql instead of the hand-written mock below.
async function realDb() {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await db.exec(await readFile(new URL('../../schema.sql', import.meta.url), 'utf8'));
  return { db, DB: sqliteAdapter(db) };
}

const visitCall = (env, method, id, body) => {
  const init = { method };
  if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);
  const request = new Request(`https://example.test/api/visits${id ? `/${id}` : ''}`, init);
  return id ? visitRoute.onRequest({ request, env, params: { id } }) : visitsRoute.onRequest({ request, env });
};

const originalFetch = globalThis.fetch;

function createDb() {
  const state = { visits: [], games: [], stats: [], nextVisitId: 1 };
  const calls = [];

  function query(sql, args) {
    const text = sql.replace(/\s+/g, ' ').trim();
    calls.push({ sql: text, args });
    const lower = text.toLowerCase();

    if (lower.startsWith('create') || lower.startsWith('alter')) {
      return { run: { success: true, meta: { changes: 0 } } };
    }

    if (lower.includes('count(*) as total_visits')) {
      return {
        results: [{
          total_visits: state.visits.length,
          avg_vibe: null,
          avg_coffee: null,
          avg_composite: null,
          best_composite: null,
        }],
      };
    }
    if (lower.includes('group by coffee_shop_name')) return { results: [] };

    if (lower.startsWith('insert into coffee_visits')) {
      const row = {
        id: state.nextVisitId,
        date: args[0],
        coffee_shop_name: args[1],
        coffee_shop_lat: args[8],
        coffee_shop_lng: args[9],
        vibe_rating: args[11],
        coffee_rating: args[12],
      };
      state.nextVisitId += 1;
      state.visits.push(row);
      return { run: { success: true, meta: { changes: 1, last_row_id: row.id } } };
    }
    if (lower.startsWith('update coffee_visits')) {
      const id = args[15];
      const row = state.visits.find((visit) => String(visit.id) === String(id));
      if (!row) return { run: { success: true, meta: { changes: 0 } } };
      row.date = args[0];
      row.coffee_shop_name = args[1];
      row.coffee_shop_lat = args[8];
      row.coffee_shop_lng = args[9];
      return { run: { success: true, meta: { changes: 1 } } };
    }
    if (lower.startsWith('delete from coffee_visits')) {
      const before = state.visits.length;
      state.visits = state.visits.filter((visit) => String(visit.id) !== String(args[0]));
      return { run: { success: true, meta: { changes: before - state.visits.length } } };
    }

    if (lower.includes('from coffee_visits where id')) {
      const row = state.visits.find((visit) => String(visit.id) === String(args[0])) || null;
      return { results: row ? [row] : [], first: row };
    }
    if (lower.includes('from coffee_visits')) return { results: [...state.visits] };

    if (lower.startsWith('delete from vest_games where game_id')) {
      state.games = state.games.filter((game) => Number(game.game_id) !== Number(args[0]));
      return { run: { success: true, meta: { changes: 1 } } };
    }
    if (lower.startsWith('update vest_games set espn_event_id = null')) {
      return { run: { success: true, meta: { changes: 0 } } };
    }
    if (lower.startsWith('update vest_games set espn_event_id')) {
      const game = state.games.find((row) => Number(row.game_id) === Number(args[1]));
      if (game) game.espn_event_id = args[0];
      return { run: { success: true, meta: { changes: game ? 1 : 0 } } };
    }
    if (lower.startsWith('update vest_games set')) {
      const game = state.games.find((row) => Number(row.game_id) === Number(args[7]));
      if (!game) return { run: { success: true, meta: { changes: 0 } } };
      Object.assign(game, {
        date: args[0], location: args[1], opponent: args[2], ranking: args[3],
        outfit: args[4], result: args[5], overtime: args[6],
      });
      return { run: { success: true, meta: { changes: 1 } } };
    }
    if (lower.startsWith('insert into vest_games')) {
      state.games.push({
        game_id: args[0], date: args[1], location: args[2], opponent: args[3],
        ranking: args[4], outfit: args[5], result: args[6], overtime: args[7],
        espn_event_id: null,
      });
      return { run: { success: true, meta: { changes: 1 } } };
    }
    if (lower.startsWith('insert into vest_game_stats')) {
      state.stats.push({
        id: state.stats.length + 1,
        espn_event_id: args[0],
        game_id: args[1],
        wisconsin_score: args[2],
        opponent_score: args[3],
        wisconsin_h1: args[4],
        broadcast: args[11],
        wi_record: args[15],
        fetched_at: '2020-01-01 00:00:00',
      });
      return { run: { success: true, meta: { changes: 1 } } };
    }
    if (lower.startsWith('update vest_game_stats set')) {
      const eventId = args[args.length - 1];
      const row = state.stats.find((stat) => String(stat.espn_event_id) === String(eventId));
      if (!row) return { run: { success: true, meta: { changes: 0 } } };
      const fields = [
        'wi_fg', 'wi_3pt', 'wi_ft', 'wi_rebounds', 'wi_turnovers',
        'wi_fg_pct', 'wi_3pt_pct', 'wi_ft_pct',
        'opp_fg', 'opp_3pt', 'opp_ft', 'opp_rebounds', 'opp_turnovers',
        'opp_fg_pct', 'opp_3pt_pct', 'opp_ft_pct',
        'wi_leader_pts_name', 'wi_leader_pts_value',
        'wi_leader_reb_name', 'wi_leader_reb_value',
        'wi_leader_ast_name', 'wi_leader_ast_value',
        'wisconsin_h1', 'wisconsin_h2', 'opponent_h1', 'opponent_h2', 'ot_periods',
      ];
      fields.forEach((field, index) => {
        row[field] = args[index];
      });
      return { run: { success: true, meta: { changes: 1 } } };
    }

    if (lower.includes('from vest_game_stats s')) {
      return {
        results: state.stats.map((stat) => {
          const game = state.games.find((row) => String(row.espn_event_id) === String(stat.espn_event_id));
          return {
            ...stat,
            outfit: game?.outfit ?? null,
            opponent: game?.opponent ?? null,
            date: game?.date ?? null,
            location: game?.location ?? null,
            result: game?.result ?? null,
            overtime: game?.overtime ?? null,
            game_id: game?.game_id ?? stat.game_id,
          };
        }),
      };
    }
    if (lower.includes('from vest_game_stats where espn_event_id')) {
      const row = state.stats.find((stat) => String(stat.espn_event_id) === String(args[0])) || null;
      return { results: row ? [row] : [], first: row };
    }
    if (lower.includes('from vest_game_stats')) return { results: state.stats.map((stat) => ({ ...stat })) };
    if (lower.includes('from vest_games')) return { results: state.games.map((game) => ({ ...game })) };

    throw new Error(`Unhandled SQL: ${lower}`);
  }

  function prepare(sql) {
    const runWith = (args) => {
      const result = query(sql, args);
      return {
        all: async () => ({ results: result.results || [] }),
        first: async () => result.first ?? null,
        run: async () => result.run || { success: true, meta: { changes: 0 } },
      };
    };
    return {
      bind(...args) { return runWith(args); },
      all: async () => runWith([]).all(),
      run: async () => runWith([]).run(),
      first: async () => runWith([]).first(),
    };
  }

  return {
    state,
    calls,
    prepare,
    batch: async (statements) => {
      calls.push({ sql: 'BATCH', args: [statements.length] });
      for (const statement of statements) await statement.run();
    },
  };
}

function envWith(db, extra = {}) {
  return { DB: db, ...extra };
}

async function jsonBody(response) {
  return { status: response.status, body: await response.json() };
}

function postJson(url, body, method = 'POST') {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: text,
  });
}

describe('visit handlers', () => {
  let ctx;
  beforeEach(async () => { ctx = await realDb(); });
  afterEach(async () => { await ctx.db.close(); });
  const rows = () => ctx.db.all('SELECT * FROM coffee_visits');
  const valid = { date: '2026-10-16', coffee_shop_name: 'Colectivo', vibe_rating: 8, coffee_rating: 7 };

  it('rejects invalid JSON, a bad date, and a non-object body', async () => {
    const env = { DB: ctx.DB };
    const invalid = await jsonBody(await visitCall(env, 'POST', null, '{'));
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error, 'Invalid visit details.');

    const badDate = await jsonBody(await visitCall(env, 'POST', null, { ...valid, date: '2026-02-31' }));
    assert.equal(badDate.status, 400);
    assert.equal((await rows()).length, 0);

    const arrayBody = await jsonBody(await visitCall(env, 'POST', null, []));
    assert.equal(arrayBody.status, 400);
    assert.equal((await rows()).length, 0);
  });

  it('stores a trimmed date and a zero coordinate, then 404s a missing delete', async () => {
    const env = { DB: ctx.DB };
    const created = await jsonBody(await visitCall(env, 'POST', null, {
      ...valid,
      date: ' 2026-10-16 ',
      coffee_shop_name: ' Colectivo ',
      vibe_rating: '8',
      coffee_shop_lat: 0,
      coffee_shop_lng: '0',
      visit_type: 'home',
    }));
    assert.equal(created.status, 201);
    assert.equal(created.body.date, '2026-10-16');
    assert.equal(created.body.coffee_shop_name, 'Colectivo');
    assert.equal(created.body.coffee_shop_lat, 0);
    assert.equal(created.body.coffee_shop_lng, 0);

    const missing = await visitCall(env, 'GET', '99');
    assert.equal(missing.status, 404);

    // main deletes softly; a missing id still 404s and the real one is gone from reads.
    const removed = await visitCall(env, 'DELETE', '99');
    assert.equal(removed.status, 404);
    const gone = await visitCall(env, 'DELETE', String(created.body.id));
    assert.equal(gone.status, 204);
    assert.equal((await visitCall(env, 'GET', String(created.body.id))).status, 404);

    const updated = await jsonBody(await visitCall(env, 'PUT', String(created.body.id), { ...valid, date: '2026-10-17' }));
    assert.equal(updated.status, 404);
  });

  it('rejects an oversized visit body before inserting', async () => {
    const response = await visitCall({ DB: ctx.DB }, 'POST', null, { ...valid, notes: 'a'.repeat(300 * 1024) });
    assert.equal(response.status, 413);
    assert.equal((await rows()).length, 0);
  });
});

describe('stats, upload, and places', () => {
  it('returns an empty stats payload', async () => {
    const db = createDb();
    const response = await jsonBody(await statsGet({ env: envWith(db) }));
    assert.equal(response.status, 200);
    assert.equal(response.body.total_visits, 0);
    assert.deepEqual(response.body.topShops, []);
  });

  it('rejects a missing, mistyped, or oversized photo and stores a jpeg', async () => {
    const puts = [];
    const env = {
      PHOTOS: { put: async (name, _stream, meta) => { puts.push({ name, meta }); } },
      R2_PUBLIC_URL: 'https://photos.example',
    };
    const missing = await jsonBody(await uploadPost({
      request: new Request('https://example.test/api/upload', { method: 'POST', body: new FormData() }),
      env,
    }));
    assert.equal(missing.status, 400);

    const text = new FormData();
    text.set('file', new File(['hello'], 'notes.txt', { type: 'text/plain' }));
    const wrongType = await jsonBody(await uploadPost({
      request: new Request('https://example.test/api/upload', { method: 'POST', body: text }),
      env,
    }));
    assert.equal(wrongType.status, 415);

    const huge = new FormData();
    huge.set('file', new File([new Uint8Array(12 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' }));
    const tooBig = await jsonBody(await uploadPost({
      request: new Request('https://example.test/api/upload', { method: 'POST', body: huge }),
      env,
    }));
    assert.equal(tooBig.status, 413);

    const okForm = new FormData();
    okForm.set('file', new File([new Uint8Array([1, 2, 3])], 'cup.jpg', { type: 'image/jpeg' }));
    const ok = await jsonBody(await uploadPost({
      request: new Request('https://example.test/api/upload', { method: 'POST', body: okForm }),
      env,
    }));
    assert.equal(ok.status, 200);
    assert.match(ok.body.url, /^https:\/\/photos\.example\/\d+-.*\.jpg$/);
    assert.equal(puts.length, 1);
    assert.equal(puts[0].meta.httpMetadata.contentType, 'image/jpeg');
  });

  it('guards places input before calling Google', async () => {
    let called = false;
    globalThis.fetch = async () => { called = true; return new Response('{}'); };
    const unconfigured = await jsonBody(await autocomplete({
      request: new Request('https://example.test/api/places-autocomplete?input=colectivo'),
      env: {},
    }));
    assert.equal(unconfigured.status, 503);
    assert.equal(called, false);

    const short = await jsonBody(await autocomplete({
      request: new Request('https://example.test/api/places-autocomplete?input=co'),
      env: { GOOGLE_MAPS_API_KEY: 'test-key' },
    }));
    assert.deepEqual(short.body.suggestions, []);

    const long = await jsonBody(await autocomplete({
      request: new Request(`https://example.test/api/places-autocomplete?input=${'a'.repeat(201)}`),
      env: { GOOGLE_MAPS_API_KEY: 'test-key' },
    }));
    assert.equal(long.status, 400);

    const missingId = await jsonBody(await placeDetails({
      request: new Request('https://example.test/api/places-details'),
      env: { GOOGLE_MAPS_API_KEY: 'test-key' },
    }));
    assert.equal(missingId.status, 400);

    const badId = await jsonBody(await placeDetails({
      request: new Request('https://example.test/api/places-details?placeId=a/b'),
      env: { GOOGLE_MAPS_API_KEY: 'test-key' },
    }));
    assert.equal(badId.status, 400);
    assert.equal(called, false);
  });
});

describe('vest handlers', () => {
  beforeEach(() => {
    resetScoreRouteState();
    resetGameStatsState();
    resetNetRankingsCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('syncs games, rejects a bad date without touching rows, and keeps espn_event_id', async () => {
    const { db, DB } = await realDb();
    try {
      await db.run(`INSERT INTO vest_games (game_id, date, location, opponent, ranking, outfit, result, overtime, espn_event_id)
        VALUES (5, '2025-11-21', 'N', 'BYU', 9, 'Puffer', 'L', 0, '401')`);
      const env = { DB };
      const put = async (body) => jsonBody(await gamesPut({
        request: postJson('https://example.test/api/vest/games', body, 'PUT'),
        env,
      }));
      const game = { id: 5, date: '2025-11-21', location: 'N', opponent: 'BYU', ranking: 9, outfit: 'Puffer', result: 'L' };
      const { body: { revision } } = await jsonBody(await gamesGet({ env }));
      const snapshots = async () => (await db.all('SELECT id FROM vest_snapshots')).length;

      // A bad calendar date rejects the whole sync: no rows, snapshots or revision change.
      const bad = await put({ revision, games: [game, { id: 5, opponent: 'BYU', date: '2026-02-31' }] });
      assert.equal(bad.status, 400);
      assert.equal((await db.get('SELECT * FROM vest_games WHERE game_id = 5')).espn_event_id, '401');
      assert.equal(await snapshots(), 0);
      assert.equal((await db.get('SELECT revision FROM vest_state')).revision, revision);
      const badSingle = await put({ revision, games: [{ ...game, date: '2026-02-31' }] });
      assert.equal(badSingle.status, 400);
      assert.equal((await db.get('SELECT outfit FROM vest_games WHERE game_id = 5')).outfit, 'Puffer');

      // A real edit saves, keeps the ESPN link the payload omitted, and bumps the revision.
      const first = await put({ revision, games: [{ ...game, outfit: 'Red Vest' }] });
      assert.equal(first.status, 200);
      assert.equal(first.body.saved, 1);
      assert.equal(first.body.revision, revision + 1);
      const stored = await db.get('SELECT * FROM vest_games WHERE game_id = 5');
      assert.equal(stored.outfit, 'Red Vest');
      assert.equal(stored.espn_event_id, '401');
      assert.equal(await snapshots(), 1);

      // Replaying the same payload at the old revision is refused instead of rewriting
      // the table (main's revision guard replaces the tracker's "skip identical rows").
      const replay = await put({ revision, games: [{ ...game, outfit: 'Red Vest' }] });
      assert.equal(replay.status, 409);
      assert.equal(await snapshots(), 1);
      assert.equal((await db.all('SELECT game_id FROM vest_games')).length, 1);
      assert.equal((await db.get('SELECT espn_event_id FROM vest_games WHERE game_id = 5')).espn_event_id, '401');

      const listed = await jsonBody(await gamesGet({ env }));
      assert.equal(listed.body.revision, revision + 1);
      assert.equal(listed.body.games[0].opponent, 'BYU');
      assert.equal(listed.body.games[0].espn_event_id, '401');
      assert.equal(listed.body.games[0].overtime, false);
    } finally {
      await db.close();
    }
  });

  it('stores an object score for a neutral game and ignores a broken event', async () => {
    const { db, DB } = await realDb();
    try {
      // main only enriches games already linked to an ESPN event (scores never edit owner records).
      await db.run(`INSERT INTO vest_games (game_id, date, location, opponent, outfit, result, overtime, espn_event_id)
        VALUES (6, '2025-11-27', 'N', 'Providence', '', '', 0, '401826890')`);
      const before = await db.get('SELECT * FROM vest_games WHERE game_id = 6');
      globalThis.fetch = async (url) => {
        if (String(url).includes('/summary')) return new Response('missing', { status: 404 });
        assert.match(String(url), /season=2026&seasontype=[23]$/);
        return new Response(JSON.stringify({
          events: [
            null,
            { id: '1', competitions: { bad: true } },
            {
              id: '401826890',
              date: '2025-11-27T23:00Z',
              competitions: [{
                neutralSite: true,
                attendance: 4955,
                venue: { fullName: 'Jenny Craig Pavilion', address: { city: 'San Diego' } },
                status: { type: { completed: true, description: 'Final', detail: 'Final' } },
                broadcasts: [{ media: { shortName: 'FS1' } }],
                competitors: [
                  {
                    homeAway: 'home',
                    team: { id: '275', displayName: 'Wisconsin Badgers' },
                    score: { value: 104, displayValue: '104' },
                    record: [{ type: 'total', displayValue: '5-1' }],
                  },
                  {
                    homeAway: 'away',
                    team: { id: '2507', location: 'Providence', displayName: 'Providence Friars' },
                    score: { value: 83, displayValue: '83' },
                  },
                ],
              }],
            },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      };

      const badSeason = await jsonBody(await scoresGet({
        request: new Request('https://example.test/api/vest/scores?season=2026abc'),
        env: { DB },
      }));
      assert.equal(badSeason.status, 400);

      const response = await jsonBody(await scoresGet({
        request: new Request('https://example.test/api/vest/scores?season=2026'),
        env: { DB },
      }));
      assert.equal(response.status, 200);
      assert.equal(response.body.source, 'espn');
      const stats = await db.all('SELECT * FROM vest_game_stats');
      assert.equal(stats.length, 1);
      assert.equal(stats[0].wisconsin_score, 104);
      assert.equal(stats[0].opponent_score, 83);
      assert.equal(stats[0].broadcast, 'FS1');
      assert.equal(stats[0].wi_record, '5-1');
      assert.equal(response.body.games[0].espn_event_id, '401826890');
      assert.deepEqual(await db.get('SELECT * FROM vest_games WHERE game_id = 6'), before);
    } finally {
      await db.close();
    }
  });

  it('fills 3P% and summary leaders that the old box-score parse missed', async () => {
    const db = createDb();
    db.state.stats.push({
      espn_event_id: '401826890',
      wi_fg: '37-77',
      wi_3pt_pct: null,
      wi_leader_pts_name: null,
      fetched_at: '2020-01-01 00:00:00',
    });
    globalThis.fetch = async (url) => {
      assert.match(String(url), /event=401826890$/);
      return new Response(JSON.stringify({
        boxscore: {
          teams: [
            {
              team: { id: '275' },
              statistics: [
                { label: 'FG', displayValue: '37-77' },
                { abbreviation: '3P%', displayValue: '35' },
              ],
            },
          ],
        },
        leaders: [{
          team: { id: '275' },
          leaders: [{ name: 'points', leaders: [{ displayValue: '36', athlete: { displayName: 'John Blackwell' } }] }],
        }],
        header: {
          competitions: [{
            competitors: [
              { id: '275', linescores: [{ displayValue: '51' }, { displayValue: '53' }] },
            ],
          }],
        },
      }), { status: 200 });
    };

    const badId = await jsonBody(await gameStatsGet({
      params: { eventId: '401&x=1' },
      env: envWith(db),
    }));
    assert.equal(badId.status, 400);

    const response = await jsonBody(await gameStatsGet({
      params: { eventId: '401826890' },
      env: envWith(db),
    }));
    assert.equal(response.status, 200);
    assert.equal(response.body.source, 'espn');
    assert.equal(response.body.stats.wi_3pt_pct, 35);
    assert.equal(response.body.stats.wi_leader_pts_name, 'John Blackwell');
    assert.equal(response.body.stats.wisconsin_h1, 51);

    globalThis.fetch = async () => { throw new Error('should have used the cache'); };
    const cached = await jsonBody(await gameStatsGet({
      params: { eventId: '401826890' },
      env: envWith(db),
    }));
    assert.equal(cached.body.source, 'cache');
  });

  it('keeps a saved box score when the summary is empty or only partial', async () => {
    const db = createDb();
    db.state.stats.push({
      espn_event_id: '401826890',
      wi_fg: '37-77',
      wi_rebounds: 43,
      wi_3pt_pct: null,
      wi_leader_pts_name: null,
      wisconsin_h1: 51,
      ot_periods: 1,
      fetched_at: '2020-01-01 00:00:00',
    });

    globalThis.fetch = async () => new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    const empty = await jsonBody(await gameStatsGet({
      params: { eventId: '401826890' },
      env: envWith(db),
    }));
    assert.equal(empty.status, 200);
    assert.equal(empty.body.source, 'cache-partial');
    assert.equal(empty.body.stats.wi_fg, '37-77');
    assert.equal(empty.body.stats.wisconsin_h1, 51);
    assert.equal(empty.body.stats.ot_periods, 1);
    assert.equal(db.calls.some((call) => call.sql.toLowerCase().startsWith('update vest_game_stats')), false);

    globalThis.fetch = async () => new Response(JSON.stringify({
      boxscore: {
        teams: [{
          team: { id: '275' },
          statistics: [{ abbreviation: '3P%', displayValue: '35' }],
        }],
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
    const partial = await jsonBody(await gameStatsGet({
      params: { eventId: '401826890' },
      env: envWith(db),
    }));
    assert.equal(partial.status, 200);
    assert.equal(partial.body.source, 'espn');
    assert.equal(partial.body.stats.wi_3pt_pct, 35);
    assert.equal(partial.body.stats.wi_fg, '37-77');
    assert.equal(partial.body.stats.wi_rebounds, 43);
    assert.equal(partial.body.stats.wisconsin_h1, 51);
    assert.equal(partial.body.stats.ot_periods, 1);
    assert.equal(db.state.stats[0].wi_fg, '37-77');
    assert.equal(db.state.stats[0].ot_periods, 1);
  });

  it('accepts NCAA JSON that uses Rank and School when the HTML source fails', async () => {
    const teams = Array.from({ length: 55 }, (_item, index) => ({
      Rank: String(index + 1),
      School: index === 0 ? 'Michigan St.' : `Team ${index + 1}`,
      Record: '10-1',
    }));
    // The route treats a feed as released only when its update date is in the current season.
    const updated = new Date().toLocaleDateString('en-US', {
      timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric',
    });
    globalThis.fetch = async (url) => {
      const href = String(url);
      if (href.includes('ncaa.com')) return new Response('nope', { status: 503 });
      if (href.includes('henrygd')) {
        return new Response(JSON.stringify({ data: teams, pages: 1, updated }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('missing', { status: 404 });
    };

    const response = await jsonBody(await netGet({ env: {} }));
    assert.equal(response.status, 200);
    assert.equal(response.body.source, 'ncaa-api');
    assert.equal(response.body.netRankings['Michigan St.'], 1);
    assert.equal(response.body.rankings.length, 55);
  });

});

describe('visit list', () => {
  it('lists the rows the database returns', async () => {
    const { db, DB } = await realDb();
    try {
      await db.run(`INSERT INTO coffee_visits (date, coffee_shop_name, vibe_rating, coffee_rating) VALUES ('2026-01-01', 'Cafe', 8, 7)`);
      await db.run(`INSERT INTO coffee_visits (date, coffee_shop_name, vibe_rating, coffee_rating, deleted_at) VALUES ('2026-01-02', 'Gone', 8, 7, CURRENT_TIMESTAMP)`);
      const response = await jsonBody(await visitCall({ DB }, 'GET'));
      assert.equal(response.status, 200);
      assert.equal(response.body.length, 1);
      assert.equal(response.body[0].coffee_shop_name, 'Cafe');
    } finally {
      await db.close();
    }
  });
});
