import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchVisits, createVisit, updateVisit, deleteVisit } from '../utils/api';
import { buildReturnVisitDraft } from '../utils/repeats';
import { HOME_CITY, VISIT_TYPES } from '../utils/visitTypes';

export default function useVisitJournal(showToast, scopeFilter) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [visitDraft, setVisitDraft] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null);
  const [viewingVisit, setViewingVisit] = useState(null);
  const prevBadgesRef = useRef(null);

  const loadVisits = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  // Badge unlock notifications. Loaded on demand so insights stay out of the entry.
  useEffect(() => {
    if (!visits.length) return undefined;
    let cancelled = false;

    import('../utils/badges').then(({ computeBadges, detectNewBadges }) => {
      if (cancelled) return;
      const newBadges = computeBadges(visits);
      if (prevBadgesRef.current) {
        detectNewBadges(prevBadgesRef.current, newBadges).forEach((badge) => {
          showToast(`${badge.icon} Badge: ${badge.name} (${badge.tier})`);
        });
      }
      prevBadgesRef.current = newBadges;
    }).catch((err) => console.error(err));

    return () => {
      cancelled = true;
    };
  }, [visits, showToast]);

  const handleAddVisit = useCallback(async (visitData) => {
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
  }, [showToast]);

  const handleEditVisit = useCallback((visit) => {
    setEditingVisit(visit);
    setShowForm(false);
    setVisitDraft(null);
    setViewingVisit(null);
  }, []);

  const handleUpdateVisit = useCallback(async (visitData) => {
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
  }, [editingVisit, showToast]);

  const handleDeleteVisit = useCallback(async (id) => {
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
  }, [visits, showToast]);

  const handleOpenNewVisit = useCallback(() => {
    // While browsing the Madison list, start new visits on that side of the toggle.
    setVisitDraft(
      scopeFilter === VISIT_TYPES.HOME
        ? { visit_type: VISIT_TYPES.HOME, city: HOME_CITY }
        : null
    );
    setEditingVisit(null);
    setShowForm(true);
  }, [scopeFilter]);

  const handleLogReturnVisit = useCallback((visit) => {
    setVisitDraft(buildReturnVisitDraft(visit));
    setEditingVisit(null);
    setViewingVisit(null);
    setShowForm(true);
  }, []);

  const handleModalUpdateVisit = useCallback(async (id, updatedData) => {
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
  }, [showToast]);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setVisitDraft(null);
    setEditingVisit(null);
  }, []);

  // A draft with a shop already filled in came from "Log Return Visit"; a bare
  // draft only carries scope defaults for a brand-new stop.
  const isReturnDraft = Boolean(visitDraft?.coffee_shop_name);

  return {
    visits,
    loading,
    error,
    loadVisits,
    showForm,
    visitDraft,
    editingVisit,
    viewingVisit,
    setViewingVisit,
    isReturnDraft,
    handleAddVisit,
    handleEditVisit,
    handleUpdateVisit,
    handleDeleteVisit,
    handleOpenNewVisit,
    handleLogReturnVisit,
    handleModalUpdateVisit,
    handleCancelForm,
  };
}
