import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import AddVisitForm from './components/AddVisitForm';
import VisitList from './components/VisitList';
import FormModal from './components/FormModal';
import LazyMount from './components/LazyMount';

const VisitDetailModal = lazy(() => import('./components/VisitDetailModal'));
const VisitsMap = lazy(() => import('./components/VisitsMap'));
const VestTrackerDashboard = lazy(() => import('./components/VestTrackerDashboard'));
const InsightsPanel = lazy(() => import('./components/InsightsPanel'));
const YearInReview = lazy(() => import('./components/YearInReview'));
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { fetchVisits, createVisit, updateVisit, deleteVisit } from './utils/api';
import { getRatingColor, getCompositeColor } from './utils/colors';
import { getCurrentSeason } from './utils/yearReview';
import { computeBadges, detectNewBadges } from './utils/badges';
import { buildReturnVisitDraft, getShopRepeatKey, getShopVisitCounts } from './utils/repeats';
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
  const [visitDraft, setVisitDraft] = useState(null);
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
    repeatFilter: '',
    appMode: isVestDomain ? APP_MODES.VEST : APP_MODES.VIBES,
  });

  // Destructure persisted preferences into local aliases for convenience
  const sortBy = viewPrefs.sortBy || 'date';
  const sortAsc = viewPrefs.sortAsc || false;
  const searchQuery = viewPrefs.searchQuery || '';
  const sportFilter = viewPrefs.sportFilter || '';
  const repeatFilter = viewPrefs.repeatFilter || '';
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
  const setRepeatFilter = (v) => setViewPrefs((p) => ({ ...p, repeatFilter: v }));
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
        handleOpenNewVisit();
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
      setVisitDraft(null);
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
    setVisitDraft(null);
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

  const handleOpenNewVisit = () => {
    setVisitDraft(null);
    setEditingVisit(null);
    setShowForm(true);
  };

  const handleLogReturnVisit = (visit) => {
    setVisitDraft(buildReturnVisitDraft(visit));
    setEditingVisit(null);
    setViewingVisit(null);
    setShowForm(true);
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
    setVisitDraft(null);
    setEditingVisit(null);
  };
  const shopVisitCounts = useMemo(() => getShopVisitCounts(visits), [visits]);

  const filteredVisits = visits.filter((visit) => {
    if (sportFilter && visit.sport !== sportFilter) {
      return false;
    }

    if (repeatFilter) {
      const visitCount = shopVisitCounts[getShopRepeatKey(visit)] || 1;
      if (repeatFilter === 'first' && visitCount > 1) return false;
      if (repeatFilter === 'regular' && visitCount < 2) return false;
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

  const hasActiveFilters = Boolean(searchQuery || sportFilter || repeatFilter);
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

  return (
    <ErrorBoundary>
    <div className={`min-h-screen transition-colors duration-200 ${appMode === APP_MODES.VEST ? 'vest-tracker-page' : ''}`}>
        <header className={`safe-top transition-colors duration-200 ${
          appMode === APP_MODES.VEST
            ? 'vest-tracker-header'
            : ''
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <div className="relative flex-1 min-w-0">
                <button
                  onClick={() => setShowModeMenu((prev) => !prev)}
                  onBlur={() => window.setTimeout(() => setShowModeMenu(false), 120)}
                  className="flex max-w-full items-center gap-2 sm:gap-4 text-left hover:opacity-80 transition-opacity min-w-0"
                  aria-label={`${appMode === APP_MODES.VIBES ? 'vibes & grinds' : modeLabel} — toggle app mode`}
                >
                  <div className="text-2xl sm:text-4xl shrink-0">{appMode === APP_MODES.VEST ? '👔' : '☕'}</div>
                  <h1 className={`text-xl sm:text-3xl lg:text-5xl leading-none ${
                    appMode === APP_MODES.VEST
                      ? 'coffee-shop-name font-black tracking-tight'
                      : ''
                  }`}
                    style={appMode === APP_MODES.VIBES ? {
                      fontFamily: 'Fraunces, Georgia, serif',
                      fontWeight: 600,
                      letterSpacing: '0',
                      color: 'var(--ink)',
                    } : undefined}
                  >
                    {appMode === APP_MODES.VIBES ? 'vibes & grinds' : modeLabel}
                  </h1>
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
                  <button onClick={handleOpenNewVisit} className="btn-primary hidden md:block">
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
        ) : loading ? (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" aria-busy="true">
            <div className="flex items-center justify-center py-20 text-stone-400 dark:text-stone-500 animate-pulse">Loading visits…</div>
          </main>
        ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-5 py-4 rounded-2xl transition-colors">
              {error}
            </div>
          )}

          <section className="paper-card p-7 sm:p-10 mb-6 relative overflow-hidden">
            <div
              className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-40 pointer-events-none"
              style={{ background: 'radial-gradient(closest-side, var(--accent-soft), transparent 70%)' }}
            />
            <div className="grid grid-cols-1 lg:grid-cols-[auto_1px_1fr] gap-7 lg:gap-12 items-center relative">
              <div className="flex flex-col justify-center min-w-[8rem]">
                <p className="eyebrow mb-3">Visits</p>
                <p className="hero-numeral text-7xl sm:text-8xl lg:text-9xl">{visits.length}</p>
              </div>
              <div className="rule-v hidden lg:block" />
              <div className="rule-h lg:hidden" />
              <div className="grid grid-cols-3 gap-4 sm:gap-6">
                <EditorialStat label="Vibe" value={avgVibe} accent={getRatingColor(Number(avgVibe))} index={0} />
                <EditorialStat label="Coffee" value={avgCoffee} accent={getRatingColor(Number(avgCoffee))} index={1} />
                <EditorialStat label="Overall" value={avgComposite} suffix="/ 20" accent={getCompositeColor(Number(avgComposite))} index={2} />
              </div>
            </div>
          </section>

          {visits.length >= 3 && (
            <button
              onClick={() => setShowYearReview(true)}
              className="w-full mb-6 group text-left transition-all relative overflow-hidden rounded-[28px] p-6 sm:p-7"
              style={{
                background: 'linear-gradient(135deg, var(--ink) 0%, #2a2018 60%, var(--accent) 130%)',
                color: 'var(--paper)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 14px 36px -16px rgba(217, 111, 46, 0.35)',
              }}
            >
              <div className="flex items-center justify-between gap-3 relative">
                <div>
                  <p className="text-xl sm:text-2xl font-semibold tracking-tight">
                    {getCurrentSeason()} season review
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 group-hover:bg-white/20 group-hover:translate-x-1 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </button>
          )}

          {/* Section nav */}
          <div className="flex items-end gap-7 sm:gap-9 mb-6 border-b border-stone-900/10 dark:border-stone-100/10">
            {[
              { id: 'visits', label: 'Visits' },
              { id: 'insights', label: 'Insights' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setViewTab(tab.id)}
                className="tab-edge text-base sm:text-lg"
                aria-pressed={viewTab === tab.id}
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
            <section className="paper-card p-6 sm:p-7 mb-6">
              <h2 className="eyebrow mb-4">Top orders</h2>
              <div className="flex flex-wrap gap-2.5">
                {topCoffeeOrders.map(({ order, count }) => (
                  <span key={order} className="pill">
                    {order}
                    <span className="pill-count">{count}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {visits.some((v) => v.coffee_shop_lat) && (
            <section className="paper-card p-6 sm:p-7 mb-6">
              <h2 className="eyebrow mb-4">Map</h2>
              <div className="h-64 sm:h-80 lg:h-96 rounded-3xl overflow-hidden" style={{ isolation: 'isolate' }}>
                <LazyMount
                  rootMargin="300px"
                  placeholder={<div className="h-full flex items-center justify-center text-stone-500 dark:text-stone-400 text-sm">Map loads when in view</div>}
                >
                  <Suspense fallback={<div className="h-full flex items-center justify-center text-stone-500 dark:text-stone-400 text-sm animate-pulse">Loading map...</div>}>
                    <VisitsMap visits={visits} onVisitClick={setViewingVisit} />
                  </Suspense>
                </LazyMount>
              </div>
            </section>
          )}

          <section className="paper-card p-6 sm:p-7 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 transition-colors leading-tight">
                  Visits
                </h2>
                <p className="text-stone-500 dark:text-stone-400 text-sm tracking-wide transition-colors mt-2">
                  {hasActiveFilters
                    ? `${sortedVisits.length} of ${visits.length}`
                    : `${visits.length} ${visits.length === 1 ? 'visit' : 'visits'}`}
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
                    {repeatFilter && (
                      <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-600">
                        {repeatFilter === 'first' ? 'First-time shops' : 'Regular spots'}
                        <button
                          onClick={() => setRepeatFilter('')}
                          className="ml-0.5 p-0.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                          aria-label="Clear repeat filter"
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
                      onClick={() => { setSearchQuery(''); setSportFilter(''); setRepeatFilter(''); }}
                      className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 underline underline-offset-2 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center lg:justify-end">
                <div className="flex items-end gap-4 sm:gap-5 border-b border-stone-900/10 dark:border-stone-100/10 pb-0">
                  <span className="eyebrow pb-2.5">Sort</span>
                  {[
                    { value: 'date', label: 'Date' },
                    { value: 'vibe', label: 'Vibe' },
                    { value: 'coffee', label: 'Coffee' },
                    { value: 'composite', label: 'Total' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className="tab-edge text-sm sm:text-base flex items-center gap-1"
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
                  aria-label="Filter visits by sport"
                  className="w-full sm:w-auto px-3 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-400 dark:focus:ring-stone-500 cursor-pointer transition-colors sm:min-w-[180px]"
                >
                  <option value="">All sports</option>
                  <option value="Men's Basketball">Men's Basketball</option>
                  <option value="Men's Hockey">Men's Hockey</option>
                  <option value="Football">Football</option>
                  <option value="Track & Field">Track & Field</option>
                  <option value="Cross Country">Cross Country</option>
                </select>

                <select
                  value={repeatFilter}
                  onChange={(e) => setRepeatFilter(e.target.value)}
                  aria-label="Filter visits by repeat status"
                  className="w-full sm:w-auto px-3 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-400 dark:focus:ring-stone-500 cursor-pointer transition-colors sm:min-w-[170px]"
                >
                  <option value="">All visits</option>
                  <option value="first">First-time shops</option>
                  <option value="regular">Regular spots</option>
                </select>
              </div>
            </div>

            <div className="relative mt-5 search-glow rounded-full transition-shadow">
              <input
                ref={searchRef}
                type="text"
                placeholder="Search shop, city, opponent, or order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3.5 pl-11 pr-16 rounded-full focus:outline-none transition-all"
                style={{
                  backgroundColor: 'var(--paper-tint)',
                  color: 'var(--ink)',
                  border: '1px solid transparent',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--accent)';
                  e.target.style.backgroundColor = 'var(--paper-2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'transparent';
                  e.target.style.backgroundColor = 'var(--paper-tint)';
                }}
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
            onAddVisit={handleOpenNewVisit}
            onLogReturnVisit={handleLogReturnVisit}
            hasActiveFilters={hasActiveFilters}
            shopVisitCounts={shopVisitCounts}
          />
          </>
          )}
        </main>
        )}

        {!loading && (
        <footer className={`mt-16 py-10 text-center transition-colors ${
          appMode === APP_MODES.VEST
            ? 'border-t border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 text-sm'
            : ''
        }`}>
          {appMode === APP_MODES.VIBES ? (
            <p className="text-stone-500 dark:text-stone-400 text-sm">
              Built for logging AJ Harrison's road coffee orders
            </p>
          ) : (
            <p>Built for charting AJ's sideline fits and results</p>
          )}
        </footer>
        )}

        {appMode === APP_MODES.VIBES && !showForm && !editingVisit && (
          <button
            onClick={handleOpenNewVisit}
            className="fab-press fixed right-5 md:right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-50"
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
            onLogReturnVisit={handleLogReturnVisit}
          />
          </Suspense>
        )}

        {appMode === APP_MODES.VIBES && showForm && (
          <FormModal title={visitDraft ? 'Log Return Visit' : 'Add Visit'} onClose={handleCancelForm}>
            <AddVisitForm
              initialData={visitDraft}
              mode={visitDraft ? 'return' : 'add'}
              onSubmit={handleAddVisit}
              onCancel={handleCancelForm}
              visits={visits}
            />
          </FormModal>
        )}

        {appMode === APP_MODES.VIBES && editingVisit && (
          <FormModal title="Edit Visit" onClose={handleCancelForm}>
            <AddVisitForm initialData={editingVisit} mode="edit" onSubmit={handleUpdateVisit} onCancel={handleCancelForm} visits={visits} />
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

function EditorialStat({ label, value, suffix, accent, index = 0 }) {
  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center gap-1.5 mb-2">
        {accent && (
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: accent }}
          />
        )}
        <p className="eyebrow truncate">{label}</p>
      </div>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span
          className="text-3xl sm:text-4xl lg:text-5xl animate-stat-pop tracking-tight font-semibold tabular-nums"
          style={{
            animationDelay: `${index * 80}ms`,
            color: 'var(--ink)',
            fontFamily: 'Fraunces, Georgia, serif',
            fontWeight: 600,
          }}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-medium">{suffix}</span>
        )}
      </div>
    </div>
  );
}
