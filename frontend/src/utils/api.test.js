import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createVisit,
  deleteVisit,
  fetchVestBlurb,
  fetchVestGameStats,
  fetchVestGames,
  fetchVestScores,
  fetchVisits,
  syncVestGames,
  updateVisit,
} from './api';

const okJson = (data) =>
  Promise.resolve(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );

const errJson = (data, status) =>
  Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );

describe('api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetchVisits hits /api/visits and returns parsed JSON', async () => {
    fetch.mockReturnValueOnce(okJson([{ id: 1 }]));
    const result = await fetchVisits();
    expect(fetch).toHaveBeenCalledWith('/api/visits');
    expect(result).toEqual([{ id: 1 }]);
  });

  it('fetchVisits surfaces server error message', async () => {
    fetch.mockReturnValueOnce(errJson({ error: 'boom' }, 500));
    await expect(fetchVisits()).rejects.toThrow('boom');
  });

  it('fetchVisits falls back to a generic message on non-JSON errors', async () => {
    fetch.mockReturnValueOnce(
      Promise.resolve(new Response('not json', { status: 500 }))
    );
    await expect(fetchVisits()).rejects.toThrow('Failed to fetch visits');
  });

  it('createVisit POSTs JSON body', async () => {
    fetch.mockReturnValueOnce(okJson({ id: 7 }));
    const payload = { date: '2026-01-01', coffee_shop_name: 'A', vibe_rating: 8, coffee_rating: 8 };
    await createVisit(payload);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/visits');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it('updateVisit PUTs to /api/visits/:id', async () => {
    fetch.mockReturnValueOnce(okJson({ id: 7 }));
    await updateVisit(7, { vibe_rating: 9 });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/visits/7');
    expect(options.method).toBe('PUT');
  });

  it('deleteVisit DELETEs /api/visits/:id', async () => {
    fetch.mockReturnValueOnce(okJson({}));
    await deleteVisit(7);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/visits/7');
    expect(options.method).toBe('DELETE');
  });

  it('fetchVestGames returns parsed JSON', async () => {
    fetch.mockReturnValueOnce(okJson({ games: [] }));
    expect(await fetchVestGames()).toEqual({ games: [] });
  });

  it('syncVestGames PUTs the games array', async () => {
    fetch.mockReturnValueOnce(okJson({ success: true, saved: 1 }));
    await syncVestGames([{ id: 1 }]);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/vest/games');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({ games: [{ id: 1 }] });
  });

  it('fetchVestScores defaults to season 2025', async () => {
    fetch.mockReturnValueOnce(okJson({ games: [] }));
    await fetchVestScores();
    expect(fetch.mock.calls[0][0]).toBe('/api/vest/scores?season=2025');
  });

  it('fetchVestScores honors an explicit season', async () => {
    fetch.mockReturnValueOnce(okJson({ games: [] }));
    await fetchVestScores('2024');
    expect(fetch.mock.calls[0][0]).toBe('/api/vest/scores?season=2024');
  });

  it('fetchVestGameStats targets the eventId', async () => {
    fetch.mockReturnValueOnce(okJson({}));
    await fetchVestGameStats('401234567');
    expect(fetch.mock.calls[0][0]).toBe('/api/vest/game-stats/401234567');
  });

  it('fetchVestBlurb POSTs the context', async () => {
    fetch.mockReturnValueOnce(okJson({ blurb: 'hi' }));
    await fetchVestBlurb({ opponent: 'BYU' });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/vest/blurb');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ context: { opponent: 'BYU' } });
  });
});
