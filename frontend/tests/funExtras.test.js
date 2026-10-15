import test from 'node:test';
import assert from 'node:assert/strict';
import { awards, gameDayStats, personality, saveCelebration, statePassport, tripLegs } from '../src/utils/funExtras.js';

let id = 0;
const v = (o = {}) => ({ id: ++id, date: '2026-09-05', coffee_shop_name: 'A', shop_id: 1, city: 'Madison, WI', coffee_rating: 8, vibe_rating: 8, composite_score: 16, ...o });

test('passport lights up only real states and counts stops', () => {
  const p = statePassport([v(), v(), v({ city: 'Eugene, OR' }), v({ city: 'Paris, France' }), v({ city: '' })]);
  assert.equal(p.length, 50);
  assert.deepEqual(p.filter((s) => s.count).map((s) => [s.code, s.count]), [['OR', 1], ['WI', 2]]);
});

test('awards pick the right visits and skip what is missing', () => {
  assert.deepEqual(awards([]), []);
  const list = [
    v({ shop_id: 1, coffee_shop_name: 'A', coffee_rating: 6, date: '2026-09-01' }),
    v({ shop_id: 1, coffee_shop_name: 'A', coffee_rating: 9, date: '2026-09-08' }),
    v({ shop_id: 2, coffee_shop_name: 'B', coffee_rating: 7, vibe_rating: 10, coffee_shop_lat: 34.1, coffee_shop_lng: -118.1 }),
  ];
  const a = Object.fromEntries(awards(list).map((x) => [x.id, x]));
  assert.equal(a.cup.headline, 'A');
  assert.equal(a.vibe.headline, 'B');
  assert.equal(a.loyal.detail, '2 stops');
  assert.equal(a.far.headline, 'B');
  assert.equal(a.comeback.detail, '6 → 9 on the next visit');
  assert.equal(awards([v()]).find((x) => x.id === 'loyal'), undefined);
});

test('personality needs enough visits and only states counted facts', () => {
  assert.equal(personality([v(), v()]), '');
  const line = personality([v({ coffee_order: 'latte', date: '2026-10-17' }), v({ coffee_order: 'Latte', date: '2026-10-24' }), v({ coffee_order: 'mocha', date: '2026-10-25' })]);
  assert.equal(line, 'Latte regular · 8.0 average cup · mostly Saturdays');
});

test('game-day averages and streaks', () => {
  const s = gameDayStats([
    v({ date: '2026-09-01', sport: 'Football', coffee_rating: 9 }),
    v({ date: '2026-09-02', sport: 'Football', coffee_rating: 7 }),
    v({ date: '2026-09-03', sport: '' }),
    v({ date: '2026-09-04', sport: "Men's Hockey", coffee_rating: 8 }),
  ]);
  assert.deepEqual(s.bySport.map((x) => [x.label, x.value]), [['Football', 8], ["Men's Hockey", 8]]);
  assert.deepEqual([s.streak, s.gameDays, s.otherDays], [2, 3, 1]);
});

test('trip legs run in date order with cumulative miles and skip unlocated stops', () => {
  const legs = tripLegs([
    v({ date: '2026-09-02', coffee_shop_lat: 34.14, coffee_shop_lng: -118.14 }),
    v({ date: '2026-09-01', coffee_shop_lat: 43.07, coffee_shop_lng: -89.4 }),
    v({ date: '2026-09-03', coffee_shop_lat: null, coffee_shop_lng: null }),
  ]);
  assert.equal(legs.length, 2);
  assert.equal(legs[0].miles, 0);
  assert.ok(legs[1].miles > 1400 && legs[1].miles < 1700);
});

test('save celebration counts the stop, flags high scores and milestones, and hints the next badge', () => {
  const before = Array.from({ length: 49 }, (_, i) => v({ date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}` }));
  const c = saveCelebration(before, v({ composite_score: 19 }));
  assert.equal(c.stop, 50);
  assert.equal(c.milestone, 50);
  assert.equal(c.confetti, true);
  assert.ok(c.newBadges.some((b) => b.id === 'first-sip'));
  assert.ok(c.next && c.next.remaining > 0);
  assert.equal(saveCelebration([v()], v({ composite_score: 12 })).confetti, false);
});
