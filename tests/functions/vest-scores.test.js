import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { onRequestGet } from '../../functions/api/vest/scores.js';
import { createD1Stub, makeRequest } from '../helpers/d1-mock.js';

const TEAM_ID = '275';

function espnEvent({ id, date, completed, wiScore, oppScore, wiTeamId = TEAM_ID }) {
  return {
    id,
    date,
    competitions: [
      {
        status: { type: { completed, description: completed ? 'Final' : 'Scheduled' } },
        competitors: [
          {
            team: { id: wiTeamId },
            score: wiScore,
            linescores: [{ value: Math.floor(wiScore / 2) }, { value: Math.ceil(wiScore / 2) }],
          },
          {
            team: { id: '999' },
            score: oppScore,
            linescores: [{ value: Math.floor(oppScore / 2) }, { value: Math.ceil(oppScore / 2) }],
          },
        ],
        venue: { fullName: 'Kohl Center', address: { city: 'Madison' } },
      },
    ],
  };
}

describe('GET /api/vest/scores', () => {
  let d1;
  let originalFetch;

  beforeEach(() => {
    d1 = createD1Stub();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('proxies completed games into D1 and returns the merged list', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          events: [
            espnEvent({ id: '111', date: '2025-11-03', completed: true, wiScore: 80, oppScore: 70 }),
            espnEvent({ id: '222', date: '2026-04-01', completed: false, wiScore: 0, oppScore: 0 }),
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    // Per completed game: SELECT (first) returns null so the UPDATE is skipped,
    // then the INSERT/UPSERT runs.
    d1.queueResults(null, { meta: {} });
    // Final getCached SELECT
    d1.queueResults({
      results: [{ espn_event_id: '111', wisconsin_score: 80, opponent_score: 70 }],
    });

    const res = await onRequestGet({
      env: d1,
      request: makeRequest('https://x/api/vest/scores?season=2025'),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toMatch(/max-age=\d+/);
    const body = await res.json();
    expect(body.source).toBe('espn');
    expect(body.games).toHaveLength(1);

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const fetchUrl = globalThis.fetch.mock.calls[0][0];
    expect(fetchUrl).toContain('season=2025');
    expect(fetchUrl).toContain(`/teams/${TEAM_ID}/schedule`);
  });

  it('does not cache cache-fallback responses', async () => {
    globalThis.fetch = vi.fn(async () => new Response('down', { status: 503 }));
    d1.queueResults({ results: [{ espn_event_id: '111' }] });

    const res = await onRequestGet({
      env: d1,
      request: makeRequest('https://x/api/vest/scores?season=2025'),
    });
    expect(res.headers.get('cache-control')).toBe(null);
  });

  it('falls back to cached results on ESPN failure if any are present', async () => {
    globalThis.fetch = vi.fn(async () => new Response('upstream down', { status: 503 }));
    d1.queueResults({ results: [{ espn_event_id: '111' }] });

    const res = await onRequestGet({
      env: d1,
      request: makeRequest('https://x/api/vest/scores?season=2025'),
    });

    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.source).toBe('cache');
    expect(body.games).toHaveLength(1);
  });

  it('returns 502 when ESPN fails and there is no cache', async () => {
    globalThis.fetch = vi.fn(async () => new Response('down', { status: 503 }));
    d1.queueResults({ results: [] });

    const res = await onRequestGet({
      env: d1,
      request: makeRequest('https://x/api/vest/scores?season=2025'),
    });
    expect(res.status).toBe(502);
  });

  it('defaults to season=2025 when not provided', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ events: [] }), { status: 200 })
    );
    d1.queueResults({ results: [] });

    await onRequestGet({
      env: d1,
      request: makeRequest('https://x/api/vest/scores'),
    });

    expect(globalThis.fetch.mock.calls[0][0]).toContain('season=2025');
  });
});
