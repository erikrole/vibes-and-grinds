import { useMemo, useState } from 'react';
import type { NetRankingEntry } from '../types';

type SortField = 'rank' | 'team' | 'record';

const SORT_FIELDS: { RANK: SortField; TEAM: SortField; RECORD: SortField } = {
  RANK: 'rank',
  TEAM: 'team',
  RECORD: 'record',
};

interface Props {
  netRankings: NetRankingEntry[];
  netStatus: 'loading' | 'loaded' | 'error' | string;
  onBack: () => void;
}

const parseRecord = (record: string | null | undefined) => {
  if (!record) return { wins: -1, losses: -1 };
  const [w, l] = record.split('-').map(Number);
  return { wins: Number.isFinite(w) ? w : -1, losses: Number.isFinite(l) ? l : -1 };
};

export default function NetRankingsPage({ netRankings, netStatus, onBack }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(SORT_FIELDS.RANK);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: SortField) => {
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

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return '';
    return sortAsc ? ' \u25B2' : ' \u25BC';
  };

  return (
    <main className="vest-tracker max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-5 sm:mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors py-2 pr-2"
        >
          &larr; Dashboard
        </button>
        <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-50">NET Rankings</h2>
      </div>

      {netStatus === 'loading' && (
        <p className="text-stone-500 dark:text-stone-400 text-sm">Loading NET rankings...</p>
      )}

      {netStatus === 'error' && (
        <p className="text-red-600 dark:text-red-400 text-sm">Unable to load NET rankings. Try refreshing the page.</p>
      )}

      {netStatus === 'loaded' && (
        <div className="bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700/60 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-11 border border-stone-300 dark:border-stone-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-stone-400 dark:focus:ring-stone-500 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 transition-colors text-sm"
            />
            <svg
              className="absolute left-3.5 top-3.5 h-5 w-5 text-stone-400 dark:text-stone-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                aria-label="Clear search"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>

          <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
            {filtered.length === netRankings.length
              ? `${netRankings.length} teams`
              : `${filtered.length} of ${netRankings.length} teams`}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-700">
                  {[
                    { field: SORT_FIELDS.RANK, label: 'NET', width: 'w-16' },
                    { field: SORT_FIELDS.TEAM, label: 'Team', width: '' },
                    { field: SORT_FIELDS.RECORD, label: 'Record', width: 'w-24' },
                  ].map(({ field, label, width }) => (
                    <th
                      key={field}
                      onClick={() => handleSort(field)}
                      className={`${width} px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-stone-500 dark:text-stone-400 cursor-pointer select-none hover:text-stone-800 dark:hover:text-stone-200 transition-colors`}
                    >
                      {label}{sortIcon(field)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry) => (
                  <tr
                    key={entry.rank + entry.team}
                    className="border-b border-stone-100 dark:border-stone-700/50 even:bg-stone-50 dark:even:bg-stone-700/30 hover:bg-stone-100 dark:hover:bg-stone-700/50 transition-colors"
                  >
                    <td className="px-3 py-2.5 tabular-nums font-medium text-stone-700 dark:text-stone-200">
                      {entry.rank}
                    </td>
                    <td className="px-3 py-2.5 text-stone-900 dark:text-stone-100 font-medium">
                      {entry.team}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-stone-600 dark:text-stone-300">
                      {entry.record || '—'}
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-stone-500 dark:text-stone-400">
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
