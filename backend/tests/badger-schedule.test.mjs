import test from 'node:test';
import assert from 'node:assert/strict';
import { cityFromLocation, eventDate, gamesOnDate, gamesRoute, parseSchedule } from '../../shared/badger-schedule.mjs';

const ics = (...events) => `BEGIN:VCALENDAR\r\n${events.map((e) => `BEGIN:VEVENT\r\n${e}\r\nEND:VEVENT`).join('\r\n')}\r\nEND:VCALENDAR`;
const event = (start, summary, location = '') => `DTSTART${start.length === 8 ? ';VALUE=DATE' : ''}:${start}\r\nSUMMARY:${summary}\r\nLOCATION:${location}`;

test('instants use the Chicago day and all-day rows stay put', () => {
  assert.equal(eventDate('DTSTART:20261103T003000Z'), '2026-11-02');
  assert.equal(eventDate('DTSTART:20261017T233000Z'), '2026-10-17');
  assert.equal(eventDate('DTSTART;VALUE=DATE:20270309'), '2027-03-09');
  assert.equal(eventDate('DTSTART:nonsense'), null);
});

test('locations normalise to City, ST', () => {
  assert.equal(cityFromLocation('State College, Pa.'), 'State College, PA');
  assert.equal(cityFromLocation('Madison, WI, Kohl Center'), 'Madison, WI');
  assert.equal(cityFromLocation('Pasadena, Calif.'), 'Pasadena, CA');
  assert.equal(cityFromLocation('Madison, Wis. - Homecoming / Red Out, Camp Randall Stadium'), 'Madison, WI');
  assert.equal(cityFromLocation('Chicago'), 'Chicago');
});

test('home, away and neutral are read from vs/at plus the venue city', () => {
  const games = parseSchedule(ics(
    event('20261003T163000Z', '[W] Wisconsin Athletics Football vs Michigan State', 'Madison\\, Wis. - Homecoming\\, Camp Randall Stadium'),
    event('20261017T233000Z', 'Wisconsin Athletics Football at UCLA', 'Pasadena\\, Calif.'),
    event('20260905T230000Z', '[L] Wisconsin Athletics Football vs Notre Dame - Lambeau Field', 'Green Bay\\, WI'),
    event('20261103T003000Z', "Wisconsin Athletics Men's Basketball vs Denver - Exhibition", 'Madison\\, WI, Kohl Center'),
    event('20261009T161000Z', '[N] Wisconsin Athletics Men\'s Cross Country vs Nuttycombe Wisconsin Invitational Presented by Under Armour', 'Madison\\, WI, Zimmer Championship Course'),
    event('20261010T000000Z', 'No venue words here', ''),
  ), 'Football');
  assert.deepEqual(games.map((g) => [g.date, g.opponent, g.location, g.city]), [
    ['2026-10-03', 'Michigan State', 'vs', 'Madison, WI'],
    ['2026-10-17', 'UCLA', '@', 'Pasadena, CA'],
    ['2026-09-05', 'Notre Dame', 'N', 'Green Bay, WI'],
    ['2026-11-02', 'Denver', 'vs', 'Madison, WI'],
    ['2026-10-09', 'Nuttycombe Wisconsin Invitational', 'vs', 'Madison, WI'],
  ]);
});

test('games for a date come from every feed and a dead feed is skipped', async () => {
  const body = {
    1: ics(event('20261017T233000Z', 'Wisconsin Athletics Football at UCLA', 'Pasadena\\, Calif.')),
    6: ics(event('20261018T000000Z', "[W] Wisconsin Athletics Men's Hockey vs Ohio State", 'Madison\\, WI, Kohl Center')),
  };
  const fetcher = async (url) => {
    const id = new URL(url).searchParams.get('sport_id');
    if (id === '4') return new Response('nope', { status: 500 });
    return new Response(body[id] || ics());
  };
  const games = await gamesOnDate('2026-10-17', fetcher);
  assert.deepEqual(games.map((g) => g.sport).sort(), ['Football', "Men's Hockey"].sort());
  assert.deepEqual(await gamesOnDate('2026-01-01', fetcher), []);
});

test('men’s basketball falls back to ESPN when its feed fails', async () => {
  const espn = { events: [{ id: '1', date: '2026-11-11T02:00:00Z', competitions: [{ status: { type: {} }, competitors: [
    { team: { id: '275' }, homeAway: 'home' }, { team: { id: '9', location: 'Denver' }, homeAway: 'away' },
  ] }] }] };
  const fetcher = async (url) => {
    if (url.includes('espn.com')) return Response.json(espn);
    if (url.includes('sport_id=3')) return new Response('', { status: 503 });
    return new Response(ics());
  };
  const games = await gamesOnDate('2026-11-10', fetcher);
  assert.deepEqual(games.map((g) => [g.sport, g.opponent, g.source]), [["Men's Basketball", 'Denver', 'espn']]);
});

test('the route validates the date and returns games', async () => {
  const bad = await gamesRoute(new Request('https://x.test/api/badger-games?date=tomorrow'), async () => new Response(ics()));
  assert.equal(bad.status, 400);
  const ok = await gamesRoute(new Request('https://x.test/api/badger-games?date=2026-10-17'), async () => new Response(ics()));
  assert.deepEqual(await ok.json(), { date: '2026-10-17', games: [] });
});
