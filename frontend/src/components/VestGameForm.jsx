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

// Add/edit form. Collapses to a dashed-rule CTA until expanded.
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
      <section className="mb-6">
        <button
          onClick={() => setOpen(true)}
          className="w-full border border-dashed border-[color:var(--vt-rule-strong)] rounded py-3.5 px-5 hover:border-[color:var(--vt-red)] hover:bg-[color:var(--vt-red-soft)] transition-colors group"
        >
          <span className="vt-condensed text-sm tracking-[0.18em] uppercase text-[color:var(--vt-ink-mute)] group-hover:text-[color:var(--vt-red)]">
            + Add Game
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className="vt-card mb-6 overflow-hidden">
      <div className="vt-section-head">
        <span className="vt-label">{editingGame ? 'Edit Game' : 'Add Game'}</span>
        <button
          onClick={handleCancel}
          className="vt-condensed text-xs tracking-[0.16em] uppercase text-[color:var(--vt-ink-mute)] hover:text-[color:var(--vt-ink)] transition-colors"
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
              className="text-sm"
            />
          </Field>

          <Field label="Location">
            <select
              value={formState.location}
              onChange={(e) => setFormState((p) => ({ ...p, location: e.target.value }))}
              className="text-sm cursor-pointer"
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
              className="text-sm"
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
              className="text-sm"
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
                className="text-sm"
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
                className="text-sm cursor-pointer"
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
              className="text-sm cursor-pointer"
            >
              <option value="W">Win</option>
              <option value="L">Loss</option>
              <option value="">Upcoming</option>
            </select>
          </Field>

          <label className="flex items-end">
            <div className="flex items-center gap-2.5 w-full vt-card-inset px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formState.overtime}
                onChange={(e) => setFormState((p) => ({ ...p, overtime: e.target.checked }))}
                className="accent-[color:var(--vt-red)]"
              />
              <span className="vt-condensed text-sm tracking-[0.12em] uppercase text-[color:var(--vt-ink-dim)]">
                Overtime
              </span>
            </div>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button type="submit" className="vt-btn-primary text-sm">
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
              className="vt-btn-ghost text-xs"
              style={{ color: 'var(--vt-red)', borderColor: 'var(--vt-rule-strong)' }}
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="vt-label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default memo(VestGameForm);
