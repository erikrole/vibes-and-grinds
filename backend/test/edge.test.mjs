import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readEventId, readJsonBody, readPlaceId, readSeason, optionalCoord } from '../../functions/api/_http.js';
import { matchVestGameId } from '../../functions/api/vest/_centralDate.js';
import {
  parseBoxScore,
  parseEspnEvent,
  scheduleGame,
} from '../../functions/api/vest/_espn.js';
import { planVestGameSync } from '../../functions/api/vest/_gameSync.js';
import {
  itemsFromRankingPayload,
  parseGenericRankingsTable,
  rankingsFromItems,
} from '../../functions/api/vest/_netParse.js';
import { planScoreSync } from '../../functions/api/vest/_scoreWrites.js';

const TEAM = '275';

function competitor(id, homeAway, extras = {}) {
  return {
    id,
    homeAway,
    team: { id, displayName: extras.name || 'Team' },
    score: extras.score,
    curatedRank: extras.rank == null ? undefined : { current: extras.rank },
    record: extras.record,
    linescores: extras.linescores,
    ...extras.rest,
  };
}

function event(overrides = {}) {
  return {
    id: '401826890',
    date: '2025-11-27T23:00Z',
    shortName: 'PROV VS WIS',
    competitions: [{
      neutralSite: true,
      attendance: 4955,
      venue: { fullName: 'Jenny Craig Pavilion', address: { city: 'San Diego' } },
      status: { type: { completed: true, description: 'Final', detail: 'Final', shortDetail: 'Final' } },
      broadcasts: [{ media: { shortName: 'FS1' }, names: undefined }],
      competitors: [
        competitor(TEAM, 'home', {
          name: 'Wisconsin Badgers',
          score: { value: 104, displayValue: '104' },
          record: [{ type: 'total', displayValue: '5-1' }],
        }),
        competitor('2507', 'away', { name: 'Providence Friars', score: { value: 83, displayValue: '83' } }),
      ],
    }],
    ...overrides,
  };
}

describe('Central dates', () => {
  it('rejects impossible calendar days instead of treating them as game days', () => {
    assert.equal(matchVestGameId([{ game_id: 1, date: '2026-02-31' }], '2026-02-31'), null);
  });
});

describe('ESPN schedule shape', () => {
  it('reads object scores, neutral sites, and overtime from the detail line', () => {
    const homeNeutral = parseEspnEvent(event());
    assert.equal(homeNeutral.location, 'N');
    assert.equal(homeNeutral.wisconsinScore, 104);
    assert.equal(homeNeutral.opponentScore, 83);
    assert.equal(homeNeutral.result, 'W');
    assert.equal(homeNeutral.broadcast, 'FS1');
    assert.equal(homeNeutral.wiRecord, '5-1');
    assert.equal(homeNeutral.gameDate, '2025-11-27');

    const awayNeutral = event({
      id: '401831224',
      date: '2025-11-28T22:30Z',
      competitions: [{
        neutralSite: true,
        status: { type: { completed: true, description: 'Final', detail: 'Final/OT', shortDetail: 'Final/OT', altDetail: 'OT' } },
        broadcasts: [{ media: { shortName: 'Fox' } }],
        competitors: [
          competitor('2529', 'home', { name: 'TCU Horned Frogs', score: '72' }),
          competitor(TEAM, 'away', { name: 'Wisconsin Badgers', score: '63' }),
        ],
      }],
    });
    const parsed = parseEspnEvent(awayNeutral);
    assert.equal(parsed.location, 'N');
    assert.equal(parsed.overtime, true);
    assert.equal(parsed.result, 'L');
    assert.equal(parsed.wisconsinScore, 63);

    const scheduled = scheduleGame(event({ date: '2025-11-04T01:00Z' }));
    assert.equal(scheduled.date, '2025-11-03');
    assert.equal(scheduled.location, 'N');

    // map passes the index as the second argument. That must not replace team 275.
    const mapped = [null, event()].map(parseEspnEvent).filter(Boolean);
    assert.equal(mapped.length, 1);
    assert.equal(mapped[0].wisconsinScore, 104);
    assert.equal(mapped[0].location, 'N');
  });

  it('does not throw when an event or a competitors list is the wrong shape', () => {
    assert.equal(parseEspnEvent(null), null);
    assert.equal(parseEspnEvent({ id: '1', competitions: [{ competitors: { home: {} } }] }), null);
    assert.equal(parseEspnEvent({ id: '', competitions: [] }), null);
    assert.equal(scheduleGame(undefined), null);
    const tied = parseEspnEvent(event());
    tied.wisconsinScore = 70;
    const equal = parseEspnEvent({
      id: '9',
      date: '2026-01-01T01:00Z',
      competitions: [{
        neutralSite: false,
        status: { type: { completed: true, description: 'Final' } },
        competitors: [
          competitor(TEAM, 'home', { score: '70' }),
          competitor('1', 'away', { name: 'Iowa', score: '70' }),
        ],
      }],
    });
    assert.equal(equal.result, '');
    assert.equal(equal.location, 'vs');
  });

  it('keeps a blank score null instead of turning it into zero', () => {
    const parsed = parseEspnEvent({
      id: '8',
      date: '2026-01-02T01:00Z',
      competitions: [{
        status: { type: { completed: true, description: 'Final' } },
        competitors: [
          competitor(TEAM, 'home', { score: '' }),
          competitor('1', 'away', { name: 'Iowa', score: null }),
        ],
      }],
    });
    assert.equal(parsed.wisconsinScore, null);
    assert.equal(parsed.opponentScore, null);
    assert.equal(parsed.result, '');
  });
});

describe('ESPN summary shape', () => {
  it('reads 3P% and leaders from the current summary, plus displayValue linescores', () => {
    const summary = {
      boxscore: {
        teams: [
          {
            team: { id: TEAM },
            statistics: [
              { label: 'FG', displayValue: '37-77' },
              { abbreviation: 'FG%', displayValue: '48' },
              { label: '3PT', displayValue: '14-40' },
              { abbreviation: '3P%', label: 'Three Point %', displayValue: '35' },
              { abbreviation: 'REB', label: 'Rebounds', displayValue: '43' },
              { abbreviation: 'TO', label: 'Turnovers', displayValue: '8' },
            ],
          },
          {
            team: { id: '2507' },
            statistics: [{ label: 'FG', displayValue: '30-60' }],
          },
        ],
      },
      leaders: [{
        team: { id: TEAM },
        leaders: [
          { name: 'points', leaders: [{ displayValue: '36', athlete: { displayName: 'John Blackwell' } }] },
          { name: 'rebounds', leaders: [{ displayValue: '9', athlete: { displayName: 'Nolan Winter' } }] },
          { abbreviation: 'AST', leaders: [{ displayValue: '7', athlete: { displayName: 'Nick Boyd' } }] },
        ],
      }],
      header: {
        competitions: [{
          competitors: [
            { id: TEAM, linescores: [{ displayValue: '51' }, { displayValue: '53' }] },
            { id: '2507', team: { id: '2507' }, linescores: [{ displayValue: '40' }, { displayValue: '43' }] },
          ],
        }],
      },
    };

    const box = parseBoxScore(summary);
    assert.equal(box.wi_fg, '37-77');
    assert.equal(box.wi_3pt_pct, 35);
    assert.equal(box.wi_rebounds, 43);
    assert.equal(box.wi_leader_pts_name, 'John Blackwell');
    assert.equal(box.wi_leader_pts_value, '36');
    assert.equal(box.wi_leader_ast_name, 'Nick Boyd');
    assert.equal(box.wisconsin_h1, 51);
    assert.equal(box.opponent_h2, 43);
    assert.equal(box.opp_fg, '30-60');
    assert.equal(box.ot_periods, 0);
  });

  it('returns null fields instead of throwing when the summary is empty or malformed', () => {
    assert.equal(parseBoxScore(null), null);
    const box = parseBoxScore({ boxscore: { teams: { not: 'an array' } }, leaders: 'nope' });
    assert.equal(box.wi_fg, null);
    assert.equal(box.wi_leader_pts_name, null);
    assert.equal(box.wisconsin_h1, null);
    assert.equal(box.ot_periods, null);
  });

  it('treats overtime as its own word, not letters inside another word', () => {
    const base = {
      id: '9',
      date: '2026-01-02T01:00Z',
      competitions: [{
        status: { type: { completed: true, description: 'Final', detail: 'shot' } },
        competitors: [
          competitor(TEAM, 'home', { score: '70' }),
          competitor('1', 'away', { name: 'Iowa', score: '60' }),
        ],
      }],
    };
    assert.equal(parseEspnEvent(base).overtime, false);
    base.competitions[0].status.type.detail = 'Final/OT';
    assert.equal(parseEspnEvent(base).overtime, true);
    base.competitions[0].status.type.detail = 'Final/2OT';
    assert.equal(parseEspnEvent(base).overtime, true);
  });
});

describe('score sync does not wipe stored numbers', () => {
  it('keeps the stored score when a later payload has a null score and still applies a real change', () => {
    const plan = planScoreSync({
      vestRows: [{ game_id: 13, date: '2025-12-30', espn_event_id: '401' }],
      existingStats: [{
        espn_event_id: '401',
        game_id: 13,
        wisconsin_score: 80,
        opponent_score: 62,
        wisconsin_h1: 40,
        wisconsin_h2: 40,
        opponent_h1: 30,
        opponent_h2: 32,
        ot_periods: 0,
        venue: 'Kohl Center',
        venue_city: 'Madison',
        broadcast: 'BTN',
        attendance: 17287,
        opp_ranking: null,
        wi_ranking: null,
        wi_record: '10-3',
      }],
      games: [{
        espnEventId: '401',
        date: '2025-12-31T00:00Z',
        completed: true,
        wisconsinScore: null,
        opponentScore: null,
        wisconsinH1: null,
        wisconsinH2: null,
        opponentH1: null,
        opponentH2: null,
        otPeriods: 0,
        venue: 'New Arena',
        venueCity: 'Madison',
        broadcast: 'BTN',
        attendance: 17287,
        oppRanking: null,
        wiRanking: null,
        wiRecord: '10-3',
      }],
    });

    assert.equal(plan.upserts.length, 1);
    assert.equal(plan.upserts[0].game.wisconsinScore, 80);
    assert.equal(plan.upserts[0].game.wisconsinH1, 40);
    assert.equal(plan.upserts[0].game.venue, 'New Arena');
    assert.equal(plan.links.length, 0);
  });
});

describe('vest game sync', () => {
  const stored = [{
    game_id: 5,
    date: '2025-11-21',
    location: 'N',
    opponent: 'BYU',
    ranking: 9,
    outfit: 'Puffer',
    result: 'L',
    overtime: 0,
    espn_event_id: '401',
  }];

  it('writes nothing when the payload matches, and labels a neutral flag N', () => {
    const same = planVestGameSync(stored, [{
      id: 5, date: '2025-11-21', location: 'N', opponent: 'BYU', ranking: 9, outfit: 'Puffer', result: 'L',
    }]);
    assert.deepEqual(same.inserts, []);
    assert.deepEqual(same.updates, []);
    assert.deepEqual(same.deletes, []);

    const neutral = planVestGameSync([], [{
      id: 7, date: '2025-11-28', location: 'vs', neutralSite: true, opponent: 'TCU', result: 'L',
    }]);
    assert.equal(neutral.inserts[0].location, 'N');
  });

  it('rejects a bad date before any write and keeps the last copy of a duplicate id', () => {
    const bad = planVestGameSync(stored, [{ id: 5, date: '2026-02-31', opponent: 'BYU' }]);
    assert.equal(bad.error, 'Game 5 date must be a real YYYY-MM-DD day');

    const dupes = planVestGameSync([], [
      { id: 1, opponent: 'First' },
      { id: '1', opponent: 'Second', location: '@' },
      { opponent: 'Skipped' },
    ]);
    assert.equal(dupes.inserts.length, 1);
    assert.equal(dupes.inserts[0].opponent, 'Second');
    assert.equal(dupes.inserts[0].location, '@');
    assert.equal(dupes.skipped, 2);
    assert.equal(dupes.saved, 1);
  });
});

describe('NET payload shapes', () => {
  it('reads Rank/School JSON, nested data, and a rank that lives in a row header', () => {
    const items = rankingsFromItems([
      { Rank: '1', School: 'Michigan St.', Record: '20-1' },
      null,
      { School: { name: 'Ohio St.' }, Rank: '2', Record: '19-2' },
      { RANK: '3', SCHOOL: 'Duke', RECORD: '18-3' },
    ]);
    assert.deepEqual(items.map((item) => item.team), ['MICHIGAN STATE', 'OHIO STATE', 'DUKE']);

    const nested = itemsFromRankingPayload({ data: { rankings: [{ rank: 4, team: 'Purdue', record: '17-4' }] } });
    assert.equal(rankingsFromItems(nested)[0].team, 'PURDUE');
    assert.deepEqual(itemsFromRankingPayload(null), []);
    assert.deepEqual(itemsFromRankingPayload({ data: { oops: true } }), []);

    const html = `
      <table>
        <tr><th>Rank</th><th>School</th><th>Record</th></tr>
        <tr><th scope="row">1</th><td>Michigan St.</td><td>20-1</td></tr>
        <tr><td>2</td><td>Duke</td><td>18-3</td></tr>
      </table>`;
    const table = parseGenericRankingsTable(html);
    assert.equal(table[0].team, 'MICHIGAN STATE');
    assert.equal(table[0].rank, 1);
    assert.equal(table[0].record, '20-1');
    assert.equal(table[1].team, 'DUKE');
  });

  it('does not throw when the HTML table parser is given a non-string', () => {
    assert.deepEqual(parseGenericRankingsTable(null), []);
    assert.deepEqual(rankingsFromItems({ length: 3 }), []);
  });
});

describe('request guards', () => {
  it('rejects bad seasons, event ids, place ids, and oversized JSON', async () => {
    assert.equal(readSeason(undefined), '2025');
    assert.equal(readSeason(''), '2025');
    assert.equal(readSeason('2026'), '2026');
    assert.equal(readSeason('2026abc'), null);
    assert.equal(readSeason('26'), null);
    assert.equal(readEventId('401826890'), '401826890');
    assert.equal(readEventId('401826890&x=1'), null);
    assert.equal(readEventId('../etc'), null);
    assert.equal(optionalCoord(0), 0);
    assert.equal(optionalCoord(' 0 '), 0);
    assert.equal(optionalCoord(''), null);
    assert.equal(optionalCoord('nope'), null);
    assert.equal(readPlaceId('').error, 'placeId is required.');
    assert.equal(readPlaceId('ChIJ_abc-123').id, 'ChIJ_abc-123');
    assert.equal(readPlaceId('a/b').status, 400);

    const huge = new Request('https://example.test/api/visits', {
      method: 'POST',
      body: `{"notes":"${'a'.repeat(300 * 1024)}"}`,
    });
    const tooBig = await readJsonBody(huge);
    assert.equal(tooBig.status, 413);

    const bad = new Request('https://example.test/api/visits', { method: 'POST', body: '{' });
    const invalid = await readJsonBody(bad);
    assert.equal(invalid.status, 400);
  });
});
