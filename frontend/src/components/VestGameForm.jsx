import { useState, useEffect, memo } from 'react';
import { toIsoDate } from '../utils/vestTrackerMath';

const EMPTY_FORM = {
  date: '',
  location: 'vs',
  opponent: '',
  ranking: '',
  outfit: '',
  result: 'W',
  overtime: false,
};

// Clean add/edit form. Collapsed to a single CTA by default; expands inline.
function VestGameForm({ editingGame, existingOutfits, onSave, onDelete, onCancel }) {
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [addingOutfit, setAddingOutfit] = useState(false);

  // Hydrate from editing target whenever it changes.
  useEffect(() => {
    if (editingGame) {
      setOpen(true);
      setAddingOutfit(false);
      setFormState({
        date: editingGame.date || '',
        location: editingGame.location || 'vs',
        opponent: editingGame.opponent || '',
        ranking: editingGame.ranking ? String(editingGame.ranking) : '',
        outfit: editingGame.outfit || '',
        result: editingGame.result || 'W',
        overtime: Boolean(editingGame.overtime),
      });
    }
  }, [editingGame]);

  const reset = () => {
    setFormState(EMPTY_FORM);
    setAddingOutfit(false);
  };

  const handleCancel = () => {
    reset();
    setOpen(false);
    onCancel?.();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const opponent = formState.opponent.trim();
    const outfit = formState.outfit.trim();
    const ranking = formState.ranking.trim();
    if (!opponent) return;

    onSave({
      date: toIsoDate(formState.date),
      location: formState.location,
      opponent,
      ranking: ranking ? parseInt(ranking, 10) : null,
      outfit,
      result: formState.result,
      overtime: Boolean(formState.overtime),
    });

    if (!editingGame) {
      setFormState((prev) => ({ ...EMPTY_FORM, result: prev.result, location: prev.location }));
      setAddingOutfit(false);
    } else {
      reset();
      setOpen(false);
    }
  };

  // Collapsed pill — invites a click but stays out of the way.
  if (!open && !editingGame) {
    return (
      <section className="mb-6">
        <button
          onClick={() => setOpen(true)}
          className="w-full bg-white dark:bg-stone-800 border border-dashed border-stone-300 dark:border-stone-600 rounded-2xl p-4 text-sm font-semibold text-stone-600 dark:text-stone-300 hover:border-red-400 dark:hover:border-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors"
        >
          + Add Game
        </button>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
          {editingGame ? 'Edit Game' : 'Add Game'}
        </h3>
        <button
          onClick={handleCancel}
          className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Date">
            <input
              type="date"
              value={formState.date}
              onChange={(e) => setFormState((p) => ({ ...p, date: e.target.value }))}
              className={inputCls}
            />
          </Field>

          <Field label="Location">
            <select
              value={formState.location}
              onChange={(e) => setFormState((p) => ({ ...p, location: e.target.value }))}
              className={`${inputCls} cursor-pointer`}
            >
              <option value="vs">Home (vs)</option>
              <option value="@">Away (@)</option>
              <option value="N">Neutral (N)</option>
            </select>
          </Field>

          <Field label="Opponent">
            <input
              value={formState.opponent}
              onChange={(e) => setFormState((p) => ({ ...p, opponent: e.target.value }))}
              className={inputCls}
              placeholder="e.g. Indiana"
              required
            />
          </Field>

          <Field label="AP Rank">
            <input
              type="number"
              min="1"
              max="25"
              value={formState.ranking}
              onChange={(e) => setFormState((p) => ({ ...p, ranking: e.target.value }))}
              className={inputCls}
              placeholder="#"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Outfit" className="sm:col-span-2">
            {addingOutfit ? (
              <input
                autoFocus
                value={formState.outfit}
                onChange={(e) => setFormState((p) => ({ ...p, outfit: e.target.value }))}
                className={inputCls}
                placeholder="e.g. Red Vest"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setAddingOutfit(false);
                    setFormState((p) => ({ ...p, outfit: '' }));
                  }
                }}
              />
            ) : (
              <select
                value={formState.outfit}
                onChange={(e) => {
                  if (e.target.value === '__add__') {
                    setAddingOutfit(true);
                    setFormState((p) => ({ ...p, outfit: '' }));
                  } else {
                    setFormState((p) => ({ ...p, outfit: e.target.value }));
                  }
                }}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="">Select outfit</option>
                {existingOutfits.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
                <option value="__add__">+ New outfit</option>
              </select>
            )}
          </Field>

          <Field label="Result">
            <select
              value={formState.result}
              onChange={(e) => setFormState((p) => ({ ...p, result: e.target.value }))}
              className={`${inputCls} cursor-pointer`}
            >
              <option value="W">Win</option>
              <option value="L">Loss</option>
              <option value="">Upcoming</option>
            </select>
          </Field>

          <label className="flex items-end">
            <div className="flex items-center gap-2.5 w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.overtime}
                onChange={(e) => setFormState((p) => ({ ...p, overtime: e.target.checked }))}
                className="rounded border-stone-300 dark:border-stone-600"
              />
              <span className="text-sm text-stone-700 dark:text-stone-200">OT</span>
            </div>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="submit" className="btn-primary text-sm px-6 py-2.5">
            {editingGame ? 'Save Changes' : 'Add Game'}
          </button>
          {editingGame && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete this game vs ${editingGame.opponent}?`)) {
                  onDelete(editingGame.id);
                  reset();
                  setOpen(false);
                }
              }}
              className="text-sm px-4 py-2.5 rounded-xl text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

const inputCls =
  'mt-1 w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-400 dark:focus:ring-red-500 transition-colors';

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] uppercase tracking-[0.1em] text-stone-400 dark:text-stone-500 font-bold">
        {label}
      </span>
      {children}
    </label>
  );
}

export default memo(VestGameForm);
