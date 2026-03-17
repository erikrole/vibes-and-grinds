import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import AddVisitForm from './components/AddVisitForm';
import VisitList from './components/VisitList';
import FormModal from './components/FormModal';

const VisitDetailModal = lazy(() => import('./components/VisitDetailModal'));
const VisitsMap = lazy(() => import('./components/VisitsMap'));
const VestTrackerDashboard = lazy(() => import('./components/VestTrackerDashboard'));
const InsightsPanel = lazy(() => import('./components/InsightsPanel'));
const YearInReview = lazy(() => import('./components/YearInReview'));
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { fetchVisits, createVisit, updateVisit, deleteVisit } from './utils/api';
import { getRatingColor, getCompositeColor } from './utils/colors';
import { getTodayDateString } from './utils/dates';
import { computeBadges, detectNewBadges } from './utils/badges';
import useDarkMode from './hooks/useDarkMode';
import useLocalStorage from './hooks/useLocalStorage';
import useToast from './hooks/useToast';

const APP_MODES = {
  VIBES: 'vibes',
  VEST: 'vest',
};

const isVestDomain = window.location.hostname.startsWith('vests.');

export default function App() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [viewingVisit, setViewingVisit] = useState(null);
  const [error, setError] = useState(null);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showYearReview, setShowYearReview] = useState(false);
  const searchRef = useRef(null);
  const prevBadgesRef = useRef(null);

  const [darkMode, toggleDarkMode] = useDarkMode();
  const toastBag = useToast();
  const [viewPrefs, setViewPrefs] = useLocalStorage('vibes-and-grinds:view-preferences', {
    sortBy: 'date',
    searchQuery: '',
    sportFilter: '',
    appMode: isVestDomain ? APP_MODES.VEST : APP_MODES.VIBES,
  });

  // Destructure persisted preferences into local aliases for convenience
  const sortBy = viewPrefs.sortBy || 'date';
  const sortAsc = viewPrefs.sortAsc || false;
  const searchQuery = viewPrefs.searchQuery || '';
  const sportFilter = viewPrefs.sportFilter || '';
  const appMode = isVestDomain
    ? APP_MODES.VEST
    : (viewPrefs.appMode || APP_MODES.VIBES);

  const viewTab = viewPrefs.viewTab || 'visits'; // 'visits' | 'insights'

  const setSortBy = (v) => setViewPrefs((p) => {
    if (p.sortBy === v) return { ...p, sortAsc: !p.sortAsc };
    return { ...p, sortBy: v, sortAsc: false };
  });
  const setSearchQuery = (v) => setViewPrefs((p) => ({ ...p, searchQuery: v }));
  const setSportFilter = (v) => setViewPrefs((p) => ({ ...p, sportFilter: v }));
  const setViewTab = (v) => setViewPrefs((p) => ({ ...p, viewTab: v }));
  const setAppMode = (v) => setViewPrefs((p) => ({ ...p, appMode: typeof v === 'function' ? v(p.appMode) : v }));

  useEffect(() => {
    loadVisits();
  }, []);

  // Consolidated keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      // Ctrl+K / Cmd+K: focus search (works even from input fields)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (appMode === APP_MODES.VIBES) searchRef.current?.focus();
        return;
      }

      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;

      if (e.key.toLowerCase() === 'v') {
        setAppMode((prev) => {
          return prev === APP_MODES.VIBES ? APP_MODES.VEST : APP_MODES.VIBES;
        });
      } else if (e.key === '/' && appMode === APP_MODES.VIBES) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === '?') {
        setShowShortcuts((prev) => !prev);
      } else if (e.key.toLowerCase() === 'n' && appMode === APP_MODES.VIBES && !viewingVisit && !editingVisit) {
        setShowForm(true);
      } else if (e.key.toLowerCase() === 'd') {
        toggleDarkMode();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appMode, viewingVisit, editingVisit, toggleDarkMode]);

  // Badge unlock notifications
  useEffect(() => {
    if (!visits.length) return;
    const newBadges = computeBadges(visits);
    if (prevBadgesRef.current) {
      const unlocked = detectNewBadges(prevBadgesRef.current, newBadges);
      unlocked.forEach(b => {
        toastBag.show(`${b.icon} Badge: ${b.name} (${b.tier})`);
      });
    }
    prevBadgesRef.current = newBadges;
  }, [visits]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadVisits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchVisits();
      setVisits(data);
    } catch (err) {
      setError('Failed to load visits. Make sure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVisit = async (visitData) => {
    try {
      setError(null);
      const newVisit = await createVisit(visitData);
      setVisits((prev) => [newVisit, ...prev]);
      setShowForm(false);
      toastBag.show('Visit added.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError('Failed to add visit. Please try again.');
      toastBag.show('Could not add visit.', 'error');
      console.error(err);
    }
  };

  const handleEditVisit = (visit) => {
    setEditingVisit(visit);
    setShowForm(false);
    setViewingVisit(null);
  };

  const handleUpdateVisit = async (visitData) => {
    try {
      setError(null);
      const updatedVisit = await updateVisit(editingVisit.id, visitData);
      setVisits((prev) => prev.map((v) => (v.id === editingVisit.id ? updatedVisit : v)));
      setEditingVisit(null);
      toastBag.show('Visit updated.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError('Failed to update visit. Please try again.');
      toastBag.show('Could not update visit.', 'error');
      console.error(err);
    }
  };

  const handleDeleteVisit = async (id) => {
    const deletedVisit = visits.find((v) => v.id === id);
    try {
      setError(null);
      await deleteVisit(id);
      setVisits((prev) => prev.filter((v) => v.id !== id));
      setViewingVisit((prev) => (prev?.id === id ? null : prev));
      toastBag.show('Visit deleted. Click to undo.', 'success', {
        duration: 5000,
        onUndo: async () => {
          try {
            const restored = await createVisit(deletedVisit);
            setVisits((prev) => [restored, ...prev]);
            toastBag.show('Visit restored.');
          } catch {
            toastBag.show('Could not restore visit.', 'error');
          }
        },
      });
    } catch (err) {
      setError('Failed to delete visit. Please try again.');
      toastBag.show('Could not delete visit.', 'error');
      console.error(err);
    }
  };

  const handleDuplicateVisit = async (visit) => {
    const duplicatedPayload = {
      ...visit,
      id: undefined,
      date: getTodayDateString(),
      notes: visit.notes ? `${visit.notes} (dup)` : '',
    };

    try {
      setError(null);
      const duplicated = await createVisit(duplicatedPayload);
      setVisits((prev) => [duplicated, ...prev]);
      setViewingVisit(null);
      setEditingVisit(duplicated);
    } catch (err) {
      setError('Failed to duplicate visit. Please try again.');
      toastBag.show('Could not duplicate visit.', 'error');
      console.error(err);
    }
  };

  const handleModalUpdateVisit = async (id, updatedData) => {
    try {
      setError(null);
      const updatedVisit = await updateVisit(id, updatedData);
      setVisits((prev) => prev.map((visit) => (visit.id === id ? updatedVisit : visit)));
      setViewingVisit(updatedVisit);
      toastBag.show('Visit updated.');
    } catch (err) {
      setError('Failed to update visit. Please try again.');
      toastBag.show('Could not update visit.', 'error');
      console.error(err);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingVisit(null);
  };


  const filteredVisits = visits.filter((visit) => {
    if (sportFilter && visit.sport !== sportFilter) {
      return false;
    }

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    return (
      visit.coffee_shop_name.toLowerCase().includes(query) ||
      visit.city?.toLowerCase().includes(query) ||
      visit.opponent?.toLowerCase().includes(query) ||
      visit.coffee_order?.toLowerCase().includes(query) ||
      visit.notes?.toLowerCase().includes(query)
    );
  });

  const sortedVisits = [...filteredVisits].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    switch (sortBy) {
      case 'date':
        return dir * (new Date(b.date) - new Date(a.date));
      case 'vibe':
        return dir * (b.vibe_rating - a.vibe_rating);
      case 'coffee':
        return dir * (b.coffee_rating - a.coffee_rating);
      case 'composite':
        return dir * (b.composite_score - a.composite_score);
      default:
        return 0;
    }
  });

  const hasActiveFilters = Boolean(searchQuery || sportFilter);
  const modeLabel = appMode === APP_MODES.VEST ? 'VEST TRACKER' : 'VIBES & GRINDS';

  const avgVibe = useMemo(
    () =>
      visits.length ? (visits.reduce((sum, visit) => sum + visit.vibe_rating, 0) / visits.length).toFixed(1) : '0.0',
    [visits]
  );
  const avgCoffee = useMemo(
    () =>
      visits.length
        ? (visits.reduce((sum, visit) => sum + visit.coffee_rating, 0) / visits.length).toFixed(1)
        : '0.0',
    [visits]
  );
  const avgComposite = useMemo(
    () =>
      visits.length
        ? (visits.reduce((sum, visit) => sum + visit.composite_score, 0) / visits.length).toFixed(1)
        : '0.0',
    [visits]
  );

  const topCoffeeOrders = useMemo(() => {
    const orderCounts = {};
    visits.forEach((visit) => {
      const order = visit.coffee_order?.trim();
      if (order) {
        orderCounts[order] = (orderCounts[order] || 0) + 1;
      }
    });

    return Object.entries(orderCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([order, count]) => ({ order, count }));
  }, [visits]);

  const shopVisitCounts = useMemo(() => {
    const counts = {};
    visits.forEach((v) => {
      const key = v.coffee_shop_name.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [visits]);

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 transition-colors duration-200">
        <header className="bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 transition-colors duration-200 safe-top">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <div className="flex items-center justify-between gap-3">
              <div className="relative min-w-0">
                <button
                  onClick={() => setShowModeMenu((prev) => !prev)}
                  onBlur={() => window.setTimeout(() => setShowModeMenu(false), 120)}
                  className="flex items-center gap-2 sm:gap-4 text-left hover:opacity-80 transition-opacity min-w-0"
                  aria-label="Toggle app mode"
                >
                  <div className="text-2xl sm:text-4xl shrink-0">{appMode === APP_MODES.VEST ? '👔' : '☕'}</div>
                  <h1 className="coffee-shop-name text-xl sm:text-3xl lg:text-4xl font-black tracking-tight truncate">{modeLabel}</h1>
                  <svg className="w-4 h-4 text-stone-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" />
                  </svg>
                </button>

                {showModeMenu && (
                  <div className="absolute left-0 mt-2 w-56 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-lg z-20 overflow-hidden">
                    <button
                      onMouseDown={() => {
                        setShowModeMenu(false);
                        setAppMode(APP_MODES.VIBES);
                      }}
                      className={`w-full text-left px-4 py-3.5 text-sm ${
                        appMode === APP_MODES.VIBES
                          ? 'bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-100'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'
                      }`}
                    >
                      ☕ VIBES & GRINDS
                    </button>
                    <button
                      onMouseDown={() => {
                        setShowModeMenu(false);
                        setAppMode(APP_MODES.VEST);
                      }}
                      className={`w-full text-left px-4 py-3.5 text-sm ${
                        appMode === APP_MODES.VEST
                          ? 'bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-100'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'
                      }`}
                    >
                      👔 VEST TRACKER
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <button
                  onClick={toggleDarkMode}
                  className="p-2.5 rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                  aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {darkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
                {appMode === APP_MODES.VIBES && !showForm && !editingVisit && (
                  <button onClick={() => setShowForm(true)} className="btn-primary hidden md:block">
                    Add Visit
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {appMode === APP_MODES.VEST ? (
          <Suspense fallback={<div className="flex items-center justify-center py-20 text-stone-400 animate-pulse">Loading...</div>}>
            <VestTrackerDashboard showToast={toastBag.show} />
          </Suspense>
        ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-5 py-4 rounded-2xl transition-colors">
              {error}
            </div>
          )}

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <SnapshotCard label="Total Visits" value={visits.length} index={0} />
            <SnapshotCard label="Avg Vibe" value={avgVibe} accentColor={getRatingColor(Number(avgVibe))} index={1} />
            <SnapshotCard label="Avg Coffee" value={avgCoffee} accentColor={getRatingColor(Number(avgCoffee))} index={2} />
            <SnapshotCard label="Avg Total" value={`${avgComposite} / 20`} accentColor={getCompositeColor(Number(avgComposite))} index={3} />
          </section>

          {visits.length >= 3 && (
            <button
              onClick={() => setShowYearReview(true)}
              className="w-full mb-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl p-4 sm:p-5 shadow-sm transition-all hover:shadow-md flex items-center justify-between group"
            >
              <div className="text-left">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-100/70">Year in Review</p>
                <p className="text-lg sm:text-xl font-bold mt-0.5">Your {new Date().getFullYear()} Coffee Wrapped</p>
              </div>
              <svg className="w-6 h-6 text-amber-100/70 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Visits / Insights tab toggle */}
          <div className="flex rounded-xl border border-stone-300 dark:border-stone-600 overflow-hidden mb-6">
            {[
              { id: 'visits', label: 'Visits' },
              { id: 'insights', label: 'Insights' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setViewTab(tab.id)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-r last:border-r-0 border-stone-300 dark:border-stone-600 ${
                  viewTab === tab.id
                    ? 'bg-stone-800 dark:bg-stone-700 text-stone-50'
                    : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {viewTab === 'insights' ? (
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-stone-400 animate-pulse">Loading insights...</div>}>
              <InsightsPanel visits={visits} />
            </Suspense>
          ) : (
          <>
          {topCoffeeOrders.length > 0 && (
            <section className="mb-6 bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-600/60 rounded-2xl p-4 sm:p-5 transition-colors shadow-sm">
              <h3 className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-[0.08em] mb-3 select-none">Top Orders</h3>
              <div className="flex flex-wrap gap-2">
                {topCoffeeOrders.map(({ order, count }) => (
                  <div
                    key={order}
                    className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 flex items-center gap-2"
                  >
                    <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{order}</span>
                    <span className="px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-600 text-xs font-semibold text-stone-700 dark:text-stone-200">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {visits.some((v) => v.coffee_shop_lat) && (
            <section className="mb-6 bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-600/60 rounded-2xl p-4 sm:p-5 transition-colors shadow-sm">
              <h3 className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-[0.08em] mb-3 select-none">Map</h3>
              <div className="h-64 sm:h-80 lg:h-96 rounded-xl overflow-hidden" style={{ isolation: 'isolate' }}>
                <Suspense fallback={<div className="h-full flex items-center justify-center text-stone-400 dark:text-stone-500 text-sm animate-pulse">Loading map...</div>}>
                  <VisitsMap visits={visits} onVisitClick={setViewingVisit} />
                </Suspense>
              </div>
            </section>
          )}

          <section className="mb-6 bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-600/60 rounded-2xl p-4 sm:p-5 transition-colors shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-stone-900 dark:text-stone-50 mb-1 transition-colors">Visits</h2>
                <p className="text-stone-500 dark:text-stone-400 text-sm tracking-wide transition-colors">
                  {hasActiveFilters
                    ? `Showing ${sortedVisits.length} of ${visits.length} ${visits.length === 1 ? 'visit' : 'visits'}`
                    : `${visits.length} total ${visits.length === 1 ? 'visit' : 'visits'}`}
                </p>
                {hasActiveFilters && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {sportFilter && (
                      <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-600">
                        {sportFilter}
                        <button
                          onClick={() => setSportFilter('')}
                          className="ml-0.5 p-0.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                          aria-label={`Remove ${sportFilter} filter`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    )}
                    {searchQuery && (
                      <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-600">
                        "{searchQuery}"
                        <button
                          onClick={() => setSearchQuery('')}
                          className="ml-0.5 p-0.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                          aria-label="Clear search"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    )}
                    <button
                      onClick={() => { setSearchQuery(''); setSportFilter(''); }}
                      className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 underline underline-offset-2 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center lg:justify-end">
                <div className="flex rounded-xl border border-stone-300 dark:border-stone-600 overflow-hidden">
                  {[
                    { value: 'date', label: 'Date' },
                    { value: 'vibe', label: 'Vibe' },
                    { value: 'coffee', label: 'Coffee' },
                    { value: 'composite', label: 'Total' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={`flex-1 sm:flex-none px-3 py-2.5 text-sm transition-colors border-r last:border-r-0 border-stone-300 dark:border-stone-600 flex items-center justify-center gap-1 ${
                        sortBy === option.value
                          ? 'bg-stone-800 dark:bg-stone-700 text-stone-50'
                          : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                      }`}
                      aria-pressed={sortBy === option.value}
                    >
                      {option.label}
                      {sortBy === option.value && (
                        <svg className={`w-3 h-3 transition-transform ${sortAsc ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>

                <select
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-400 dark:focus:ring-stone-500 cursor-pointer transition-colors sm:min-w-[180px]"
                >
                  <option value="">All sports</option>
                  <option value="Men's Basketball">Men's Basketball</option>
                  <option value="Football">Football</option>
                  <option value="Track & Field">Track & Field</option>
                  <option value="Cross Country">Cross Country</option>
                </select>
              </div>
            </div>

            <div className="relative mt-4 search-glow rounded-xl transition-shadow">
              <input
                ref={searchRef}
                type="text"
                placeholder="Search by shop name, city, opponent, or order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-11 pr-16 border border-stone-300 dark:border-stone-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-stone-400 dark:focus:ring-stone-500 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 transition-colors"
              />
              <svg
                className="absolute left-3.5 top-3.5 h-5 w-5 text-stone-400 dark:text-stone-500 transition-colors"
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
              {searchQuery ? (
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
              ) : (
                <kbd className="absolute right-3 top-3 hidden sm:inline-flex items-center px-2 py-1 text-xs font-medium text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-md">
                  /
                </kbd>
              )}
            </div>
          </section>

          <VisitList
            visits={sortedVisits}
            loading={loading}
            onEdit={handleEditVisit}
            onDelete={handleDeleteVisit}
            onViewDetails={setViewingVisit}
            onAddVisit={() => setShowForm(true)}
            hasActiveFilters={hasActiveFilters}
            shopVisitCounts={shopVisitCounts}
          />
          </>
          )}
        </main>
        )}

        <footer className="mt-20 py-8 text-center text-stone-500 dark:text-stone-400 text-sm tracking-wide border-t border-stone-200 dark:border-stone-600 transition-colors">
          <p>{appMode === APP_MODES.VEST ? "Built for charting AJ's sideline fits and results" : "Built for logging AJ Harrison's road coffee orders"}</p>
        </footer>

        {appMode === APP_MODES.VIBES && !showForm && !editingVisit && (
          <button
            onClick={() => setShowForm(true)}
            className="fixed right-5 md:right-6 w-14 h-14 bg-stone-800 dark:bg-stone-700 text-stone-50 rounded-full shadow-lg hover:bg-stone-900 dark:hover:bg-stone-600 transition-all flex items-center justify-center z-50 hover:scale-110 active:scale-95"
            style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
            aria-label="Add Visit"
          >
            <svg className="w-7 h-7 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}

        {viewingVisit && (
          <Suspense fallback={null}>
          <VisitDetailModal
            visit={viewingVisit}
            visits={sortedVisits}
            onClose={() => setViewingVisit(null)}
            onNavigate={setViewingVisit}
            onUpdate={handleModalUpdateVisit}
            onEdit={handleEditVisit}
            onDelete={handleDeleteVisit}
            onDuplicate={handleDuplicateVisit}
          />
          </Suspense>
        )}

        {appMode === APP_MODES.VIBES && showForm && (
          <FormModal title="Add Visit" onClose={handleCancelForm}>
            <AddVisitForm onSubmit={handleAddVisit} onCancel={handleCancelForm} visits={visits} />
          </FormModal>
        )}

        {appMode === APP_MODES.VIBES && editingVisit && (
          <FormModal title="Edit Visit" onClose={handleCancelForm}>
            <AddVisitForm initialData={editingVisit} onSubmit={handleUpdateVisit} onCancel={handleCancelForm} visits={visits} />
          </FormModal>
        )}

        {toastBag.toast && (
          <div
            className={`fixed top-4 right-4 z-[1004] ${toastBag.exiting ? 'animate-toast-out' : 'animate-toast-in'}`}
            onClick={() => {
              if (toastBag.toast.onUndo) {
                toastBag.toast.onUndo();
                toastBag.dismiss();
              } else {
                toastBag.dismiss();
              }
            }}
          >
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border text-sm cursor-pointer select-none transition-opacity hover:opacity-80 ${
                toastBag.toast.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-200'
              }`}
            >
              <span>{toastBag.toast.onUndo ? 'Visit deleted.' : toastBag.toast.message}</span>
              {toastBag.toast.onUndo && (
                <span className="font-semibold underline underline-offset-2">Undo</span>
              )}
            </div>
          </div>
        )}

        {showShortcuts && (
          <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
        )}

        {showYearReview && (
          <Suspense fallback={null}>
            <YearInReview visits={visits} onClose={() => setShowYearReview(false)} />
          </Suspense>
        )}

      </div>
    </ErrorBoundary>
  );
}

function SnapshotCard({ label, value, accentColor, index = 0 }) {
  return (
    <div className="relative bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-600/60 rounded-2xl p-4 sm:p-5 transition-all shadow-sm overflow-hidden group hover:shadow-md">
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{ backgroundColor: accentColor }}
        />
      )}
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500 select-none">{label}</p>
      <p
        className="text-3xl font-black rating-number text-stone-900 dark:text-stone-50 mt-2 animate-stat-pop"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        {value}
      </p>
    </div>
  );
}
