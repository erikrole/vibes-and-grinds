import { describe, it, expect, beforeEach } from 'vitest';
import { onRequestGet, onRequestPut } from '../../functions/api/vest/games.js';
import { createD1Stub, makeRequest } from '../helpers/d1-mock.js';

describe('GET /api/vest/games', () => {
  let d1;
  beforeEach(() => {
    d1 = createD1Stub();
  });

  it('maps rows into the wire shape', async () => {
    d1.queueResult({
      results: [
        {
          game_id: 5,
          date: '2025-12-19',
          location: 'N',
          opponent: 'Villanova',
          ranking: null,
          outfit: 'Dark Gray Vest',
          result: 'L',
          overtime: 1,
        },
      ],
    });

    const res = await onRequestGet({ env: d1 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.games).toEqual([
      {
        id: 5,
        date: '2025-12-19',
        location: 'N',
        opponent: 'Villanova',
        ranking: null,
        outfit: 'Dark Gray Vest',
        result: 'L',
        overtime: true,
      },
    ]);
  });

  it('defaults missing location to "vs"', async () => {
    d1.queueResult({
      results: [
        { game_id: 1, date: '2025-11-03', location: null, opponent: 'X', ranking: null, outfit: '', result: 'W', overtime: 0 },
      ],
    });
    const res = await onRequestGet({ env: d1 });
    const body = await res.json();
    expect(body.games[0].location).toBe('vs');
  });
});

describe('PUT /api/vest/games', () => {
  let d1;
  beforeEach(() => {
    d1 = createD1Stub();
  });

  it('rejects payloads without a games array', async () => {
    const res = await onRequestPut({
      request: makeRequest('https://x/api/vest/games', {
        method: 'PUT',
        body: JSON.stringify({ wrongKey: [] }),
      }),
      env: d1,
    });
    expect(res.status).toBe(400);
  });

  it('clears the table and inserts each valid game', async () => {
    const res = await onRequestPut({
      request: makeRequest('https://x/api/vest/games', {
        method: 'PUT',
        body: JSON.stringify({
          games: [
            { id: 1, date: '2025-11-03', location: 'vs', opponent: 'Campbell', outfit: 'Vest', result: 'W' },
            { id: 2, date: '2025-11-07', opponent: 'NIU', result: 'W' },
          ],
        }),
      }),
      env: d1,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.saved).toBe(2);

    const batchCall = d1.calls.find((c) => c.op === 'batch');
    expect(batchCall).toBeDefined();
    // 1 DELETE + 2 INSERTs
    expect(batchCall.count).toBe(3);
  });

  it('skips entries with missing id or empty opponent', async () => {
    await onRequestPut({
      request: makeRequest('https://x/api/vest/games', {
        method: 'PUT',
        body: JSON.stringify({
          games: [
            { id: 'not-a-number', opponent: 'Drop' },
            { id: 1, opponent: '   ' },
            { id: 2, opponent: 'Keep' },
          ],
        }),
      }),
      env: d1,
    });

    const batchCall = d1.calls.find((c) => c.op === 'batch');
    // 1 DELETE + only 1 valid INSERT
    expect(batchCall.count).toBe(2);
  });

  it('coerces ranking to int or null', async () => {
    await onRequestPut({
      request: makeRequest('https://x/api/vest/games', {
        method: 'PUT',
        body: JSON.stringify({
          games: [
            { id: 1, opponent: 'A', ranking: '5' },
            { id: 2, opponent: 'B', ranking: '' },
            { id: 3, opponent: 'C', ranking: null },
          ],
        }),
      }),
      env: d1,
    });
    const inserts = d1.calls.filter((c) => c.op === 'run' && /INSERT INTO vest_games/.test(c.sql));
    expect(inserts).toHaveLength(3);
    expect(inserts[0].params[4]).toBe(5);
    expect(inserts[1].params[4]).toBe(null);
    expect(inserts[2].params[4]).toBe(null);
  });
});
