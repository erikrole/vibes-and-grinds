import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import AddVisitForm from './components/AddVisitForm';
import VisitList from './components/VisitList';
import FormModal from './components/FormModal';

const VisitDetailModal = lazy(() => import('./components/VisitDetailModal'));
const MapExplorer = lazy(() => import('./components/MapExplorer'));
const VestTrackerDashboard = lazy(() => import('./components/VestTrackerDashboard'));
const InsightsPanel = lazy(() => import('./components/InsightsPanel'));
const YearInReview = lazy(() => import('./components/YearInReview'));
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { titleCaseOrder } from './utils/display';
import { fetchVisits, createVisit, updateVisit, deleteVisit } from './utils/api';
import { getAvailableSeasons, getCurrentSeason, getSeasonVisits } from './utils/yearReview';
import { computeBadges, detectNewBadges } from './utils/badges';
import { buildReturnVisitDraft, getShopRepeatKey, getShopVisitCounts } from './utils/repeats';
import { HOME_CITY, VISIT_TYPES, getVisitType } from './utils/visitTypes';
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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showYearReview, setShowYearReview] = useState(false);
  const searchRef = useRef(null);
  const modeMenuRef = useRef(null);
  const modeTriggerRef = useRef(null);
  const prevBadgesRef = useRef(null);

  const [darkMode, toggleDarkMode] = useDarkMode();
  const toastBag = useToast();
  const [viewPrefs, setViewPrefs] = useLocalStorage('vibes-and-grinds:view-preferences', {
    sortBy: 'date',
    searchQuery: '',
    sportFilter: '',
    repeatFilter: '',
    scopeFilter: '',
    appMode: isVestDomain ? APP_MODES.VEST : APP_MODES.VIBES,
  });

  // Destructure persisted preferences into local aliases for convenience
  const sortBy = viewPrefs.sortBy || 'date';
  const sortAsc = viewPrefs.sortAsc || false;
  const searchQuery = viewPrefs.searchQuery || '';
  const sportFilter = viewPrefs.sportFilter || '';
  const repeatFilter = viewPrefs.repeatFilter || '';
  const scopeFilter = viewPrefs.scopeFilter || '';
  const appMode = isVestDomain
    ? APP_MODES.VEST
    : (viewPrefs.appMode || APP_MODES.VIBES);

  const viewTab = viewPrefs.viewTab || 'visits'; // 'visits' | 'map' | 'insights'

  const setSortBy = (v) => setViewPrefs((p) => {
    if (p.sortBy === v) return { ...p, sortAsc: !p.sortAsc };
    return { ...p, sortBy: v, sortAsc: false };
  });
  const setSearchQuery = (v) => setViewPrefs((p) => ({ ...p, searchQuery: v }));
  const setSportFilter = (v) => setViewPrefs((p) => ({ ...p, sportFilter: v }));
  const setRepeatFilter = (v) => setViewPrefs((p) => ({ ...p, repeatFilter: v }));
  const setScopeFilter = (v) => setViewPrefs((p) => ({ ...p, scopeFilter: v }));
  const setViewTab = (v) => setViewPrefs((p) => ({ ...p, viewTab: v }));
  const setAppMode = (v) => setViewPrefs((p) => ({ ...p, appMode: typeof v === 'function' ? v(p.appMode) : v }));

  useEffect(() => {
    loadVisits();
  }, []);

  useEffect(() => {
    if (!showModeMenu) return;

    const closeMenu = (event) => {
      if (event.key === 'Escape') {
        setShowModeMenu(false);
        modeTriggerRef.current?.focus();
      }
    };
    const closeOnOutsideClick = (event) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(event.target)) {
        setShowModeMenu(false);
      }
    };

    document.addEventListener('keydown', closeMenu);
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', closeMenu);
      document.removeEventListener('pointerdown', closeOnOutsideClick);
    };
  }, [showModeMenu]);

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

      // An open dialog owns the keyboard. The tag guard above only covers text
      // fields, so with focus on a button inside the visit form a stray `v`
      // switched app modes — unmounting the form and discarding the draft.
      if (showForm || editingVisit || viewingVisit) return;

      if (e.key.toLowerCase() === 'v') {
        setAppMode((prev) => {
          return prev === APP_MODES.VIBES ? APP_MODES.VEST : APP_MODES.VIBES;
        });
      } else if (e.key === '/' && appMode === APP_MODES.VIBES) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === '?') {
        setShowShortcuts((prev) => !prev);
      } else if (e.key.toLowerCase() === 'n' && appMode === APP_MODES.VIBES) {
        handleOpenNewVisit();
      } else if (e.key.toLowerCase() === 'd') {
        toggleDarkMode();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appMode, showForm, viewingVisit, editingVisit, toggleDarkMode]);

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
      setError('Check your connection and try again.');
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
    // While browsing the Madison list, start new visits on that side of the toggle.
    setVisitDraft(
      scopeFilter === VISIT_TYPES.HOME
        ? { visit_type: VISIT_TYPES.HOME, city: HOME_CITY }
        : null
    );
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

  // A draft with a shop already filled in came from "Log Return Visit"; a bare
  // draft only carries scope defaults for a brand-new stop.
  const isReturnDraft = Boolean(visitDraft?.coffee_shop_name);

  const filteredVisits = useMemo(() => visits.filter((visit) => {
    if (scopeFilter && getVisitType(visit) !== scopeFilter) {
      return false;
    }

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
  }), [visits, scopeFilter, sportFilter, repeatFilter, searchQuery, shopVisitCounts]);

  const sortedVisits = useMemo(() => [...filteredVisits].sort((a, b) => {
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
  }), [filteredVisits, sortBy, sortAsc]);

  const hasActiveFilters = Boolean(searchQuery || sportFilter || repeatFilter || scopeFilter);
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
      const order = titleCaseOrder(visit.coffee_order);
      if (order) {
        orderCounts[order] = (orderCounts[order] || 0) + 1;
      }
    });

    return Object.entries(orderCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([order, count]) => ({ order, count }));
  }, [visits]);
  const reviewSeason = useMemo(() => getAvailableSeasons(visits)[0] || getCurrentSeason(), [visits]);
  // The season report covers road trips only, so gate the link on those.
  const seasonVisitCount = useMemo(() => getSeasonVisits(visits).length, [visits]);

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
              <div className="relative flex-1 min-w-0" ref={modeMenuRef}>
                <button
                  ref={modeTriggerRef}
                  onClick={() => setShowModeMenu((prev) => !prev)}
                  className="flex max-w-full items-center gap-2 sm:gap-4 text-left hover:opacity-80 transition-opacity min-w-0"
                  aria-label={`${appMode === APP_MODES.VIBES ? 'vibes & grinds' : modeLabel} — toggle app mode`}
                  aria-expanded={showModeMenu}
                  aria-haspopup="menu"
                >
                  {appMode === APP_MODES.VEST && <span className="brand-mark" aria-hidden="true">VT</span>}
                  <h1 className={`text-xl sm:text-3xl leading-none ${
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
                  <div className="absolute left-0 mt-2 w-56 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-lg z-20 overflow-hidden" role="menu">
                    <button
                      onClick={() => {
                        setShowModeMenu(false);
                        setAppMode(APP_MODES.VIBES);
                      }}
                      role="menuitemradio"
                      aria-checked={appMode === APP_MODES.VIBES}
                      className={`w-full text-left px-4 py-3.5 text-sm ${
                        appMode === APP_MODES.VIBES
                          ? 'bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-100'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'
                      }`}
                    >
                      Vibes & Grinds
                    </button>
                    <button
                      onClick={() => {
                        setShowModeMenu(false);
                        setAppMode(APP_MODES.VEST);
                      }}
                      role="menuitemradio"
                      aria-checked={appMode === APP_MODES.VEST}
                      className={`w-full text-left px-4 py-3.5 text-sm ${
                        appMode === APP_MODES.VEST
                          ? 'bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-100'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'
                      }`}
                    >
                      Vest Tracker
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
                  <>
                    <button onClick={handleOpenNewVisit} className="btn-primary hidden sm:block">Add Visit</button>
                    <button onClick={handleOpenNewVisit} className="header-icon-button sm:hidden" aria-label="Add Visit">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </>
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
        ) : error ? (
          <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
            <section className="recovery-panel" role="alert">
              <p className="eyebrow mb-3">Connection problem</p>
              <h2 className="text-2xl sm:text-3xl font-semibold mb-3">Couldn’t load the coffee journal</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>{error}</p>
              <button type="button" onClick={loadVisits} className="btn-primary">Try again</button>
            </section>
          </main>
        ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-5 pb-8">
          <section className="journal-summary mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1px_1fr] gap-6 lg:gap-10 items-end">
              <div>
                <p className="eyebrow mb-3">Coffee journal</p>
                <div className="flex items-end gap-3">
                  <p className="hero-numeral text-6xl sm:text-7xl">{visits.length}</p>
                  <p className="text-sm sm:text-base mb-1.5" style={{ color: 'var(--ink-soft)' }}>stops logged on the road and around Madison</p>
                </div>
              </div>
              <div className="rule-v hidden lg:block" />
              <div className="rule-h lg:hidden" />
              <div className="grid grid-cols-3 gap-4 sm:gap-6">
                <EditorialStat label="Vibe" value={avgVibe} index={0} />
                <EditorialStat label="Coffee" value={avgCoffee} index={1} />
                <EditorialStat label="Overall" value={avgComposite} suffix="/ 20" index={2} />
              </div>
            </div>
          </section>

          {/* Section nav */}
          <div className="flex items-center justify-between gap-5 mb-6 border-b border-stone-900/10 dark:border-stone-100/10">
            <div className="flex items-end gap-7 sm:gap-9">
            {[
              { id: 'visits', label: 'Visits' },
              { id: 'map', label: 'Map' },
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
            {seasonVisitCount >= 3 && (
              <button onClick={() => setShowYearReview(true)} className="season-link hidden sm:inline-flex">
                {reviewSeason} review
                <span aria-hidden="true">↗</span>
              </button>
            )}
          </div>

          {viewTab === 'insights' ? (
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-stone-400 animate-pulse">Loading insights...</div>}>
              <InsightsPanel visits={visits} />
            </Suspense>
          ) : viewTab === 'map' ? (
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-stone-400 animate-pulse">Loading map...</div>}>
              <MapExplorer visits={visits} onVisitClick={setViewingVisit} />
            </Suspense>
          ) : (
          <>
          <section className="log-toolbar mb-5">
            <div className="relative search-glow rounded-lg transition-shadow mb-5">
              <input
                ref={searchRef}
                type="search"
                placeholder="Search shops, cities, opponents, or orders"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="journal-search"
              />
              <svg className="absolute left-3.5 top-3.5 h-5 w-5 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-2 p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200" aria-label="Clear search">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
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
                    {scopeFilter && (
                      <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-600">
                        {scopeFilter === VISIT_TYPES.HOME ? 'Around Madison' : 'Road trips'}
                        <button
                          onClick={() => setScopeFilter('')}
                          className="ml-0.5 p-0.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                          aria-label="Clear scope filter"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    )}
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
                      onClick={() => { setSearchQuery(''); setSportFilter(''); setRepeatFilter(''); setScopeFilter(''); }}
                      className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 underline underline-offset-2 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                <div className="flex sm:hidden gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort visits"
                    className="control-field flex-1"
                  >
                    <option value="date">Sort: Date</option>
                    <option value="vibe">Sort: Vibe</option>
                    <option value="coffee">Sort: Coffee</option>
                    <option value="composite">Sort: Total</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowMobileFilters((value) => !value)}
                    className="control-field"
                    aria-expanded={showMobileFilters}
                    aria-controls="mobile-visit-filters"
                  >
                    Filters{(sportFilter || repeatFilter || scopeFilter) ? ' (active)' : ''}
                  </button>
                </div>
                <div className="hidden sm:flex items-end gap-4 sm:gap-5 border-b border-stone-900/10 dark:border-stone-100/10 pb-0">
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

                <div id="mobile-visit-filters" className={`${showMobileFilters ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto`}>
                  <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} aria-label="Filter visits by trip type" className="control-field sm:min-w-[170px]">
                    <option value="">Road & Madison</option>
                    <option value={VISIT_TYPES.ROAD}>Road trips</option>
                    <option value={VISIT_TYPES.HOME}>Around Madison</option>
                  </select>
                  <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)} aria-label="Filter visits by sport" className="control-field sm:min-w-[180px]">
                    <option value="">All sports</option>
                    <option value="Men's Basketball">Men's Basketball</option>
                    <option value="Men's Hockey">Men's Hockey</option>
                    <option value="Football">Football</option>
                    <option value="Track & Field">Track & Field</option>
                    <option value="Cross Country">Cross Country</option>
                  </select>
                  <select value={repeatFilter} onChange={(e) => setRepeatFilter(e.target.value)} aria-label="Filter visits by repeat status" className="control-field sm:min-w-[170px]">
                    <option value="">All visits</option>
                    <option value="first">First-time shops</option>
                    <option value="regular">Regular spots</option>
                  </select>
                </div>
              </div>
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

          <div className="grid gap-5 mt-8">
            {topCoffeeOrders.length > 0 && (
              <section className="supporting-panel">
                <h2 className="eyebrow mb-4">Frequent orders</h2>
                <ol className="order-list">
                  {topCoffeeOrders.map(({ order, count }) => (
                    <li key={order}><span>{order}</span><strong>{count}</strong></li>
                  ))}
                </ol>
              </section>
            )}
          </div>
          </>
          )}
        </main>
        )}

        {!loading && !error && (
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
          <FormModal title={isReturnDraft ? 'Log Return Visit' : 'Add Visit'} onClose={handleCancelForm}>
            <AddVisitForm
              initialData={visitDraft}
              mode={isReturnDraft ? 'return' : 'add'}
              onSubmit={handleAddVisit}
              visits={visits}
            />
          </FormModal>
        )}

        {appMode === APP_MODES.VIBES && editingVisit && (
          <FormModal title="Edit Visit" onClose={handleCancelForm}>
            <AddVisitForm initialData={editingVisit} mode="edit" onSubmit={handleUpdateVisit} visits={visits} />
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

function EditorialStat({ label, value, suffix, index = 0 }) {
  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center gap-1.5 mb-2">
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
