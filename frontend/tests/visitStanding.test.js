import test from 'node:test';
import assert from 'node:assert/strict';
import { visitStanding } from '../src/utils/visitStanding.js';

const v = (id, o = {}) => ({ id, date: `2026-09-0${id}`, city: 'Madison, WI', coffee_rating: 8, vibe_rating: 8, composite_score: 16, ...o });

test('too few visits means no comparison, not a made-up rank', () => {
  const s = visitStanding(v(1), [v(1), v(2)]);
  assert.equal(s.coffee, null);
  assert.deepEqual(s.chips, []);
});

test('rank and delta against the journal average', () => {
  const list = [v(1, { coffee_rating: 6 }), v(2, { coffee_rating: 8 }), v(3, { coffee_rating: 10 })];
  const s = visitStanding(list[2], list);
  assert.deepEqual(s.coffee, { rank: 1, of: 3, delta: 2, average: 8 });
  assert.equal(visitStanding(list[0], list).coffee.rank, 3);
});

test('chips call out the best stop, first state and best in city', () => {
  const list = [v(1, { city: 'Madison, WI', composite_score: 15 }), v(2, { city: 'Eugene, OR', composite_score: 19, coffee_rating: 9.5, vibe_rating: 9.5 }), v(3, { city: 'Madison, WI', composite_score: 17 })];
  const s = visitStanding(list[1], list);
  assert.ok(s.chips.includes('Best stop yet'));
  assert.ok(s.chips.includes('First stop in OR'));
  assert.ok(visitStanding(list[2], list).chips.includes('Best in Madison'));
});
