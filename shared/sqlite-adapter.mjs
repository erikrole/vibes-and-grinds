export function sqliteAdapter(db) {
  let queue = Promise.resolve();
  const enqueue = (action) => {
    const result = queue.then(action);
    queue = result.catch(() => {});
    return result;
  };
  const statement = (sql, values = []) => ({
    sql, values,
    bind: (...args) => statement(sql, args),
    first: () => enqueue(() => db.get(sql, values).then((row) => row || null)),
    all: () => enqueue(() => db.all(sql, values).then((results) => ({ results }))),
    run: () => enqueue(() => db.run(sql, values).then((result) => ({ meta: { changes: result.changes, last_row_id: result.lastID } }))),
  });
  return {
    prepare: (sql) => statement(sql),
    batch: (statements) => enqueue(async () => {
      await db.exec('BEGIN');
      try {
        const results = [];
        for (const query of statements) {
          const result = await db.run(query.sql, query.values);
          results.push({ meta: { changes: result.changes, last_row_id: result.lastID } });
        }
        await db.exec('COMMIT');
        return results;
      } catch (error) { await db.exec('ROLLBACK'); throw error; }
    }),
  };
}
