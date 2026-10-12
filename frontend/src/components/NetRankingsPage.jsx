import { useMemo, useState } from 'react';

const SORT_FIELDS = {
  RANK: 'rank',
  TEAM: 'team',
  RECORD: 'record',
};

const parseRecord = (record) => {
  if (!record) return { wins: -1, losses: -1 };
  const [w, l] = record.split('-').map(Number);
  return { wins: Number.isFinite(w) ? w : -1, losses: Number.isFinite(l) ? l : -1 };
};

export default function NetRankingsPage({ netRankings, netStatus, onBack }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState(SORT_FIELDS.RANK);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery) return netRankings;
    const q = searchQuery.toLowerCase();
    return netRankings.filter((entry) => entry.team.toLowerCase().includes(q));
  }, [netRankings, searchQuery]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortAsc ? 1 : -1;

    arr.sort((a, b) => {
      if (sortField === SORT_FIELDS.RANK) return (a.rank - b.rank) * dir;
      if (sortField === SORT_FIELDS.TEAM) return a.team.localeCompare(b.team) * dir;
      if (sortField === SORT_FIELDS.RECORD) {
        const ra = parseRecord(a.record);
        const rb = parseRecord(b.record);
        if (ra.wins !== rb.wins) return (rb.wins - ra.wins) * dir;
        return (ra.losses - rb.losses) * dir;
      }
      return 0;
    });

    return arr;
  }, [filtered, sortField, sortAsc]);

  const sortIcon = (field) => {
    if (sortField !== field) return '';
    return sortAsc ? ' \u25B2' : ' \u25BC';
  };

  return (
    <main id="vest-dashboard" className="vest-tracker max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-5 sm:mb-6 flex items-center gap-3">
        <button type="button" onClick={onBack} className="vt-label hover:text-[color:var(--vt-ink)] py-2 pr-2">
          ← Dashboard
        </button>
        <h2 className="vt-display text-2xl sm:text-3xl">NET Rankings</h2>
      </div>

      {netStatus === 'loading' && (
        <p className="vt-mono text-sm text-[color:var(--vt-ink-mute)]">Loading NET rankings…</p>
      )}

      {netStatus === 'error' && (
        <p className="vt-mono text-sm text-[color:var(--vt-red-hot)]">Unable to load NET rankings. Try refreshing the page.</p>
      )}

      {netStatus === 'loaded' && (
        <div className="vt-card p-4 sm:p-5">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-11 text-sm"
              aria-label="Search teams"
            />
            <svg className="absolute left-3.5 top-3.5 h-5 w-5 text-[color:var(--vt-ink-faint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-3 vt-label" aria-label="Clear search">
                Clear
              </button>
            )}
          </div>

          <p className="vt-mono text-xs text-[color:var(--vt-ink-mute)] mb-3">
            {filtered.length === netRankings.length
              ? `${netRankings.length} teams`
              : `${filtered.length} of ${netRankings.length} teams`}
          </p>

          <div className="overflow-x-auto">
            <table className="vt-net-table w-full text-sm">
              <thead>
                <tr>
                  {[
                    { field: SORT_FIELDS.RANK, label: 'NET' },
                    { field: SORT_FIELDS.TEAM, label: 'Team' },
                    { field: SORT_FIELDS.RECORD, label: 'Record' },
                  ].map(({ field, label }) => (
                    <th key={field} onClick={() => handleSort(field)}>
                      {label}{sortIcon(field)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry) => {
                  const wisconsin = /wisconsin/i.test(entry.team);
                  return (
                    <tr key={entry.rank + entry.team}>
                      <td className={`vt-mono ${wisconsin ? 'vt-net-wisconsin' : ''}`}>{entry.rank}</td>
                      <td className={`vt-condensed uppercase text-base ${wisconsin ? 'vt-net-wisconsin' : ''}`}>{entry.team}</td>
                      <td className="vt-mono">{entry.record || '—'}</td>
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center vt-mono text-[color:var(--vt-ink-mute)]">
                      {searchQuery ? 'No teams match your search.' : 'No ranking data available.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
