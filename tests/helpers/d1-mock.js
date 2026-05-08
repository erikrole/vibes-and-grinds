// Lightweight D1 stub that records calls and lets tests stage results.
//
// D1 supports: env.DB.prepare(sql).bind(...).all() | .first() | .run() | .batch()
// We don't run real SQL — we just queue per-call results and capture the SQL
// + bound params for assertions.

export function createD1Stub() {
  const calls = [];
  let queue = [];

  // D1 returns a new statement from .bind() — match that semantics so a
  // single prepared statement can be bound + queued multiple times.
  const stmt = (sql, bound = []) => ({
    bind: (...params) => stmt(sql, params),
    all: async () => {
      const next = queue.shift() ?? { results: [], meta: {} };
      calls.push({ sql, params: bound, op: 'all', result: next });
      return next;
    },
    first: async () => {
      const next = queue.shift() ?? null;
      calls.push({ sql, params: bound, op: 'first', result: next });
      return next;
    },
    run: async () => {
      const next = queue.shift() ?? { meta: { last_row_id: 1, changes: 1 } };
      calls.push({ sql, params: bound, op: 'run', result: next });
      return next;
    },
  });

  return {
    DB: {
      prepare: (sql) => stmt(sql),
      batch: async (statements) => {
        const results = [];
        for (const s of statements) {
          // The bind already happened; run each.
          results.push(await s.run());
        }
        calls.push({ op: 'batch', count: statements.length });
        return results;
      },
    },
    calls,
    queueResult: (result) => queue.push(result),
    queueResults: (...results) => queue.push(...results),
  };
}

export function makeRequest(url, init) {
  return new Request(url, init);
}
