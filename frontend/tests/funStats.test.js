import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFunStats, haversineMiles } from '../src/utils/funStats.js';

const visit = (id, date, over = {}) => ({ id, date, coffee_shop_name: `Shop ${id}`, city: 'Madison, WI', coffee_order: 'Latte', vibe_rating: 8, coffee_rating: 8, visit_type: 'road', ...over });

test('empty and unrated journals have no fun stats', () => {
  assert.equal(computeFunStats([]), null);
  assert.equal(computeFunStats([visit(1, '2026-01-01', { vibe_rating: '' })]), null);
});

test('counts, streaks, orders and cities roll up from the journal', () => {
  const stats = computeFunStats([
    visit(1, '2026-01-10', { coffee_rating: 9, city: 'Ann Arbor, MI', coffee_order: 'oat latte' }),
    visit(2, '2026-01-13', { coffee_rating: 8.5, city: 'Minneapolis, MN', coffee_order: 'Oat Latte' }),
    visit(3, '2026-01-14', { coffee_rating: 6, city: 'Minneapolis, MN' }),
    visit(4, '2026-01-20', { coffee_rating: 8, vibe_rating: 10 }),
  ]);
  assert.equal(stats.total, 4);
  assert.equal(stats.cities, 3);
  assert.equal(stats.states, 3);
  assert.deepEqual(stats.streak, { length: 2, from: '2026-01-10', to: '2026-01-13' });
  assert.deepEqual(stats.topOrder, { label: 'Oat Latte', count: 2 });
  assert.equal(stats.histogram.reduce((a, b) => a + b, 0), 4);
  assert.equal(stats.histogram[5], 1);
  assert.equal(stats.perfectTens, 1);
  assert.equal(stats.bestCity.label, 'Minneapolis, MN'); // the only city with 2+ visits
});

test('weekdays use the local calendar date, not UTC', () => {
  const stats = computeFunStats([visit(1, '2026-10-14')]); // a Wednesday
  assert.equal(stats.busiestDay, 'Wed');
});

test('palate leaning and the hot take flag a great room with a so-so cup', () => {
  const stats = computeFunStats([
    visit(1, '2026-02-01', { vibe_rating: 9.5, coffee_rating: 6 }),
    visit(2, '2026-02-02', { vibe_rating: 8, coffee_rating: 7.8 }),
  ]);
  assert.equal(stats.palate.leaning, 'room');
  assert.equal(stats.hotTake.kind, 'room');
  assert.equal(stats.hotTake.label, 'Shop 1');
});

test('road miles sum the legs between road stops and skip home stops and wild coordinates', () => {
  const madison = { coffee_shop_lat: 43.07, coffee_shop_lng: -89.4 };
  const chicago = { coffee_shop_lat: 41.88, coffee_shop_lng: -87.63 };
  const stats = computeFunStats([
    visit(1, '2026-03-01', madison),
    visit(2, '2026-03-02', { ...madison, visit_type: 'home' }),
    visit(3, '2026-03-03', chicago),
    visit(4, '2026-03-04', { coffee_shop_lat: -33.9, coffee_shop_lng: 151.2 }),
  ]);
  const leg = Math.round(haversineMiles({ lat: 43.07, lng: -89.4 }, { lat: 41.88, lng: -87.63 }));
  assert.equal(stats.miles, leg);
  assert.ok(leg > 100 && leg < 160);
});
