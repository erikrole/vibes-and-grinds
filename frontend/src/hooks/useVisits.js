import { useCallback, useEffect, useState } from 'react';
import {
  createVisit,
  deleteVisit as apiDeleteVisit,
  fetchVisits,
  updateVisit as apiUpdateVisit,
} from '../utils/api';
import { getTodayDateString } from '../utils/dates';

/**
 * Owns the visits collection plus all CRUD calls. Returns the array, a
 * loading flag, the most recent error, and a `mutations` bag with the
 * operations the UI needs.
 *
 * Toast feedback is delegated to a `toast` argument: `{ show(msg, type, opts) }`.
 * The hook calls `toast.show(...)` for success, error, and undo cases, but
 * doesn't render anything itself.
 */
export default function useVisits(toast) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(async (visitData) => {
    try {
      setError(null);
      const created = await createVisit(visitData);
      setVisits((prev) => [created, ...prev]);
      toast?.show('Visit added.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return created;
    } catch (err) {
      setError('Failed to add visit. Please try again.');
      toast?.show('Could not add visit.', 'error');
      console.error(err);
      throw err;
    }
  }, [toast]);

  const update = useCallback(async (id, visitData) => {
    try {
      setError(null);
      const updated = await apiUpdateVisit(id, visitData);
      setVisits((prev) => prev.map((v) => (v.id === id ? updated : v)));
      toast?.show('Visit updated.');
      return updated;
    } catch (err) {
      setError('Failed to update visit. Please try again.');
      toast?.show('Could not update visit.', 'error');
      console.error(err);
      throw err;
    }
  }, [toast]);

  const remove = useCallback(async (id) => {
    const deleted = visits.find((v) => v.id === id);
    try {
      setError(null);
      await apiDeleteVisit(id);
      setVisits((prev) => prev.filter((v) => v.id !== id));
      toast?.show('Visit deleted. Click to undo.', 'success', {
        duration: 5000,
        onUndo: async () => {
          try {
            const restored = await createVisit(deleted);
            setVisits((prev) => [restored, ...prev]);
            toast?.show('Visit restored.');
          } catch {
            toast?.show('Could not restore visit.', 'error');
          }
        },
      });
    } catch (err) {
      setError('Failed to delete visit. Please try again.');
      toast?.show('Could not delete visit.', 'error');
      console.error(err);
      throw err;
    }
  }, [visits, toast]);

  const duplicate = useCallback(async (visit) => {
    const payload = {
      ...visit,
      id: undefined,
      date: getTodayDateString(),
      notes: visit.notes ? `${visit.notes} (dup)` : '',
    };
    try {
      setError(null);
      const duplicated = await createVisit(payload);
      setVisits((prev) => [duplicated, ...prev]);
      return duplicated;
    } catch (err) {
      setError('Failed to duplicate visit. Please try again.');
      toast?.show('Could not duplicate visit.', 'error');
      console.error(err);
      throw err;
    }
  }, [toast]);

  return {
    visits,
    loading,
    error,
    setError,
    reload: load,
    add,
    update,
    remove,
    duplicate,
  };
}
