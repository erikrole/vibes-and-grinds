import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import AddVisitForm from '../components/AddVisitForm';
import FormModal from '../components/FormModal';
import ShopHistory from '../components/ShopHistory';
import VisitList from '../components/VisitList';
import { APP_MODES, isVestHostname } from '../constants/appModes';
import useLocalStorage from '../hooks/useLocalStorage';
import { createVisit, deleteVisit, restoreVisit, updateVisit } from '../utils/api';
import { titleCaseOrder } from '../utils/display';
import { buildReturnVisitDraft, getShopRepeatKey, getShopVisitCounts } from '../utils/repeats';
import { sortVisits } from '../utils/sortVisits';
import { HOME_CITY, VISIT_TYPES, getVisitType } from '../utils/visitTypes';
import { getAvailableSeasons, getCurrentSeason, getSeasonVisits } from '../utils/yearReview';
import AppChrome from './AppChrome';

const VisitDetailModal = lazy(() => import('../components/VisitDetailModal'));
const MapExplorer = lazy(() => import('../components/MapExplorer'));
const InsightsPanel = lazy(() => import('../components/InsightsPanel'));
const YearInReview = lazy(() => import('../components/YearInReview'));

/**
 * Coffee journal screen. Owner session and toasts stay in App; this shell owns
 * the visit list UI and only offers add, edit, and delete when `owner` is set.
 */
export default function CoffeeJournalShell({
  isVestDomain,
  darkMode,
  toggleDarkMode,
  owner,
  onOwner,
  onBrand,
  showFooter,
  route,
  navigate,
  closeLayer,
  visits,
  setVisits,
  loading,
  error,
  loadVisits,
  showToast,
  showOwner,
  suspendKeys,
  onBlockingUiChange,
}) {
  const [showForm, setShowForm] = useState(false);
  const [visitDraft, setVisitDraft] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null);
  const viewingVisit = visits.find((visit) => String(visit.id) === route.visit) || null;
  const setViewingVisit = (value) => {
    const next = typeof value === 'function' ? value(viewingVisit) : value;
    if (next) navigate({ visit: String(next.id) }, { layer: true, replace: Boolean(viewingVisit) });
    else if (route.visit) closeLayer('visit');
  };
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const showYearReview = Boolean(route.season);
  const setShowYearReview = (open) => open ? navigate({ season: reviewSeason }, { layer: true }) : closeLayer('season');
  const searchRef = useRef(null);

  const [viewPrefs, setViewPrefs] = useLocalStorage('vibes-and-grinds:view-preferences', {
    sortBy: 'date',
    searchQuery: '',
    sportFilter: '',
    repeatFilter: '',
    scopeFilter: '',
    appMode: isVestHostname() ? APP_MODES.VEST : APP_MODES.VIBES,
  });

  const sortBy = viewPrefs.sortBy || 'date';
  const sortAsc = viewPrefs.sortAsc || false;
  const searchQuery = viewPrefs.searchQuery || '';
  const sportFilter = viewPrefs.sportFilter || '';
  const repeatFilter = viewPrefs.repeatFilter || '';
  const scopeFilter = viewPrefs.scopeFilter || '';
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
    onBlockingUiChange(Boolean(showForm || editingVisit || viewingVisit || showYearReview));
  }, [showForm, editingVisit, viewingVisit, showYearReview, onBlockingUiChange]);

  const handleOpenNewVisit = () => {
    if (!owner) { onOwner(); return; }
    setVisitDraft(
      scopeFilter === VISIT_TYPES.HOME
        ? { visit_type: VISIT_TYPES.HOME, city: HOME_CITY }
        : null
    );
    setEditingVisit(null);
    setShowForm(true);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
      if (suspendKeys || showForm || editingVisit || viewingVisit || showYearReview) return;

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === 'n') {
        handleOpenNewVisit();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showForm, viewingVisit, editingVisit, showYearReview, suspendKeys, owner, scopeFilter]);

  const handleAddVisit = async (visitData) => {
    try {
      const newVisit = await createVisit(visitData);
      setVisits((prev) => [newVisit, ...prev]);
      setShowForm(false);
      setVisitDraft(null);
      showToast('Visit added.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showToast('Could not add visit.', 'error');
      throw err;
    }
  };

  const handleEditVisit = (visit) => {
    if (!owner) { onOwner(); return; }
    setEditingVisit(visit);
    setShowForm(false);
    setVisitDraft(null);
    setViewingVisit(null);
  };

  const handleUpdateVisit = async (visitData) => {
    try {
      const updatedVisit = await updateVisit(editingVisit.id, visitData);
      setVisits((prev) => prev.map((v) => (v.id === editingVisit.id ? updatedVisit : v)));
      setEditingVisit(null);
      showToast('Visit updated.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showToast('Could not update visit.', 'error');
      throw err;
    }
  };

  const handleDeleteVisit = async (id) => {
    try {
      await deleteVisit(id);
      setVisits((prev) => prev.filter((v) => v.id !== id));
      setViewingVisit((prev) => (prev?.id === id ? null : prev));
      showToast('Moved to deleted visits. Undo', 'success', {
        duration: 5000,
        onUndo: async () => {
          try {
            const restored = await restoreVisit(id);
            setVisits((prev) => [restored, ...prev]);
            showToast('Visit restored.');
          } catch {
            showToast('Could not restore visit.', 'error');
          }
        },
      });
    } catch (err) {
      showToast('Could not delete visit.', 'error');
      console.error(err);
    }
  };

  const handleLogReturnVisit = (visit) => {
    if (!owner) { onOwner(); return; }
    setVisitDraft(buildReturnVisitDraft(visit));
    setEditingVisit(null);
    setViewingVisit(null);
    setShowForm(true);
  };

  const handleModalUpdateVisit = async (id, updatedData) => {
    try {
      const updatedVisit = await updateVisit(id, updatedData);
      setVisits((prev) => prev.map((visit) => (visit.id === id ? updatedVisit : visit)));
      setViewingVisit(updatedVisit);
      showToast('Visit updated.');
    } catch (err) {
      showToast('Could not update visit.', 'error');
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
  const isReturnDraft = Boolean(visitDraft?.coffee_shop_name);

  const filteredVisits = useMemo(() => visits.filter((visit) => {
    if (scopeFilter && getVisitType(visit) !== scopeFilter) return false;
    if (sportFilter && visit.sport !== sportFilter) return false;
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

  const avgVibe = useMemo(
    () => visits.length ? (visits.reduce((sum, visit) => sum + Number(visit.vibe_rating), 0) / visits.length).toFixed(1) : '0.0',
    [visits]
  );
  const avgCoffee = useMemo(
    () => visits.length ? (visits.reduce((sum, visit) => sum + Number(visit.coffee_rating), 0) / visits.length).toFixed(1) : '0.0',
    [visits]
  );
  const avgComposite = useMemo(
    () => visits.length ? (visits.reduce((sum, visit) => sum + Number(visit.composite_score), 0) / visits.length).toFixed(1) : '0.0',
    [visits]
  );

  const topCoffeeOrders = useMemo(() => {
    const orderCounts = {};
    visits.forEach((visit) => {
      const order = titleCaseOrder(visit.coffee_order);
      if (order) orderCounts[order] = (orderCounts[order] || 0) + 1;
    });
    return Object.entries(orderCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([order, count]) => ({ order, count }));
  }, [visits]);
  const reviewSeason = useMemo(() => getAvailableSeasons(visits)[0] || getCurrentSeason(), [visits]);
  const seasonVisitCount = useMemo(() => getSeasonVisits(visits).length, [visits]);

  const headerActions = owner && !showForm && !editingVisit ? (
    <>
      <button onClick={handleOpenNewVisit} className="btn-primary hidden sm:block">Add visit</button>
      <button onClick={handleOpenNewVisit} className="header-icon-button sm:hidden" aria-label="Add visit">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </>
  ) : null;

  return (
    <AppChrome
      appMode={APP_MODES.VIBES}
      isVestDomain={isVestDomain}
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      headerActions={headerActions}
      showFooter={showFooter}
      owner={owner}
      onOwner={onOwner}
      onBrand={onBrand}
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

          <div className="journal-navigation flex items-center justify-between gap-5 mb-6 border-b border-rule">
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
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-ink-faint animate-pulse">Loading insights...</div>}>
              <InsightsPanel visits={visits} onVisitClick={setViewingVisit} onShopClick={openShop} />
            </Suspense>
          ) : viewTab === 'map' ? (
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-ink-faint animate-pulse">Loading map...</div>}>
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
                      {hasActiveFilters ? 'Matching stops' : 'All stops'}
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
                            <button onClick={() => setScopeFilter('')} className="ml-0.5 p-0.5 rounded-full hover:bg-surface-muted transition-colors" aria-label="Clear scope filter">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </span>
                        )}
                        {sportFilter && (
                          <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-surface-muted text-ink border border-rule">
                            {sportFilter}
                            <button onClick={() => setSportFilter('')} className="ml-0.5 p-0.5 rounded-full hover:bg-surface-muted transition-colors" aria-label={`Remove ${sportFilter} filter`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </span>
                        )}
                        {repeatFilter && (
                          <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-surface-muted text-ink border border-rule">
                            {repeatFilter === 'first' ? 'First-time shops' : 'Regular spots'}
                            <button onClick={() => setRepeatFilter('')} className="ml-0.5 p-0.5 rounded-full hover:bg-surface-muted transition-colors" aria-label="Clear repeat filter">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </span>
                        )}
                        {searchQuery && (
                          <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-surface-muted text-ink border border-rule">
                            "{searchQuery}"
                            <button onClick={() => setSearchQuery('')} className="ml-0.5 p-0.5 rounded-full hover:bg-surface-muted transition-colors" aria-label="Clear search">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
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
                    <div className="hidden sm:flex items-end gap-4 sm:gap-5 border-b border-rule pb-0">
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

      {showForm && (
        <FormModal active={!showOwner} title={isReturnDraft ? 'Log return visit' : 'Add visit'} onClose={handleCancelForm}>
          <AddVisitForm
            initialData={visitDraft}
            mode={isReturnDraft ? 'return' : 'add'}
            onSubmit={handleAddVisit}
            visits={visits}
          />
        </FormModal>
      )}

      {editingVisit && (
        <FormModal active={!showOwner} title="Edit visit" onClose={handleCancelForm}>
          <AddVisitForm initialData={editingVisit} mode="edit" onSubmit={handleUpdateVisit} visits={visits} />
        </FormModal>
      )}

      {showYearReview && (
        <Suspense fallback={null}>
          <YearInReview visits={visits} initialSeason={route.season} onSeasonChange={(season) => navigate({ season }, { replace: true })} onVisitClick={(visit) => navigate({ season: null, visit: String(visit.id) }, { replace: true })} onClose={() => setShowYearReview(false)} />
        </Suspense>
      )}
    </AppChrome>
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
          <span className="text-xs sm:text-sm text-ink-soft font-medium">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function VisitNotFound({ onBack }) {
  return <section><h2 className="type-title">Visit not found</h2><p className="type-meta my-4">This visit is no longer published. You can keep browsing the journal.</p><button className="btn-primary" onClick={onBack}>Back</button></section>;
}
