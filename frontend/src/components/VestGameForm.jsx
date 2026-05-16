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

// Add/edit form styled as a retro broadcast operator console.
// Collapsed to a single neon CTA by default; expands inline.
function VestGameForm({ editingGame, existingOutfits, onSave, onDelete, onCancel }) {
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [addingOutfit, setAddingOutfit] = useState(false);

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
    if (!opponent) return;

    onSave({
      date: toIsoDate(formState.date),
      location: formState.location,
      opponent,
      ranking: formState.ranking.trim() ? parseInt(formState.ranking, 10) : null,
      outfit: formState.outfit.trim(),
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

  if (!open && !editingGame) {
    return (
      <section className="vt-reveal vt-reveal-5 mb-6">
        <button
          onClick={() => setOpen(true)}
          className="group w-full rounded-lg border border-dashed py-4 px-5 transition-all text-center hover:bg-[rgba(255,23,76,0.04)]"
          style={{
            borderColor: 'var(--vt-rule)',
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          <span className="vt-anton text-base sm:text-lg tracking-[0.18em] text-[color:var(--vt-ink-dim)] group-hover:text-[color:var(--vt-crimson)] transition-colors">
            ✦ Log a Game ✦
          </span>
          <span className="block vt-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--vt-ink-faint)] mt-1">
            Add a new card to the deck
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className="vt-reveal vt-card mb-6 overflow-hidden">
      <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-[color:var(--vt-rule)] bg-[rgba(0,0,0,0.35)]">
        <h3 className="vt-anton text-lg sm:text-xl text-[color:var(--vt-ink)] tracking-[0.06em]">
          {editingGame ? '⌗ Edit Game' : '⌗ Log Game'}
        </h3>
        <button
          onClick={handleCancel}
          className="vt-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--vt-ink-faint)] hover:text-[color:var(--vt-crimson)] transition-colors"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-3">
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
              <option value="vs">Home · vs</option>
              <option value="@">Away · @</option>
              <option value="N">Neutral · N</option>
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
            <div className="flex items-center gap-2.5 w-full rounded-md border border-[color:var(--vt-rule)] bg-[rgba(0,0,0,0.4)] px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.overtime}
                onChange={(e) => setFormState((p) => ({ ...p, overtime: e.target.checked }))}
                className="accent-[color:var(--vt-crimson)]"
              />
              <span className="vt-mono text-xs text-[color:var(--vt-ink)] tracking-wider uppercase">
                Overtime
              </span>
            </div>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            type="submit"
            className="vt-anton text-sm tracking-[0.16em] uppercase px-6 py-2.5 rounded-md bg-[color:var(--vt-crimson)] text-white shadow-[0_0_28px_-6px_var(--vt-crimson-glow)] hover:translate-y-[-1px] active:translate-y-0 transition-transform"
          >
            {editingGame ? '◆ Save Changes' : '◆ Add Game'}
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
              className="vt-mono text-xs tracking-[0.16em] uppercase px-4 py-2.5 rounded-md text-[color:var(--vt-crimson)] border border-[color:var(--vt-rule)] hover:bg-[rgba(255,23,76,0.08)] transition-colors"
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
  'mt-1 w-full rounded-md border px-3 py-2.5 text-sm vt-mono focus:outline-none focus:ring-1 focus:ring-[color:var(--vt-crimson)] transition-colors';

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="vt-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--vt-cyan)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export default memo(VestGameForm);
