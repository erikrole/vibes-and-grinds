import { useState } from 'react';
import { EMPTY_FORM, toIsoDate } from '../../utils/vestStats';

/**
 * Add / edit form for a single game. The parent owns the canonical games
 * array; this component owns the form draft. When `editingGame` changes,
 * the parent should `key={...}` this component to re-mount with fresh
 * state, or the form will reset on submit only.
 */
export default function GameForm({ editingGame, existingOutfits, onSubmit, onCancel }) {
  const [formState, setFormState] = useState(() =>
    editingGame
      ? {
          date: editingGame.date || '',
          location: editingGame.location || 'vs',
          opponent: editingGame.opponent,
          ranking: editingGame.ranking || '',
          outfit: editingGame.outfit || '',
          result: editingGame.result || 'W',
          overtime: Boolean(editingGame.overtime),
        }
      : EMPTY_FORM
  );
  const [addingOutfit, setAddingOutfit] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    const opponent = formState.opponent.trim();
    if (!opponent) return;

    const ranking = String(formState.ranking).trim();
    const payload = {
      date: toIsoDate(formState.date),
      location: formState.location,
      opponent,
      ranking: ranking ? parseInt(ranking, 10) : null,
      outfit: formState.outfit.trim(),
      result: formState.result,
      overtime: Boolean(formState.overtime),
    };

    onSubmit(payload);

    if (!editingGame) {
      setFormState({ ...EMPTY_FORM, result: 'W', location: 'vs' });
      setAddingOutfit(false);
    }
  };

  const update = (patch) => setFormState((prev) => ({ ...prev, ...patch }));

  return (
    <section className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
          {editingGame ? 'Edit Game' : 'Add Game'}
        </h3>
        {editingGame && (
          <button
            onClick={onCancel}
            className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Date">
            <input
              type="date"
              value={formState.date}
              onChange={(e) => update({ date: e.target.value })}
              className={inputClass}
            />
          </Field>

          <Field label="Location">
            <select
              value={formState.location}
              onChange={(e) => update({ location: e.target.value })}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="vs">Home (vs)</option>
              <option value="@">Away (@)</option>
              <option value="N">Neutral (N)</option>
            </select>
          </Field>

          <Field label="Opponent">
            <input
              value={formState.opponent}
              onChange={(e) => update({ opponent: e.target.value })}
              className={inputClass}
              placeholder="e.g. Indiana"
            />
          </Field>

          <Field label="Rank">
            <input
              type="number"
              min="1"
              max="25"
              value={formState.ranking}
              onChange={(e) => update({ ranking: e.target.value })}
              className={inputClass}
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
                onChange={(e) => update({ outfit: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setAddingOutfit(false);
                    update({ outfit: '' });
                  }
                }}
                className={inputClass}
                placeholder="e.g. Red Vest"
              />
            ) : (
              <select
                value={formState.outfit}
                onChange={(e) => {
                  if (e.target.value === '__add__') {
                    setAddingOutfit(true);
                    update({ outfit: '' });
                  } else {
                    update({ outfit: e.target.value });
                  }
                }}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">Select outfit</option>
                {existingOutfits.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
                <option value="__add__">+ New Outfit</option>
              </select>
            )}
          </Field>

          <Field label="Result">
            <select
              value={formState.result}
              onChange={(e) => update({ result: e.target.value })}
              className={`${inputClass} cursor-pointer`}
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
                onChange={(e) => update({ overtime: e.target.checked })}
                className="rounded border-stone-300 dark:border-stone-600"
              />
              <span className="text-sm text-stone-700 dark:text-stone-200">OT</span>
            </div>
          </label>
        </div>

        <button type="submit" className="w-full sm:w-auto btn-primary text-sm px-6 py-2.5 mt-1">
          {editingGame ? 'Save Changes' : 'Add Game'}
        </button>
      </form>
    </section>
  );
}

const inputClass =
  'mt-1 w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400 dark:focus:ring-stone-500 transition-colors';

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500 font-semibold">
        {label}
      </span>
      {children}
    </label>
  );
}
