import { describe, expect, it } from 'vitest';
import { centralGameDate, centralToday, matchVestGameId } from '../../../functions/api/vest/_centralDate.js';

describe('centralGameDate', () => {
  it('moves an evening Central tip off the next UTC date', () => {
    // Campbell, 7:00pm CST on Nov 3, 2025. ESPN stores 2025-11-04T01:00Z.
    expect(centralGameDate('2025-11-04T01:00Z')).toBe('2025-11-03');
    expect(centralGameDate('2025-11-04T01:00:00.000Z')).toBe('2025-11-03');
    // Milwaukee, 6:00pm CST on Dec 30. ESPN stores midnight UTC.
    expect(centralGameDate('2025-12-31T00:00Z')).toBe('2025-12-30');
  });

  it('keeps an afternoon tip on the same calendar day', () => {
    // BYU, 3:00pm CST on Nov 21, 2025.
    expect(centralGameDate('2025-11-21T21:00Z')).toBe('2025-11-21');
  });

  it('follows Central daylight time', () => {
    // 7:30pm CDT on Mar 14, 2026 is 00:30 UTC the next day.
    expect(centralGameDate('2026-03-15T00:30:00Z')).toBe('2026-03-14');
    // 7:00pm CST on Nov 1, 2026, after the clocks fall back.
    expect(centralGameDate('2026-11-02T01:00:00Z')).toBe('2026-11-01');
  });

  it('calls the Central calendar day today after UTC has rolled over', () => {
    expect(centralToday(new Date('2026-03-06T03:30:00Z'))).toBe('2026-03-05');
    expect(centralToday(new Date('2026-03-15T04:30:00Z'))).toBe('2026-03-14');
    expect(centralToday('not-a-date')).toBeNull();
  });

  it('leaves a stored calendar day alone and rejects junk', () => {
    expect(centralGameDate('2025-11-03')).toBe('2025-11-03');
    expect(centralGameDate(' 2026-01-10 ')).toBe('2026-01-10');
    expect(centralGameDate('2024-02-29')).toBe('2024-02-29');
    expect(centralGameDate('')).toBeNull();
    expect(centralGameDate(null)).toBeNull();
    expect(centralGameDate('not-a-date')).toBeNull();
    expect(centralGameDate('2026-02-31')).toBeNull();
    expect(centralGameDate('2026-02-29')).toBeNull();
  });

  it('keeps midnight and the DST transitions on the Central calendar day', () => {
    expect(centralGameDate('2026-01-15T06:00:00.000Z')).toBe('2026-01-15');
    expect(centralGameDate('2026-01-15T05:59:59.999Z')).toBe('2026-01-14');
    expect(centralGameDate('2026-07-15T05:00:00.000Z')).toBe('2026-07-15');
    expect(centralGameDate('2026-07-15T04:59:59Z')).toBe('2026-07-14');
    expect(centralGameDate('2026-03-08T07:59:59Z')).toBe('2026-03-08');
    expect(centralGameDate('2026-03-08T08:00:00Z')).toBe('2026-03-08');
    expect(centralGameDate('2026-11-01T06:30:00Z')).toBe('2026-11-01');
    expect(centralGameDate('2026-11-01T07:30:00Z')).toBe('2026-11-01');
  });
});

describe('matchVestGameId', () => {
  const vestGames = [
    { game_id: 1, date: '2025-11-03' },
    { game_id: 5, date: '2025-11-21' },
    { game_id: 13, date: '2025-12-30' },
    { game_id: 40, date: '2025-11-04' },
  ];

  it('links the ESPN instant to the Central game day, not the UTC date', () => {
    expect(matchVestGameId(vestGames, '2025-11-04T01:00Z')).toBe(1);
    expect(matchVestGameId(vestGames, '2025-11-21T21:00Z')).toBe(5);
    expect(matchVestGameId(vestGames, '2025-12-31T00:00Z')).toBe(13);
  });

  it('skips a same-day row whose id is not a number', () => {
    const rows = [
      { game_id: 'nope', date: '2025-11-03' },
      { game_id: 4, date: '2025-11-03' },
    ];
    expect(matchVestGameId(rows, '2025-11-04T01:00Z')).toBe(4);
  });

  it('does not attach a score when that Central day has no vest row', () => {
    expect(matchVestGameId(vestGames, '2026-04-01T01:00Z')).toBeNull();
    expect(matchVestGameId(vestGames, '')).toBeNull();
    expect(matchVestGameId(null, '2025-11-04T01:00Z')).toBeNull();
  });

  it('keeps the first row when two vest games share the Central day', () => {
    const rows = [
      { game_id: 2, date: '2025-11-03' },
      { game_id: 9, date: '2025-11-03' },
    ];
    expect(matchVestGameId(rows, '2025-11-04T01:00Z')).toBe(2);
  });
});
