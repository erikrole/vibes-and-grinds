import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import AddVisitForm from '../components/AddVisitForm';
import VisitList from '../components/VisitList';
import FormModal from '../components/FormModal';
import AppChrome from './AppChrome';
import { APP_MODES } from '../constants/appModes';
import { titleCaseOrder } from '../utils/display';
import { fetchVisits, createVisit, updateVisit, deleteVisit } from '../utils/api';
import { getAvailableSeasons, getCurrentSeason, getSeasonVisits } from '../utils/yearReview';
import { computeBadges, detectNewBadges } from '../utils/badges';
import { buildReturnVisitDraft, getShopRepeatKey, getShopVisitCounts } from '../utils/repeats';
import { HOME_CITY, VISIT_TYPES, getVisitType } from '../utils/visitTypes';

const VisitDetailModal = lazy(() => import('../components/VisitDetailModal'));
const MapExplorer = lazy(() => import('../components/MapExplorer'));
const InsightsPanel = lazy(() => import('../components/InsightsPanel'));
const YearInReview = lazy(() => import('../components/YearInReview'));

/**
 * Coffee journal mode container: visit CRUD, filters, badges, tabs, and lazy panels.
 * Mode switch / dark mode / toast live in App; chrome is shared via AppChrome.
 */
export default function CoffeeJournalShell({
  setAppMode,
  darkMode,
  toggleDarkMode,
  viewPrefs,
  setViewPrefs,
  showToast,
  onBlockingUiChange,
}) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [visitDraft, setVisitDraft] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null);
  const [viewingVisit, setViewingVisit] = useState(null);
  const [error, setError] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showYearReview, setShowYearReview] = useState(false);
  const searchRef = useRef(null);
  const prevBadgesRef = useRef(null);

  const sortBy = viewPrefs.sortBy || 'date';
  const sortAsc = viewPrefs.sortAsc || false;
  const searchQuery = viewPrefs.searchQuery || '';
  const sportFilter = viewPrefs.sportFilter || '';
  const repeatFilter = viewPrefs.repeatFilter || '';
  const scopeFilter = viewPrefs.scopeFilter || '';
  const viewTab = viewPrefs.viewTab || 'visits';

  const setSortBy = (v) => setViewPrefs((p) => {
    if (p.sortBy === v) return { ...p, sortAsc: !p.sortAsc };
    return { ...p, sortBy: v, sortAsc: false };
  });
  const setSearchQuery = (v) => setViewPrefs((p) => ({ ...p, searchQuery: v }));
  const setSportFilter = (v) => setViewPrefs((p) => ({ ...p, sportFilter: v }));
  const setRepeatFilter = (v) => setViewPrefs((p) => ({ ...p, repeatFilter: v }));
  const setScopeFilter = (v) => setViewPrefs((p) => ({ ...p, scopeFilter: v }));
  const setViewTab = (v) => setViewPrefs((p) => ({ ...p, viewTab: v }));

  useEffect(() => {
    loadVisits();
  }, []);

  // Tell App when a dialog owns the keyboard so mode-switch shortcuts don't discard drafts.
  useEffect(() => {
    onBlockingUiChange?.(Boolean(showForm || editingVisit || viewingVisit));
    return () => onBlockingUiChange?.(false);
  }, [showForm, editingVisit, viewingVisit, onBlockingUiChange]);

  // Badge unlock notifications
  useEffect(() => {
    if (!visits.length) return;
    const newBadges = computeBadges(visits);
    if (prevBadgesRef.current) {
      const unlocked = detectNewBadges(prevBadgesRef.current, newBadges);
      unlocked.forEach((b) => {
        showToast(`${b.icon} Badge: ${b.name} (${b.tier})`);
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
      showToast('Visit added.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError('Failed to add visit. Please try again.');
      showToast('Could not add visit.', 'error');
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
      showToast('Visit updated.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError('Failed to update visit. Please try again.');
      showToast('Could not update visit.', 'error');
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
      showToast('Visit deleted. Click to undo.', 'success', {
        duration: 5000,
        onUndo: async () => {
          try {
            const restored = await createVisit(deletedVisit);
            setVisits((prev) => [restored, ...prev]);
            showToast('Visit restored.');
          } catch {
            showToast('Could not restore visit.', 'error');
          }
        },
      });
    } catch (err) {
      setError('Failed to delete visit. Please try again.');
      showToast('Could not delete visit.', 'error');
      console.error(err);
    }
  };

  const handleOpenNewVisit = () => {
    setVisitDraft(
      scopeFilter === VISIT_TYPES.HOME
        ? { visit_type: VISIT_TYPES.HOME, city: HOME_CITY }
        : null
    );
    setEditingVisit(null);
    setShowForm(true);
  };

  // Coffee-only keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
      if (showForm || editingVisit || viewingVisit) return;

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === 'n') {
        handleOpenNewVisit();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showForm, viewingVisit, editingVisit, scopeFilter]);

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
      showToast('Visit updated.');
    } catch (err) {
      setError('Failed to update visit. Please try again.');
      showToast('Could not update visit.', 'error');
      console.error(err);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setVisitDraft(null);
    setEditingVisit(null);
  };

  const shopVisitCounts = useMemo(() => getShopVisitCounts(visits), [visits]);
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
  const seasonVisitCount = useMemo(() => getSeasonVisits(visits).length, [visits]);

  const headerActions = !showForm && !editingVisit ? (
    <>
      <button onClick={handleOpenNewVisit} className="btn-primary hidden sm:block">Add Visit</button>
      <button onClick={handleOpenNewVisit} className="header-icon-button sm:hidden" aria-label="Add Visit">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </>
  ) : null;

  return (
    <AppChrome
      appMode={APP_MODES.VIBES}
      setAppMode={setAppMode}
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      headerActions={headerActions}
      showFooter={!loading && !error}
    >
      {loading ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" aria-busy="true">
          <div className="flex items-center justify-center py-20 text-ink-faint animate-pulse">Loading visits…</div>
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

          <div className="flex items-center justify-between gap-5 mb-6 border-b border-rule">
            <div className="flex items-end gap-7 sm:gap-9">
              {[
                { id: 'visits', label: 'Visits' },
                { id: 'map', label: 'Map' },
                { id: 'insights', label: 'Insights' },
              ].map((tab) => (
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
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-ink-faint animate-pulse">Loading insights...</div>}>
              <InsightsPanel visits={visits} />
            </Suspense>
          ) : viewTab === 'map' ? (
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-ink-faint animate-pulse">Loading map...</div>}>
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
                  <svg className="absolute left-3.5 top-3.5 h-5 w-5 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-2 p-2 text-ink-faint hover:text-ink" aria-label="Clear search">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink transition-colors leading-tight">
                      Visits
                    </h2>
                    <p className="text-ink-soft text-sm tracking-wide transition-colors mt-2">
                      {hasActiveFilters
                        ? `${sortedVisits.length} of ${visits.length}`
                        : `${visits.length} ${visits.length === 1 ? 'visit' : 'visits'}`}
                    </p>
                    {hasActiveFilters && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {scopeFilter && (
                          <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-surface-muted text-ink border border-rule">
                            {scopeFilter === VISIT_TYPES.HOME ? 'Around Madison' : 'Road trips'}
                            <button
                              onClick={() => setScopeFilter('')}
                              className="ml-0.5 p-0.5 rounded-full hover:bg-surface-muted transition-colors"
                              aria-label="Clear scope filter"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        )}
                        {sportFilter && (
                          <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-surface-muted text-ink border border-rule">
                            {sportFilter}
                            <button
                              onClick={() => setSportFilter('')}
                              className="ml-0.5 p-0.5 rounded-full hover:bg-surface-muted transition-colors"
                              aria-label={`Remove ${sportFilter} filter`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        )}
                        {repeatFilter && (
                          <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-surface-muted text-ink border border-rule">
                            {repeatFilter === 'first' ? 'First-time shops' : 'Regular spots'}
                            <button
                              onClick={() => setRepeatFilter('')}
                              className="ml-0.5 p-0.5 rounded-full hover:bg-surface-muted transition-colors"
                              aria-label="Clear repeat filter"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        )}
                        {searchQuery && (
                          <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-surface-muted text-ink border border-rule">
                            "{searchQuery}"
                            <button
                              onClick={() => setSearchQuery('')}
                              className="ml-0.5 p-0.5 rounded-full hover:bg-surface-muted transition-colors"
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
                          className="text-xs text-ink-faint hover:text-ink underline underline-offset-2 transition-colors"
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
                    <div className="hidden sm:flex items-end gap-4 sm:gap-5 border-b border-rule pb-0">
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

      {showForm && (
        <FormModal title={isReturnDraft ? 'Log Return Visit' : 'Add Visit'} onClose={handleCancelForm}>
          <AddVisitForm
            initialData={visitDraft}
            mode={isReturnDraft ? 'return' : 'add'}
            onSubmit={handleAddVisit}
            visits={visits}
          />
        </FormModal>
      )}

      {editingVisit && (
        <FormModal title="Edit Visit" onClose={handleCancelForm}>
          <AddVisitForm initialData={editingVisit} mode="edit" onSubmit={handleUpdateVisit} visits={visits} />
        </FormModal>
      )}

      {showYearReview && (
        <Suspense fallback={null}>
          <YearInReview visits={visits} onClose={() => setShowYearReview(false)} />
        </Suspense>
      )}
    </AppChrome>
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
          <span className="text-xs sm:text-sm text-ink-soft font-medium">{suffix}</span>
        )}
      </div>
    </div>
  );
}
