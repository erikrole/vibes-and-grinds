import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import AddVisitForm from '../components/AddVisitForm';
import FormModal from '../components/FormModal';
import CoffeeJournalHero from '../components/CoffeeJournalHero';
import ShopHistory from '../components/ShopHistory';
import VisitFiltersToolbar from '../components/VisitFiltersToolbar';
import VisitList from '../components/VisitList';
import { APP_MODES, isVestHostname } from '../constants/appModes';
import { mergeStoredFilters, searchFromFilters } from '../utils/journalFilters';
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
  const showYearReview = Boolean(route.season);
  const setShowYearReview = (open) => open ? navigate({ season: reviewSeason }, { layer: true }) : closeLayer('season');
  const searchRef = useRef(null);
  const VIEW_PREFS_KEY = 'vibes-and-grinds:view-preferences';

  const [viewPrefs, setViewPrefs] = useState(() => {
    const defaults = {
      sortBy: 'date',
      sortAsc: false,
      searchQuery: '',
      sportFilter: '',
      repeatFilter: '',
      scopeFilter: '',
      appMode: isVestHostname() ? APP_MODES.VEST : APP_MODES.VIBES,
    };
    try {
      const raw = localStorage.getItem(VIEW_PREFS_KEY);
      const stored = raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
      return mergeStoredFilters(stored, window.location.search);
    } catch {
      return mergeStoredFilters(defaults, window.location.search);
    }
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

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify(viewPrefs));
    } catch {
      // Storage full or unavailable.
    }
    const nextSearch = searchFromFilters({
      searchQuery,
      sortBy,
      sortAsc,
      scopeFilter,
      sportFilter,
      repeatFilter,
    }, window.location.search);
    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) window.history.replaceState(window.history.state, '', nextUrl);
  }, [viewPrefs, searchQuery, sortBy, sortAsc, scopeFilter, sportFilter, repeatFilter]);

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

  const hero = (count, vibe, coffee, overall, allowAdd) => (
    <CoffeeJournalHero
      visitCount={count}
      avgVibe={vibe}
      avgCoffee={coffee}
      avgComposite={overall}
      onAddVisit={handleOpenNewVisit}
      showAddVisit={allowAdd && owner && !showForm && !editingVisit}
      onBrand={onBrand}
    />
  );

  return (
    <AppChrome
      appMode={APP_MODES.VIBES}
      isVestDomain={isVestDomain}
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      showFooter={showFooter}
      showBrand={false}
      owner={owner}
      onOwner={onOwner}
      onBrand={onBrand}
    >
      {loading ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 sm:pt-2 pb-8" aria-busy="true">
          {hero(0, '—', '—', '—', false)}
          <div className="flex items-center justify-center py-16 text-ink-faint animate-pulse">Loading visits…</div>
        </main>
      ) : error ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 sm:pt-2 pb-8">
          {hero(0, '—', '—', '—', false)}
          <section className="recovery-panel max-w-2xl" role="alert">
            <p className="eyebrow mb-3">Connection problem</p>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3">Couldn’t load the coffee journal</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>{error}</p>
            <button type="button" onClick={loadVisits} className="btn-primary">Try again</button>
          </section>
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 sm:pt-2 pb-8">
          {hero(visits.length, avgVibe, avgCoffee, avgComposite, true)}

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
              <VisitFiltersToolbar
                searchRef={searchRef}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                sortBy={sortBy}
                sortAsc={sortAsc}
                setSortBy={setSortBy}
                sportFilter={sportFilter}
                setSportFilter={setSportFilter}
                repeatFilter={repeatFilter}
                setRepeatFilter={setRepeatFilter}
                scopeFilter={scopeFilter}
                setScopeFilter={setScopeFilter}
                resultCount={sortedVisits.length}
                totalCount={visits.length}
              />

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

function VisitNotFound({ onBack }) {
  return <section><h2 className="type-title">Visit not found</h2><p className="type-meta my-4">This visit is no longer published. You can keep browsing the journal.</p><button className="btn-primary" onClick={onBack}>Back</button></section>;
}
