import { lazy, Suspense, useRef, useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import AppHeader from './components/AppHeader';
import AppFooter from './components/AppFooter';
import AppToast from './components/AppToast';
import VibesJournal from './components/VibesJournal';
import { APP_MODES } from './appMode';
import useDarkMode from './hooks/useDarkMode';
import useToast from './hooks/useToast';
import useViewPreferences from './hooks/useViewPreferences';
import useVisitJournal from './hooks/useVisitJournal';
import useJournalDerived from './hooks/useJournalDerived';
import useJournalShortcuts from './hooks/useJournalShortcuts';

const AddVisitForm = lazy(() => import('./components/AddVisitForm'));
const FormModal = lazy(() => import('./components/FormModal'));
const KeyboardShortcutsModal = lazy(() => import('./components/KeyboardShortcutsModal'));
const VisitDetailModal = lazy(() => import('./components/VisitDetailModal'));
const VestTrackerDashboard = lazy(() => import('./components/VestTrackerDashboard'));
const YearInReview = lazy(() => import('./components/YearInReview'));

export default function App() {
  const [darkMode, toggleDarkMode] = useDarkMode();
  const toastBag = useToast();
  const prefs = useViewPreferences();
  const journal = useVisitJournal(toastBag.show, prefs.scopeFilter);
  const derived = useJournalDerived(journal.visits, prefs);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showYearReview, setShowYearReview] = useState(false);
  const searchRef = useRef(null);

  useJournalShortcuts({
    appMode: prefs.appMode,
    showForm: journal.showForm,
    viewingVisit: journal.viewingVisit,
    editingVisit: journal.editingVisit,
    toggleDarkMode,
    searchRef,
    setAppMode: prefs.setAppMode,
    setShowShortcuts,
    openNewVisit: journal.handleOpenNewVisit,
  });

  return (
    <ErrorBoundary>
    <div className={`min-h-screen transition-colors duration-200 ${prefs.appMode === APP_MODES.VEST ? 'vest-tracker-page' : ''}`}>
        <a className="skip-link" href="#app-main">Skip to content</a>
        <AppHeader
          appMode={prefs.appMode}
          setAppMode={prefs.setAppMode}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          showAddVisit={prefs.appMode === APP_MODES.VIBES && !journal.showForm && !journal.editingVisit}
          onAddVisit={journal.handleOpenNewVisit}
        />

        <div id="app-main" tabIndex={-1} className="skip-target">
        {prefs.appMode === APP_MODES.VEST ? (
          <Suspense fallback={<div className="flex items-center justify-center py-20 text-stone-400 animate-pulse">Loading...</div>}>
            <VestTrackerDashboard showToast={toastBag.show} />
          </Suspense>
        ) : journal.loading ? (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" aria-busy="true">
            <div className="flex items-center justify-center py-20 text-stone-400 dark:text-stone-500 animate-pulse">Loading visits…</div>
          </main>
        ) : journal.error ? (
          <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
            <section className="recovery-panel" role="alert">
              <p className="eyebrow mb-3">Connection problem</p>
              <h2 className="text-2xl sm:text-3xl font-semibold mb-3">Couldn’t load the coffee journal</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--ink-soft)' }}>{journal.error}</p>
              <button type="button" onClick={journal.loadVisits} className="btn-primary">Try again</button>
            </section>
          </main>
        ) : (
        <VibesJournal
          visits={journal.visits}
          sortedVisits={derived.sortedVisits}
          loading={journal.loading}
          avgVibe={derived.avgVibe}
          avgCoffee={derived.avgCoffee}
          avgComposite={derived.avgComposite}
          viewTab={prefs.viewTab}
          setViewTab={prefs.setViewTab}
          seasonVisitCount={derived.seasonVisitCount}
          reviewSeason={derived.reviewSeason}
          onOpenSeason={() => setShowYearReview(true)}
          searchRef={searchRef}
          searchQuery={prefs.searchQuery}
          setSearchQuery={prefs.setSearchQuery}
          hasActiveFilters={derived.hasActiveFilters}
          sportFilter={prefs.sportFilter}
          setSportFilter={prefs.setSportFilter}
          repeatFilter={prefs.repeatFilter}
          setRepeatFilter={prefs.setRepeatFilter}
          scopeFilter={prefs.scopeFilter}
          setScopeFilter={prefs.setScopeFilter}
          sortBy={prefs.sortBy}
          setSortBy={prefs.setSortBy}
          sortAsc={prefs.sortAsc}
          showMobileFilters={showMobileFilters}
          setShowMobileFilters={setShowMobileFilters}
          onEdit={journal.handleEditVisit}
          onDelete={journal.handleDeleteVisit}
          onViewDetails={journal.setViewingVisit}
          onAddVisit={journal.handleOpenNewVisit}
          onLogReturnVisit={journal.handleLogReturnVisit}
          shopVisitCounts={derived.shopVisitCounts}
          topCoffeeOrders={derived.topCoffeeOrders}
        />
        )}
        </div>

        {!journal.loading && !journal.error && (
          <AppFooter appMode={prefs.appMode} />
        )}

        {journal.viewingVisit && (
          <Suspense fallback={null}>
          <VisitDetailModal
            visit={journal.viewingVisit}
            visits={derived.sortedVisits}
            onClose={() => journal.setViewingVisit(null)}
            onNavigate={journal.setViewingVisit}
            onUpdate={journal.handleModalUpdateVisit}
            onEdit={journal.handleEditVisit}
            onDelete={journal.handleDeleteVisit}
            onLogReturnVisit={journal.handleLogReturnVisit}
          />
          </Suspense>
        )}

        {prefs.appMode === APP_MODES.VIBES && journal.showForm && (
          <Suspense fallback={null}>
            <FormModal title={journal.isReturnDraft ? 'Log Return Visit' : 'Add Visit'} onClose={journal.handleCancelForm}>
              <AddVisitForm
                initialData={journal.visitDraft}
                mode={journal.isReturnDraft ? 'return' : 'add'}
                onSubmit={journal.handleAddVisit}
                visits={journal.visits}
              />
            </FormModal>
          </Suspense>
        )}

        {prefs.appMode === APP_MODES.VIBES && journal.editingVisit && (
          <Suspense fallback={null}>
            <FormModal title="Edit Visit" onClose={journal.handleCancelForm}>
              <AddVisitForm initialData={journal.editingVisit} mode="edit" onSubmit={journal.handleUpdateVisit} visits={journal.visits} />
            </FormModal>
          </Suspense>
        )}

        <AppToast toast={toastBag.toast} exiting={toastBag.exiting} dismiss={toastBag.dismiss} />

        {showShortcuts && (
          <Suspense fallback={null}>
            <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
          </Suspense>
        )}

        {showYearReview && (
          <Suspense fallback={null}>
            <YearInReview visits={journal.visits} onClose={() => setShowYearReview(false)} />
          </Suspense>
        )}

      </div>
    </ErrorBoundary>
  );
}
