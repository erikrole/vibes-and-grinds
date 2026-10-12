import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCoffeeBrief,
  buildHalftimeSplit,
  buildOutfitBriefs,
  luckyOutfit,
  streakSummary,
} from '../src/utils/vestInsights.js';

const games = [
  { id: 1, date: '2025-11-03', opponent: 'Campbell', location: 'vs', outfit: 'Red Vest', result: 'W', ranking: null },
  { id: 2, date: '2025-11-07', opponent: 'Northern Illinois', location: 'vs', outfit: 'Red Vest', result: 'W' },
  { id: 3, date: '2025-11-11', opponent: 'Ball State', location: 'vs', outfit: 'Red Vest', result: 'W' },
  { id: 4, date: '2025-12-10', opponent: 'Nebraska', location: '@', outfit: 'Red Vest', result: 'L', ranking: 23 },
  { id: 5, date: '2026-01-10', opponent: 'Michigan', location: '@', outfit: 'Light Gray Vest', result: 'W', ranking: 2 },
  { id: 6, date: '2026-02-13', opponent: 'Michigan State', location: 'vs', outfit: 'Gray Suit Coat', result: 'W', ranking: 10 },
  { id: 7, date: '2026-02-20', opponent: 'Maryland', location: 'vs', outfit: 'Gray Suit Coat', result: 'W' },
  { id: 8, date: '2026-03-01', opponent: 'Iowa', location: 'N', outfit: 'Gray Suit Coat', result: 'W', ranking: 9 },
];

const scores = [
  { game_id: 1, wisconsin_score: 96, opponent_score: 64, wisconsin_h1: 48, opponent_h1: 38 },
  { game_id: 4, wisconsin_score: 60, opponent_score: 90, wisconsin_h1: 28, opponent_h1: 40 },
  { game_id: 5, wisconsin_score: 91, opponent_score: 74, wisconsin_h1: 40, opponent_h1: 42 },
  { game_id: 6, wisconsin_score: 78, opponent_score: 70, wisconsin_h1: 35, opponent_h1: 35 },
  { game_id: 7, wisconsin_score: 78, opponent_score: 45, wisconsin_h1: 40, opponent_h1: 22 },
  { game_id: 8, wisconsin_score: 70, opponent_score: 67, wisconsin_h1: 30, opponent_h1: 36 },
];

test('outfit streaks, splits, ranked record, and margin use only saved games and scores', () => {
  assert.deepEqual(streakSummary(['W', 'W', 'W', 'L', 'W', 'W']), {
    current: { result: 'W', count: 2 },
    longestWin: 3,
    longestLoss: 1,
  });
  const briefs = buildOutfitBriefs(games, scores);
  const red = briefs.find((brief) => brief.outfit === 'Red Vest');
  assert.equal(red.wins, 3);
  assert.equal(red.losses, 1);
  assert.deepEqual(red.home, { wins: 3, losses: 0, games: 3 });
  assert.deepEqual(red.away, { wins: 0, losses: 1, games: 1 });
  assert.deepEqual(red.ranked, { wins: 0, losses: 1, games: 1 });
  assert.equal(red.streak.longestWin, 3);
  assert.equal(red.margin.avg, (32 - 30) / 2);
  const coat = briefs.find((brief) => brief.outfit === 'Gray Suit Coat');
  assert.equal(coat.neutral.wins, 1);
  assert.equal(luckyOutfit(briefs).outfit, 'Gray Suit Coat');
  assert.equal(luckyOutfit(briefs).smallSample, true);
  assert.equal(luckyOutfit(briefs.filter((brief) => brief.outfit !== 'Gray Suit Coat')).outfit, 'Red Vest');
});

test('halftime split counts comebacks and leads that held', () => {
  const split = buildHalftimeSplit(scores);
  assert.equal(split.games, 6);
  assert.equal(split.ledWon, 2);
  assert.equal(split.ledLost, 0);
  assert.equal(split.trailedWon, 2);
  assert.equal(split.trailedLost, 1);
  assert.equal(split.tiedWon, 1);
  assert.equal(buildHalftimeSplit([{ wisconsin_score: 80, opponent_score: 70 }]), null);
});

test('coffee brief joins same-day visits without counting a home game that has no log', () => {
  const visits = [
    { date: '2026-01-10', coffee_shop_name: 'Comet Coffee', coffee_order: 'Iced Cafe Dolce Latte', city: 'Ann Arbor, MI' },
    { date: '2025-12-10', coffee_shop_name: 'Crescent Moon Coffee', coffee_order: 'Iced Vanilla Latte', city: 'Lincoln, NE' },
    { date: '2026-02-13', coffee_shop_name: 'Comet Coffee', coffee_order: 'Iced Vanilla Latte', city: 'Madison, WI' },
    { date: '2026-08-28', coffee_shop_name: 'happy coffee', coffee_order: 'Cherry Pie Iced Latte', city: 'Sister Bay, WI' },
  ];
  const brief = buildCoffeeBrief(visits, games, scores);
  assert.equal(brief.days, 3);
  assert.deepEqual(brief.withRecord, { wins: 2, losses: 1, games: 3 });
  assert.equal(brief.withoutRecord.games, 5);
  assert.equal(brief.homeCoffee, 1);
  assert.equal(brief.repeatOrder.order, 'Iced Vanilla Latte');
  assert.equal(brief.repeatOrder.games, 2);
  assert.equal(brief.repeatShop.shop, 'Comet Coffee');
  assert.equal(brief.goToCafe.shop, 'Comet Coffee');
  assert.equal(brief.goToCafe.games, 2);
  assert.equal(brief.goToCafe.wins, 2);
  assert.equal(brief.goToCafe.losses, 0);
  assert.equal(brief.byDate['2026-01-10'][0].shop, 'Comet Coffee');
  assert.equal(buildCoffeeBrief(visits, [], scores), null);
});

test('coffee brief leaves the go-to cafe empty unless one shop leads on two or more game days', () => {
  const onceEach = [
    { date: '2026-01-10', coffee_shop_name: 'Comet Coffee' },
    { date: '2025-12-10', coffee_shop_name: 'Crescent Moon Coffee' },
  ];
  const lonely = buildCoffeeBrief(onceEach, games, scores);
  assert.equal(lonely.days, 2);
  assert.equal(lonely.goToCafe, null);
  assert.deepEqual(lonely.tiedCafes, []);

  const tiedVisits = [
    { date: '2026-01-10', coffee_shop_name: 'Comet Coffee' },
    { date: '2026-02-13', coffee_shop_name: '  comet coffee  ' },
    { date: '2025-12-10', coffee_shop_name: 'Crescent Moon Coffee' },
    { date: '2026-02-20', coffee_shop_name: 'Crescent Moon Coffee' },
  ];
  const tied = buildCoffeeBrief(tiedVisits, games, scores);
  assert.equal(tied.goToCafe, null);
  assert.deepEqual(tied.tiedCafes.map((cafe) => cafe.shop), ['Comet Coffee', 'Crescent Moon Coffee']);
  assert.equal(tied.tiedCafes[0].games, 2);
  assert.equal(tied.repeatShop, null);

  const unmatched = buildCoffeeBrief(
    [{ date: '2026-08-28', coffee_shop_name: 'happy coffee', coffee_order: 'Cherry Pie Iced Latte' }],
    games,
    scores,
  );
  assert.equal(unmatched.days, 0);
  assert.equal(unmatched.goToCafe, null);
  assert.equal(unmatched.withRecord.games, 0);
  assert.equal(unmatched.withoutRecord.games, games.length);

  const doubled = buildCoffeeBrief([
    { date: '2026-01-10', coffee_shop_name: 'Comet Coffee', coffee_order: 'Latte' },
    { date: '2026-01-10', coffee_shop_name: 'Comet Coffee', coffee_order: 'Espresso' },
  ], games, scores);
  assert.equal(doubled.days, 1);
  assert.equal(doubled.goToCafe, null);
  assert.equal(doubled.stops, 2);
});
