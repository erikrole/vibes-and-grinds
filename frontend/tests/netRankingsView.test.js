import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareNetRankings } from '../src/utils/netRankingsView.js';

test('NET rows with a missing team or a non-list payload do not throw', () => {
  const rows = prepareNetRankings(
    [null, { rank: 4 }, { team: 'Wisconsin', rank: 24, record: 18 }, { team: 'Duke', rank: 1, record: '12-3' }],
    { sortField: 'record', sortAsc: true },
  );
  assert.deepEqual(rows.map((row) => row.team), ['Duke', 'Wisconsin']);

  assert.deepEqual(prepareNetRankings({ Duke: 1 }), []);
  assert.deepEqual(prepareNetRankings(null, { query: 'duke' }), []);
});

test('NET search matches the team name only', () => {
  const rows = prepareNetRankings(
    [{ team: 'Wisconsin', rank: 40 }, { team: 'Duke', rank: 2 }],
    { query: 'wis' },
  );
  assert.deepEqual(rows.map((row) => row.team), ['Wisconsin']);
});
