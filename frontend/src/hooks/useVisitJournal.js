import { useEffect, useRef, useState } from 'react';
import { fetchVisits, createVisit, updateVisit, deleteVisit } from '../utils/api';
import { computeBadges, detectNewBadges } from '../utils/badges';
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

  useEffect(() => {
    loadVisits();
  }, []);

  // Badge unlock notifications
  useEffect(() => {
    if (!visits.length) return;
    const newBadges = computeBadges(visits);
    if (prevBadgesRef.current) {
      const unlocked = detectNewBadges(prevBadgesRef.current, newBadges);
      unlocked.forEach(b => {
        showToast(`${b.icon} Badge: ${b.name} (${b.tier})`);
      });
    }
    prevBadgesRef.current = newBadges;
  }, [visits]); // eslint-disable-line react-hooks/exhaustive-deps

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
