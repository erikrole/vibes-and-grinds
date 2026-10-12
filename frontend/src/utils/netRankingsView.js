function parseRecord(record) {
  const match = String(record ?? '').match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return { wins: -1, losses: -1 };
  return { wins: Number(match[1]), losses: Number(match[2]) };
}

export function prepareNetRankings(rows, { query = '', sortField = 'rank', sortAsc = true } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const safe = list.filter((entry) => entry && typeof entry.team === 'string' && entry.team && Number.isFinite(Number(entry.rank)));
  const needle = String(query || '').trim().toLowerCase();
  const filtered = needle ? safe.filter((entry) => entry.team.toLowerCase().includes(needle)) : safe;
  const dir = sortAsc ? 1 : -1;
  return [...filtered].sort((a, b) => {
    if (sortField === 'team') return a.team.localeCompare(b.team) * dir;
    if (sortField === 'record') {
      const left = parseRecord(a.record);
      const right = parseRecord(b.record);
      if (left.wins !== right.wins) return (right.wins - left.wins) * dir;
      return (left.losses - right.losses) * dir;
    }
    return (Number(a.rank) - Number(b.rank)) * dir;
  });
}
