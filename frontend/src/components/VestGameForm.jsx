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
function VestGameForm({ enabled = true, editingGame, existingOutfits, onSave, onDelete, onCancel }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
    if (saving) return;
    setFormState(EMPTY_FORM);
    setAddingOutfit(false);
    setConfirmDelete(false);
    setOpen(false);
    onCancel?.();
  }, [onCancel, saving]);

  useFocusTrap(panelRef, { onEscape: handleCancel, enabled: enabled && (open || Boolean(editingGame)), initialFocusRef: closeRef });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const opponent = formState.opponent.trim();
    if (!opponent) return;

    setSaving(true); setError('');
    try { await onSave({
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
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  if (!open && !editingGame) {
    if (!enabled) return null;
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
        {error && <p role="alert">{error}</p>}
        <fieldset disabled={saving || !enabled} className="space-y-3">
        <Field label="Opponent">
          <input
            value={formState.opponent}
            onChange={(e) => setFormState((p) => ({ ...p, opponent: e.target.value }))}
            className="text-base"
            placeholder="e.g. Indiana"
            required
          />
        </Field>

        <div className="vgf-row">
          <Segmented
            label="Location"
            value={formState.location}
            onChange={(location) => setFormState((p) => ({ ...p, location }))}
            options={[{ value: 'vs', label: 'Home' }, { value: '@', label: 'Away' }, { value: 'N', label: 'Neutral' }]}
          />
          <Segmented
            label="Result"
            value={formState.result}
            onChange={(result) => setFormState((p) => ({ ...p, result }))}
            options={[{ value: 'W', label: 'Win' }, { value: 'L', label: 'Loss' }, { value: '', label: 'Upcoming' }]}
          />
        </div>

        <div className="vgf-row vgf-row-3">
          <Field label="Date">
            <input
              type="date"
              value={formState.date}
              onChange={(e) => setFormState((p) => ({ ...p, date: e.target.value }))}
              className="text-sm"
            />
          </Field>

          <Field label="AP rank">
            <input
              type="number"
              min="1"
              max="25"
              value={formState.ranking}
              onChange={(e) => setFormState((p) => ({ ...p, ranking: e.target.value }))}
              className="text-sm"
              placeholder="Unranked"
            />
          </Field>

          <label className="vgf-toggle">
            <input
              type="checkbox"
              checked={formState.overtime}
              onChange={(e) => setFormState((p) => ({ ...p, overtime: e.target.checked }))}
              className="accent-[color:var(--vt-red)]"
            />
            <span>Overtime</span>
          </label>
        </div>

        <Field label="Outfit">
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
            <p className="vt-mono text-xs text-[color:var(--vt-ink-mute)] mt-1">The previous game list is saved in owner tools and can be restored.</p>
            <div className="flex gap-2 mt-4">
              <button type="button" className="vt-btn-primary" onClick={async () => { setSaving(true); setError('');
                      try { await onDelete(editingGame.id); reset(); setOpen(false); }
                      catch (err) { setError(err.message); } finally { setSaving(false); } }}>Delete game</button>
              <button type="button" className="vt-btn-ghost" onClick={() => setConfirmDelete(false)}>Keep Game</button>
            </div>
          </div>
        )}
        </fieldset>
      </form>
      </section>
      </div>
    </div>
  );
}

function Segmented({ label, value, onChange, options }) {
  return (
    <div className="vgf-field">
      <span className="vt-label" id={`vgf-${label}`}>{label}</span>
      <div className="vgf-seg" role="group" aria-labelledby={`vgf-${label}`}>
        {options.map((option) => (
          <button key={option.label} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </button>
        ))}
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
