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
import { sortVisits } from './utils/sortVisits';
import { titleCaseOrder } from './utils/display';
import { fetchVisits, createVisit, updateVisit, deleteVisit, ownerRequest, restoreVisit } from './utils/api';
import { getAvailableSeasons, getCurrentSeason, getSeasonVisits } from './utils/yearReview';
import OwnerPanel from './components/OwnerPanel';
import ShopHistory from './components/ShopHistory';
import useJournalRoute from './hooks/useJournalRoute';
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
  const { route, navigate, closeLayer } = useJournalRoute();
  const viewingVisit = visits.find((visit) => String(visit.id) === route.visit) || null;
  const setViewingVisit = (value) => {
    const next = typeof value === 'function' ? value(viewingVisit) : value;
    if (next) navigate({ visit: String(next.id) }, { layer: true, replace: Boolean(viewingVisit) });
    else if (route.visit) closeLayer('visit');
  };
  const [owner, setOwner] = useState(false);
  const [showOwner, setShowOwner] = useState(false);
  const [error, setError] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const showYearReview = Boolean(route.season);
  const setShowYearReview = (open) => open ? navigate({ season: reviewSeason }, { layer: true }) : closeLayer('season');
  const searchRef = useRef(null);

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
  const appMode = isVestDomain ? APP_MODES.VEST : route.app;
  const viewTab = route.view;

  const setSortBy = (v) => setViewPrefs((p) => {
    if (p.sortBy === v) return { ...p, sortAsc: !p.sortAsc };
    return { ...p, sortBy: v, sortAsc: false };
  });
  const setSearchQuery = (v) => setViewPrefs((p) => ({ ...p, searchQuery: v }));
  const setSportFilter = (v) => setViewPrefs((p) => ({ ...p, sportFilter: v }));
  const setRepeatFilter = (v) => setViewPrefs((p) => ({ ...p, repeatFilter: v }));
  const setScopeFilter = (v) => setViewPrefs((p) => ({ ...p, scopeFilter: v }));
  const setViewTab = (view) => navigate({ view, visit: null, shop: null, season: null });
  const openShop = (visit) => navigate({ shop: visit.shop_id, visit: null }, { layer: true });

  useEffect(() => {
    loadVisits();
  }, []);

  useEffect(() => {
    ownerRequest().then((session) => setOwner(session.owner)).catch(() => setOwner(false));
    const signIn = () => { setOwner(false); setShowOwner(true); };
    window.addEventListener('vg:sign-in-required', signIn);
    return () => window.removeEventListener('vg:sign-in-required', signIn);
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

      // An open dialog owns the keyboard. The tag guard above only covers text
      // fields, so with focus on a button inside the visit form a stray `v`
      // switched app modes — unmounting the form and discarding the draft.
      if (showForm || editingVisit || viewingVisit || showOwner || showYearReview || showShortcuts) return;

      if (e.key === '/' && appMode === APP_MODES.VIBES) {
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
  }, [appMode, showForm, viewingVisit, editingVisit, showOwner, showYearReview, showShortcuts, owner, toggleDarkMode]);

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
      toastBag.show('Could not add visit.', 'error');
      throw err;
    }
  };

  const handleEditVisit = (visit) => {
    if (!owner) { setShowOwner(true); return; }
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
      toastBag.show('Could not update visit.', 'error');
      throw err;
    }
  };

  const handleDeleteVisit = async (id) => {
    try {
      setError(null);
      await deleteVisit(id);
      setVisits((prev) => prev.filter((v) => v.id !== id));
      setViewingVisit((prev) => (prev?.id === id ? null : prev));
      toastBag.show('Moved to deleted visits. Undo', 'success', {
        duration: 5000,
        onUndo: async () => {
          try {
            const restored = await restoreVisit(id);
            setVisits((prev) => [restored, ...prev]);
            toastBag.show('Visit restored.');
          } catch {
            toastBag.show('Could not restore visit.', 'error');
          }
        },
      });
    } catch (err) {
      toastBag.show('Could not delete visit.', 'error');
      console.error(err);
    }
  };

  const handleOpenNewVisit = () => {
    if (!owner) { setShowOwner(true); return; }
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
    if (!owner) { setShowOwner(true); return; }
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
      toastBag.show('Could not update visit.', 'error');
      throw err;
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setVisitDraft(null);
    setEditingVisit(null);
  };
  const shopVisitCounts = useMemo(() => getShopVisitCounts(visits), [visits]);
  const shopCount = Object.keys(shopVisitCounts).length;
  const cityCount = new Set(visits.map((visit) => visit.city).filter(Boolean)).size;

  // A draft with a shop already filled in came from "Log return visit"; a bare
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

  const sortedVisits = useMemo(() => sortVisits(filteredVisits, sortBy, sortAsc), [filteredVisits, sortBy, sortAsc]);

  const hasActiveFilters = Boolean(searchQuery || sportFilter || repeatFilter || scopeFilter);
  const modeLabel = appMode === APP_MODES.VEST ? 'VEST TRACKER' : 'VIBES & GRINDS';

  const avgVibe = useMemo(
    () =>
      visits.length ? (visits.reduce((sum, visit) => sum + Number(visit.vibe_rating), 0) / visits.length).toFixed(1) : '0.0',
    [visits]
  );
  const avgCoffee = useMemo(
    () =>
      visits.length
        ? (visits.reduce((sum, visit) => sum + Number(visit.coffee_rating), 0) / visits.length).toFixed(1)
        : '0.0',
    [visits]
  );
  const avgComposite = useMemo(
    () =>
      visits.length
        ? (visits.reduce((sum, visit) => sum + Number(visit.composite_score), 0) / visits.length).toFixed(1)
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
    <div className={`min-h-screen transition-colors duration-200 ${appMode === APP_MODES.VEST ? 'vest-tracker-page' : 'coffee-journal-page'}`}>
        <header className={`safe-top transition-colors duration-200 ${
          appMode === APP_MODES.VEST
            ? 'vest-tracker-header'
            : ''
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <a className="journal-brand" href={isVestDomain ? '/' : appMode === APP_MODES.VEST ? '/?app=vest' : '/'} onClick={(event) => { event.preventDefault(); navigate({ view: 'visits', visit: null, shop: null, season: null }); }}>
                <h1>{appMode === APP_MODES.VEST ? 'Vest Tracker' : 'vibes & grinds'}</h1>
              </a>

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
                {owner && appMode === APP_MODES.VIBES && !showForm && !editingVisit && (
                  <>
                    <button onClick={handleOpenNewVisit} className="btn-primary hidden sm:block">Add visit</button>
                    <button onClick={handleOpenNewVisit} className="header-icon-button sm:hidden" aria-label="Add visit">
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
            <VestTrackerDashboard showToast={toastBag.show} canEdit={owner} />
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
          {viewTab === 'visits' && !route.shop && <section className="journal-summary">
            <div className="journal-intro">
              <h2>{visits.length} <span>{visits.length === 1 ? 'visit' : 'visits'}</span></h2>
              <p className="journal-totals">{shopCount} {shopCount === 1 ? 'shop' : 'shops'} <span>·</span> {cityCount} {cityCount === 1 ? 'city' : 'cities'}</p>
            </div>
            <div className="journal-averages">
              <p className="eyebrow">Average ratings</p>
              <div className="journal-average-values">
                <EditorialStat label="Vibe" value={avgVibe} suffix="/ 10" />
                <EditorialStat label="Coffee" value={avgCoffee} suffix="/ 10" />
                <EditorialStat label="Overall" value={avgComposite} suffix="/ 20" />
              </div>
            </div>
          </section>}

          {/* Section nav */}
          <div className="journal-navigation flex items-center justify-between gap-5 mb-6 border-b border-stone-900/10 dark:border-stone-100/10">
            <div className="flex items-end gap-7 sm:gap-9">
            {[
              { id: 'visits', label: 'Journal' },
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
            {seasonVisitCount > 0 && (
              <button onClick={() => setShowYearReview(true)} className="season-link">
                Seasons
                <span aria-hidden="true">↗</span>
              </button>
            )}
          </div>

          {route.shop ? <ShopHistory shopId={route.shop} visits={visits} onBack={() => closeLayer('shop')} onVisitClick={setViewingVisit} onEdit={owner ? handleEditVisit : undefined} onDelete={owner ? handleDeleteVisit : undefined} onLogReturnVisit={owner ? handleLogReturnVisit : undefined} /> : viewTab === 'insights' ? (
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-stone-400 animate-pulse">Loading insights...</div>}>
              <InsightsPanel visits={visits} onVisitClick={setViewingVisit} onShopClick={openShop} />
            </Suspense>
          ) : viewTab === 'map' ? (
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-stone-400 animate-pulse">Loading map...</div>}>
              <MapExplorer visits={visits} onVisitClick={setViewingVisit} onShopClick={openShop} onRepair={owner ? handleEditVisit : undefined} />
            </Suspense>
          ) : (
          <>
          <section className="log-toolbar mb-5">
            <div className="relative search-glow rounded-lg transition-shadow mb-5">
              <input
                ref={searchRef}
                type="search"
                aria-label="Search the coffee journal"
                placeholder="Find a shop, city, or favorite order"
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
                  {hasActiveFilters ? 'Matching stops' : 'All stops'}
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
                    onChange={(e) => setViewPrefs((prefs) => ({ ...prefs, sortBy: e.target.value, sortAsc: false }))}
                    aria-label="Sort visits"
                    className="control-field flex-1"
                  >
                    <option value="date">{sortAsc && sortBy === 'date' ? 'Oldest first' : 'Newest first'}</option>
                    <option value="vibe">{sortAsc && sortBy === 'vibe' ? 'Lowest vibe' : 'Best vibe'}</option>
                    <option value="coffee">{sortAsc && sortBy === 'coffee' ? 'Lowest coffee' : 'Best coffee'}</option>
                    <option value="composite">{sortAsc && sortBy === 'composite' ? 'Lowest overall' : 'Best overall'}</option>
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
                    { value: 'date', label: sortBy === 'date' && sortAsc ? 'Oldest first' : 'Newest first' },
                    { value: 'vibe', label: sortBy === 'vibe' && sortAsc ? 'Lowest vibe' : 'Highest vibe' },
                    { value: 'coffee', label: sortBy === 'coffee' && sortAsc ? 'Lowest coffee' : 'Highest coffee' },
                    { value: 'composite', label: sortBy === 'composite' && sortAsc ? 'Lowest total' : 'Highest total' },
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
            onEdit={owner ? handleEditVisit : undefined}
            onDelete={owner ? handleDeleteVisit : undefined}
            onViewDetails={setViewingVisit}
            onAddVisit={owner ? handleOpenNewVisit : undefined}
            onLogReturnVisit={owner ? handleLogReturnVisit : undefined}
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
              AJ Harrison’s coffee journal
            </p>
          ) : (
            <p>Built for charting AJ's sideline fits and results</p>
          )}
          <div className="footer-links"><a href={appMode === APP_MODES.VIBES ? '/?app=vest' : isVestDomain ? 'https://coffee.erikrole.com/' : '/'}>{appMode === APP_MODES.VIBES ? 'Vest Tracker ↗' : 'Coffee journal ↗'}</a><button type="button" onClick={() => setShowOwner(true)}>{owner ? 'Manage journal' : 'Owner sign-in'}</button></div>
        </footer>
        )}

        {showOwner && <FormModal topmost title={owner ? 'Manage journal' : 'Owner sign-in'} onClose={() => setShowOwner(false)}>
          <OwnerPanel owner={owner} onSignedIn={() => { setOwner(true); setShowOwner(false); toastBag.show('Signed in.'); }} onSignedOut={() => { setOwner(false); setShowOwner(false); }} onRestored={(visit) => { setVisits((items) => [visit, ...items]); toastBag.show('Visit restored.'); }} />
        </FormModal>}

        {!loading && !error && route.visit && !viewingVisit && <FormModal title="Visit not found" onClose={() => closeLayer('visit')}><VisitNotFound onBack={() => closeLayer('visit')} /></FormModal>}

        {viewingVisit && (
          <Suspense fallback={null}>
          <VisitDetailModal
            key={viewingVisit.id}
            suspended={showOwner}
            visit={viewingVisit}
            visits={sortVisits(visits)}
            onShopClick={openShop}
            onClose={() => setViewingVisit(null)}
            onNavigate={setViewingVisit}
            onUpdate={owner ? handleModalUpdateVisit : undefined}
            onEdit={owner ? handleEditVisit : undefined}
            onDelete={owner ? handleDeleteVisit : undefined}
            onLogReturnVisit={owner ? handleLogReturnVisit : undefined}
          />
          </Suspense>
        )}

        {appMode === APP_MODES.VIBES && showForm && (
          <FormModal active={!showOwner} title={isReturnDraft ? 'Log return visit' : 'Add visit'} onClose={handleCancelForm}>
            <AddVisitForm
              initialData={visitDraft}
              mode={isReturnDraft ? 'return' : 'add'}
              onSubmit={handleAddVisit}
              visits={visits}
            />
          </FormModal>
        )}

        {appMode === APP_MODES.VIBES && editingVisit && (
          <FormModal active={!showOwner} title="Edit visit" onClose={handleCancelForm}>
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
              <span>{toastBag.toast.onUndo ? 'Moved to deleted visits.' : toastBag.toast.message}</span>
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
            <YearInReview visits={visits} initialSeason={route.season} onSeasonChange={(season) => navigate({ season }, { replace: true })} onVisitClick={(visit) => navigate({ season: null, visit: String(visit.id) }, { replace: true })} onClose={() => setShowYearReview(false)} />
          </Suspense>
        )}

      </div>
    </ErrorBoundary>
  );
}

function EditorialStat({ label, value, suffix }) {
  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center gap-1.5 mb-2">
        <p className="eyebrow truncate">{label}</p>
      </div>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span
          className="text-2xl sm:text-3xl tracking-tight font-semibold tabular-nums"
          style={{
            color: 'var(--ink)',
            fontFamily: 'Inter, system-ui, sans-serif',
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

function VisitNotFound({ onBack }) {
  return <section><h2 className="type-title">Visit not found</h2><p className="type-meta my-4">This visit is no longer published. You can keep browsing the journal.</p><button className="btn-primary" onClick={onBack}>Back</button></section>;
}
