import { describe, it, expect, beforeEach } from 'vitest';
import { onRequestGet, onRequestPost } from '../../functions/api/visits.js';
import {
  onRequestGet as onRequestGetSingle,
  onRequestPut,
  onRequestDelete,
} from '../../functions/api/visits/[id].js';
import { createD1Stub, makeRequest } from '../helpers/d1-mock.js';

describe('GET /api/visits', () => {
  let d1;
  beforeEach(() => {
    d1 = createD1Stub();
  });

  it('returns visits ordered by date DESC', async () => {
    d1.queueResult({
      results: [
        { id: 2, date: '2026-01-02' },
        { id: 1, date: '2026-01-01' },
      ],
    });

    const res = await onRequestGet({ env: d1 });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json');

    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(d1.calls[0].sql).toMatch(/ORDER BY date DESC/);
  });

  it('returns 500 with a generic error when the DB throws', async () => {
    d1.DB.prepare = () => {
      throw new Error('db down');
    };
    const res = await onRequestGet({ env: d1 });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to fetch visits' });
  });
});

describe('POST /api/visits', () => {
  let d1;
  beforeEach(() => {
    d1 = createD1Stub();
  });

  const validPayload = {
    date: '2026-01-01',
    coffee_shop_name: 'Acme Coffee',
    vibe_rating: 8,
    coffee_rating: 9,
  };

  it('rejects missing required fields with 400', async () => {
    const res = await onRequestPost({
      request: makeRequest('https://x/api/visits', {
        method: 'POST',
        body: JSON.stringify({ vibe_rating: 8 }),
      }),
      env: d1,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing required/i);
  });

  it('rejects out-of-range ratings with 400', async () => {
    const res = await onRequestPost({
      request: makeRequest('https://x/api/visits', {
        method: 'POST',
        body: JSON.stringify({ ...validPayload, vibe_rating: 11 }),
      }),
      env: d1,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/0 and 10/);
  });

  it('rejects negative ratings with 400', async () => {
    const res = await onRequestPost({
      request: makeRequest('https://x/api/visits', {
        method: 'POST',
        body: JSON.stringify({ ...validPayload, coffee_rating: -1 }),
      }),
      env: d1,
    });
    expect(res.status).toBe(400);
  });

  it('inserts and returns 201 with the new row', async () => {
    d1.queueResult({ meta: { last_row_id: 42 } });
    d1.queueResult({ results: [{ id: 42, ...validPayload }] });

    const res = await onRequestPost({
      request: makeRequest('https://x/api/visits', {
        method: 'POST',
        body: JSON.stringify(validPayload),
      }),
      env: d1,
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(42);

    const insertCall = d1.calls.find((c) => /INSERT INTO coffee_visits/.test(c.sql));
    expect(insertCall).toBeDefined();
    expect(insertCall.params[0]).toBe(validPayload.date);
    expect(insertCall.params[1]).toBe(validPayload.coffee_shop_name);
  });

  it('coerces missing optional fields to null', async () => {
    d1.queueResult({ meta: { last_row_id: 1 } });
    d1.queueResult({ results: [{ id: 1 }] });

    await onRequestPost({
      request: makeRequest('https://x/api/visits', {
        method: 'POST',
        body: JSON.stringify(validPayload),
      }),
      env: d1,
    });

    const insertCall = d1.calls.find((c) => /INSERT/.test(c.sql));
    // Optional fields (city, opponent, sport, address, place_id, lat, lng,
    // coffee_order, notes, photo_url) should all be null.
    const optionalIndices = [2, 3, 4, 5, 6, 7, 8, 9, 12, 13];
    for (const idx of optionalIndices) {
      expect(insertCall.params[idx]).toBe(null);
    }
  });
});

describe('GET /api/visits/:id', () => {
  let d1;
  beforeEach(() => {
    d1 = createD1Stub();
  });

  it('returns 404 when not found', async () => {
    d1.queueResult({ results: [] });
    const res = await onRequestGetSingle({ params: { id: '999' }, env: d1 });
    expect(res.status).toBe(404);
  });

  it('returns the row when found', async () => {
    d1.queueResult({ results: [{ id: 7, coffee_shop_name: 'A' }] });
    const res = await onRequestGetSingle({ params: { id: '7' }, env: d1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 7, coffee_shop_name: 'A' });
  });
});

describe('PUT /api/visits/:id', () => {
  let d1;
  beforeEach(() => {
    d1 = createD1Stub();
  });

  it('rejects out-of-range ratings with 400', async () => {
    const res = await onRequestPut({
      params: { id: '7' },
      request: makeRequest('https://x/api/visits/7', {
        method: 'PUT',
        body: JSON.stringify({ vibe_rating: 99, coffee_rating: 5 }),
      }),
      env: d1,
    });
    expect(res.status).toBe(400);
  });

  it('updates and returns the new row', async () => {
    d1.queueResult({ meta: { changes: 1 } });
    d1.queueResult({ results: [{ id: 7, vibe_rating: 9 }] });

    const res = await onRequestPut({
      params: { id: '7' },
      request: makeRequest('https://x/api/visits/7', {
        method: 'PUT',
        body: JSON.stringify({
          date: '2026-01-01',
          coffee_shop_name: 'A',
          vibe_rating: 9,
          coffee_rating: 9,
        }),
      }),
      env: d1,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 7, vibe_rating: 9 });
  });
});

describe('DELETE /api/visits/:id', () => {
  let d1;
  beforeEach(() => {
    d1 = createD1Stub();
  });

  it('returns 204 on success', async () => {
    const res = await onRequestDelete({ params: { id: '7' }, env: d1 });
    expect(res.status).toBe(204);
    expect(d1.calls[0].sql).toMatch(/DELETE FROM coffee_visits/);
    expect(d1.calls[0].params).toEqual(['7']);
  });

  it('returns 500 when DB throws', async () => {
    d1.DB.prepare = () => {
      throw new Error('boom');
    };
    const res = await onRequestDelete({ params: { id: '7' }, env: d1 });
    expect(res.status).toBe(500);
  });
});
