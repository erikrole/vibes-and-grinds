import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { onRequestGet as autocomplete } from '../../functions/api/places-autocomplete.js';
import { onRequestGet as placeDetails } from '../../functions/api/places-details.js';
import { onRequestGet as statsGet } from '../../functions/api/stats.js';
import { onRequestPost as uploadPost } from '../../functions/api/upload.js';
import { onRequestDelete, onRequestGet as visitGet, onRequestPut } from '../../functions/api/visits/[id].js';
import { onRequestGet as visitsGet, onRequestPost as visitsPost } from '../../functions/api/visits.js';
import { onRequestPost as blurbPost } from '../../functions/api/vest/blurb.js';
import { resetGameStatsState, onRequestGet as gameStatsGet } from '../../functions/api/vest/game-stats/[eventId].js';
import { onRequestGet as gamesGet, onRequestPut as gamesPut } from '../../functions/api/vest/games.js';
import { onRequestGet as netGet, resetNetRankingsCache } from '../../functions/api/vest/net-rankings.js';
import { onRequestGet as scoresGet, resetScoreRouteState } from '../../functions/api/vest/scores.js';

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
  it('rejects invalid JSON, a bad date, and a non-object body', async () => {
    const db = createDb();
    const invalid = await jsonBody(await visitsPost({
      request: postJson('https://example.test/api/visits', '{'),
      env: envWith(db),
    }));
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error, 'Invalid JSON');

    const badDate = await jsonBody(await visitsPost({
      request: postJson('https://example.test/api/visits', {
        date: '2026-02-31',
        coffee_shop_name: 'Colectivo',
        vibe_rating: 8,
        coffee_rating: 7,
      }),
      env: envWith(db),
    }));
    assert.equal(badDate.status, 400);
    assert.equal(db.state.visits.length, 0);

    const arrayBody = await jsonBody(await visitsPost({
      request: postJson('https://example.test/api/visits', []),
      env: envWith(db),
    }));
    assert.equal(arrayBody.status, 400);
  });

  it('stores a trimmed date and a zero coordinate, then 404s a missing delete', async () => {
    const db = createDb();
    const created = await jsonBody(await visitsPost({
      request: postJson('https://example.test/api/visits', {
        date: ' 2026-10-16 ',
        coffee_shop_name: ' Colectivo ',
        vibe_rating: '8',
        coffee_rating: 7,
        coffee_shop_lat: 0,
        coffee_shop_lng: '0',
        visit_type: 'home',
      }),
      env: envWith(db),
    }));
    assert.equal(created.status, 201);
    assert.equal(created.body.date, '2026-10-16');
    assert.equal(created.body.coffee_shop_name, 'Colectivo');
    assert.equal(created.body.coffee_shop_lat, 0);
    assert.equal(created.body.coffee_shop_lng, 0);

    const missing = await visitGet({ params: { id: '99' }, env: envWith(db) });
    assert.equal(missing.status, 404);

    const removed = await onRequestDelete({ params: { id: '99' }, env: envWith(db) });
    assert.equal(removed.status, 404);
    const gone = await onRequestDelete({ params: { id: '1' }, env: envWith(db) });
    assert.equal(gone.status, 204);

    const updated = await jsonBody(await onRequestPut({
      params: { id: '1' },
      request: postJson('https://example.test/api/visits/1', {
        date: '2026-10-17',
        coffee_shop_name: 'Colectivo',
        vibe_rating: 8,
        coffee_rating: 7,
      }, 'PUT'),
      env: envWith(db),
    }));
    assert.equal(updated.status, 404);
  });

  it('rejects an oversized visit body before inserting', async () => {
    const db = createDb();
    const response = await visitsPost({
      request: postJson('https://example.test/api/visits', { notes: 'a'.repeat(300 * 1024) }),
      env: envWith(db),
    });
    assert.equal(response.status, 413);
    assert.equal(db.state.visits.length, 0);
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

  it('syncs games without a second write and keeps espn_event_id', async () => {
    const db = createDb();
    db.state.games.push({
      game_id: 5,
      date: '2025-11-21',
      location: 'N',
      opponent: 'BYU',
      ranking: 9,
      outfit: 'Puffer',
      result: 'L',
      overtime: 0,
      espn_event_id: '401',
    });

    const payload = {
      games: [
        { id: 5, date: '2025-11-21', location: 'vs', neutralSite: true, opponent: 'BYU', ranking: 9, outfit: 'Puffer', result: 'L' },
        { id: 5, opponent: 'BYU', date: '2026-02-31' },
      ],
    };
    const bad = await jsonBody(await gamesPut({
      request: postJson('https://example.test/api/vest/games', payload, 'PUT'),
      env: envWith(db),
    }));
    assert.equal(bad.status, 400);
    assert.equal(db.state.games[0].espn_event_id, '401');
    assert.equal(db.calls.some((call) => call.sql === 'BATCH'), false);

    const first = await jsonBody(await gamesPut({
      request: postJson('https://example.test/api/vest/games', {
        games: [{ id: 5, date: '2025-11-21', location: 'N', opponent: 'BYU', ranking: 9, outfit: 'Red Vest', result: 'L' }],
      }, 'PUT'),
      env: envWith(db),
    }));
    assert.equal(first.status, 200);
    assert.equal(first.body.saved, 1);
    assert.equal(db.state.games[0].outfit, 'Red Vest');
    assert.equal(db.state.games[0].espn_event_id, '401');
    const batches = db.calls.filter((call) => call.sql === 'BATCH').length;

    const second = await jsonBody(await gamesPut({
      request: postJson('https://example.test/api/vest/games', {
        games: [{ id: 5, date: '2025-11-21', location: 'N', opponent: 'BYU', ranking: 9, outfit: 'Red Vest', result: 'L' }],
      }, 'PUT'),
      env: envWith(db),
    }));
    assert.equal(second.body.skipped, 0);
    assert.equal(db.calls.filter((call) => call.sql === 'BATCH').length, batches);
    assert.equal(db.calls.some((call) => /delete from vest_games$/i.test(call.sql)), false);

    const listed = await jsonBody(await gamesGet({ env: envWith(db) }));
    assert.equal(listed.body.games[0].opponent, 'BYU');
    assert.equal(listed.body.games[0].overtime, false);
  });

  it('stores an object score for a neutral game and ignores a broken event', async () => {
    const db = createDb();
    db.state.games.push({
      game_id: 6,
      date: '2025-11-27',
      location: 'N',
      opponent: 'Providence',
      ranking: null,
      outfit: '',
      result: '',
      overtime: 0,
      espn_event_id: null,
    });
    globalThis.fetch = async (url) => {
      assert.match(String(url), /season=2026$/);
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
                  team: { id: '2507', displayName: 'Providence Friars' },
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
      env: envWith(db),
    }));
    assert.equal(badSeason.status, 400);

    const response = await jsonBody(await scoresGet({
      request: new Request('https://example.test/api/vest/scores?season=2026'),
      env: envWith(db),
    }));
    assert.equal(response.status, 200);
    assert.equal(response.body.source, 'espn');
    assert.equal(db.state.stats[0].wisconsin_score, 104);
    assert.equal(db.state.stats[0].opponent_score, 83);
    assert.equal(db.state.stats[0].broadcast, 'FS1');
    assert.equal(db.state.stats[0].wi_record, '5-1');
    assert.equal(db.state.games[0].espn_event_id, '401826890');
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

  it('accepts NCAA JSON that uses Rank and School when the HTML source fails', async () => {
    const teams = Array.from({ length: 55 }, (_item, index) => ({
      Rank: String(index + 1),
      School: index === 0 ? 'Michigan St.' : `Team ${index + 1}`,
      Record: '10-1',
    }));
    globalThis.fetch = async (url) => {
      const href = String(url);
      if (href.includes('ncaa.com')) return new Response('nope', { status: 503 });
      if (href.includes('henrygd')) {
        return new Response(JSON.stringify({ data: teams, pages: 1 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('missing', { status: 404 });
    };

    const response = await jsonBody(await netGet({ env: {} }));
    assert.equal(response.status, 200);
    assert.equal(response.body.source, 'ncaa-api');
    assert.equal(response.body.netRankings['MICHIGAN STATE'], 1);
    assert.equal(response.body.rankings.length, 55);
  });

  it('does not call the model for a missing key, bad JSON, or a huge blurb', async () => {
    let called = false;
    globalThis.fetch = async () => { called = true; return new Response('{}'); };

    const unconfigured = await jsonBody(await blurbPost({
      request: postJson('https://example.test/api/vest/blurb', { context: 'Red Vest' }),
      env: {},
    }));
    assert.equal(unconfigured.status, 503);

    const invalid = await jsonBody(await blurbPost({
      request: postJson('https://example.test/api/vest/blurb', '{'),
      env: { ANTHROPIC_API_KEY: 'test' },
    }));
    assert.equal(invalid.status, 400);

    const huge = await jsonBody(await blurbPost({
      request: postJson('https://example.test/api/vest/blurb', { context: 'a'.repeat(4001) }),
      env: { ANTHROPIC_API_KEY: 'test' },
    }));
    assert.equal(huge.status, 400);
    assert.equal(called, false);
  });
});

describe('visit list', () => {
  it('lists the rows the database returns', async () => {
    const db = createDb();
    db.state.visits.push({ id: 3, date: '2026-01-01', coffee_shop_name: 'Cafe' });
    const response = await jsonBody(await visitsGet({ env: envWith(db) }));
    assert.equal(response.status, 200);
    assert.equal(response.body[0].coffee_shop_name, 'Cafe');
  });
});
