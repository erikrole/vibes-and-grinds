import { describe, expect, it } from 'vitest';
import { shouldSyncVestGames } from './vestGameSync';

const serverGames = [
  {
    id: 1,
    date: '2025-11-03',
    location: 'vs',
    opponent: 'Campbell',
    ranking: null,
    outfit: 'Dark Gray Vest',
    result: 'W',
    overtime: false,
  },
];

describe('shouldSyncVestGames', () => {
  it('does not upload while the server read is still in flight', () => {
    expect(shouldSyncVestGames({
      loadState: 'pending',
      serverGames: null,
      games: serverGames,
    })).toBe(false);
  });

  it('does not upload when the server read failed', () => {
    expect(shouldSyncVestGames({
      loadState: 'failed',
      serverGames: null,
      games: serverGames,
    })).toBe(false);
  });

  it('does not upload when the local list matches the server', () => {
    const local = [{
      opponent: 'Campbell',
      id: 1,
      result: 'W',
      outfit: 'Dark Gray Vest',
      date: '2025-11-03',
      location: 'vs',
      ranking: null,
    }];

    expect(shouldSyncVestGames({
      loadState: 'ready',
      serverGames,
      games: local,
    })).toBe(false);
  });

  it('uploads after a local edit', () => {
    const edited = [{ ...serverGames[0], result: 'L' }];

    expect(shouldSyncVestGames({
      loadState: 'ready',
      serverGames,
      games: edited,
    })).toBe(true);
  });

  it('uploads a new game added locally', () => {
    expect(shouldSyncVestGames({
      loadState: 'ready',
      serverGames,
      games: [
        ...serverGames,
        { id: 2, date: '2025-11-07', opponent: 'Northern Illinois', result: 'W', outfit: 'Red Vest' },
      ],
    })).toBe(true);
  });

  it('uploads local games when the server read succeeded and the table is empty', () => {
    expect(shouldSyncVestGames({
      loadState: 'ready',
      serverGames: [],
      games: serverGames,
    })).toBe(true);
  });

  it('treats a missing overtime flag as not overtime', () => {
    const local = [{ ...serverGames[0] }];
    delete local[0].overtime;

    expect(shouldSyncVestGames({
      loadState: 'ready',
      serverGames,
      games: local,
    })).toBe(false);
  });
});
