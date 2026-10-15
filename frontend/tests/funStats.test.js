import test from 'node:test';
import assert from 'node:assert/strict';
import { funStats, milesBetween } from '../src/utils/funStats.js';

const visit = (o) => ({ date: '2026-09-05', coffee_shop_name: 'A', city: 'Madison, WI', coffee_rating: 8, vibe_rating: 8, ...o });

test('empty journals produce zeros, not NaN', () => {
  const s = funStats([]);
  assert.equal(s.stops, 0);
  assert.equal(s.farthest, null);
  assert.equal(s.topOrder, null);
  assert.deepEqual(s.weekdayCoffee, []);
});

test('counts shops, cities, states and perfect tens', () => {
  const s = funStats([
    visit({ shop_id: 1, coffee_rating: 10 }),
    visit({ shop_id: 1, date: '2026-09-06' }),
    visit({ shop_id: 2, city: 'Pasadena, CA', date: '2026-10-17', coffee_rating: 10 }),
  ]);
  assert.deepEqual([s.stops, s.shops, s.cities, s.states, s.perfectTens], [3, 2, 2, 2, 2]);
});

test('distance ignores hand-typed shops with no coordinates', () => {
  const s = funStats([
    visit({ coffee_shop_lat: null, coffee_shop_lng: null }),
    visit({ date: '2026-09-06', coffee_shop_name: 'LA', coffee_shop_lat: 34.14, coffee_shop_lng: -118.14 }),
  ]);
  assert.equal(s.farthest.shop, 'LA');
  assert.ok(s.farthest.miles > 1400 && s.farthest.miles < 1700);
  assert.equal(s.legMiles, 0);
  assert.ok(milesBetween({ lat: 0, lng: 0 }, { lat: 0, lng: 0 }) === 0);
});

test('weekday averages use local dates and skip unrated visits', () => {
  const s = funStats([visit({ date: '2026-10-17', coffee_rating: 9 }), visit({ date: '2026-10-24', coffee_rating: 7 }), visit({ date: '2026-10-18', coffee_rating: '' })]);
  assert.deepEqual(s.weekdayCoffee, [{ label: 'Sat', value: 8, count: 2 }]);
});

test('sports, favourite order and busiest month', () => {
  const s = funStats([
    visit({ sport: 'Football', coffee_order: 'Latte' }),
    visit({ sport: 'Football', coffee_order: ' latte ' }),
    visit({ sport: "Men's Hockey", coffee_order: 'Mocha', date: '2026-10-03' }),
  ]);
  assert.deepEqual(s.sports, [{ label: 'Football', value: 2 }, { label: "Men's Hockey", value: 1 }]);
  assert.deepEqual(s.topOrder, { order: 'latte', count: 2 });
  assert.deepEqual(s.busiestMonth, { label: 'September 2026', count: 2 });
  assert.deepEqual(s.spread.map((b) => b.value), [0, 0, 3, 0]);
});
