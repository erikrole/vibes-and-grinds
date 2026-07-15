import { useCallback, useState, useEffect, memo, useRef } from 'react';
import { toIsoDate } from '../utils/vestTrackerMath';
import useFocusTrap from '../hooks/useFocusTrap';

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const panelRef = useRef(null);
  const closeRef = useRef(null);

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

  const handleCancel = useCallback(() => {
    setFormState(EMPTY_FORM);
    setAddingOutfit(false);
    setConfirmDelete(false);
    setOpen(false);
    onCancel?.();
  }, [onCancel]);

  useFocusTrap(panelRef, { onEscape: handleCancel, enabled: open || Boolean(editingGame), initialFocusRef: closeRef });

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

    reset();
    setOpen(false);
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
    <div className="dialog-shell vest-tracker" role="dialog" aria-modal="true" aria-labelledby="vest-game-form-title">
      <button className="dialog-backdrop" onClick={handleCancel} aria-label="Close game form" />
      <div className="dialog-positioner">
      <section ref={panelRef} className="dialog-panel max-w-3xl overflow-y-auto vt-detail-panel">
      <div className="vt-section-head sticky top-0 z-10 bg-[color:var(--vt-card)]">
        <span id="vest-game-form-title" className="vt-label vt-label-red">{editingGame ? 'Edit Game' : 'Add Game'}</span>
        <button ref={closeRef} type="button" onClick={handleCancel} className="vt-label hover:text-[color:var(--vt-ink)] transition-colors">Close</button>
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
                    e.stopPropagation();
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
              onClick={() => setConfirmDelete(true)}
              className="vt-btn-ghost text-xs"
              style={{ color: 'var(--vt-red)', borderColor: 'var(--vt-rule-strong)' }}
            >
              Delete
            </button>
          )}
        </div>
        {confirmDelete && (
          <div role="alertdialog" aria-labelledby="vest-delete-title" className="mt-4 border border-[color:var(--vt-red)] bg-[color:var(--vt-red-soft)] p-4 rounded">
            <p id="vest-delete-title" className="vt-condensed text-lg uppercase">Delete game against {editingGame.opponent}?</p>
            <p className="vt-mono text-xs text-[color:var(--vt-ink-mute)] mt-1">This permanently removes the game from Vest Tracker.</p>
            <div className="flex gap-2 mt-4">
              <button type="button" className="vt-btn-primary" onClick={() => { onDelete(editingGame.id); handleCancel(); }}>Delete Game</button>
              <button type="button" className="vt-btn-ghost" onClick={() => setConfirmDelete(false)}>Keep Game</button>
            </div>
          </div>
        )}
      </form>
      </section>
      </div>
    </div>
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
