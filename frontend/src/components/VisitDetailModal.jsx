import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PhotoCropper from './PhotoCropper';
import { getRatingColor, getCompositeColor } from '../utils/colors';
import { formatDate, getRelativeLabel } from '../utils/dates';
import { DEFAULT_VISITOR_NAME, getRepeatVisits } from '../utils/repeats';
import ShareCardModal from './ShareCardModal';
import ConfirmDialog from './ConfirmDialog';
import CopyLink from './CopyLink';
import useFocusTrap from '../hooks/useFocusTrap';
import { formatEventContext, titleCaseOrder } from '../utils/display';
import { getAppleMapsUrl } from '../utils/maps';
import { visitStanding } from '../utils/visitStanding';

export default function VisitDetailModal({ visit, visits, onClose, onNavigate, onUpdate, onEdit, onDelete, onLogReturnVisit, onShopClick, suspended = false }) {
  const modalRef = useRef(null);
  const closeRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [closing, setClosing] = useState(false);
  const [draggingPhoto, setDraggingPhoto] = useState(false);

  const standing = useMemo(() => visitStanding(visit, visits), [visit, visits]);
  const closeTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  const handleClose = useCallback(() => {
    setClosing(true);
    // Let the exit animation finish before unmounting, but never fire twice.
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200);
  }, [onClose]);

  const handleEscape = useCallback(() => {
    if (showMenu) {
      setShowMenu(false);
    } else {
      handleClose();
    }
  }, [showMenu, handleClose]);

  // Disable this trap while the share-card modal is open so Escape/Tab only
  // act on the child modal, not both.
  useFocusTrap(modalRef, { onEscape: handleEscape, enabled: !showShareCard && !suspended, initialFocusRef: closeRef });

  // Prev/next navigation
  const currentIndex = useMemo(() => visits.findIndex((v) => v.id === visit.id), [visits, visit.id]);
  const prevVisit = currentIndex > 0 ? visits[currentIndex - 1] : null;
  const nextVisit = currentIndex < visits.length - 1 ? visits[currentIndex + 1] : null;

  useEffect(() => {
    const onArrow = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
      if (e.key === 'ArrowLeft' && prevVisit) {
        onNavigate(prevVisit);
      } else if (e.key === 'ArrowRight' && nextVisit) {
        onNavigate(nextVisit);
      }
    };
    window.addEventListener('keydown', onArrow);
    return () => window.removeEventListener('keydown', onArrow);
  }, [prevVisit, nextVisit, onNavigate]);

  const handlePhotoUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const { url } = await response.json();
      await onUpdate(visit.id, { ...visit, photo_url: url });
    } catch (error) {
      console.error('Error uploading photo:', error);
      setPhotoError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          setImageToCrop(reader.result);
          setCropping(true);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleCropComplete = async (croppedFile) => {
    setCropping(false);
    setImageToCrop(null);
    await handlePhotoUpload(croppedFile);
  };

  const handleCropCancel = () => {
    setCropping(false);
    setImageToCrop(null);
  };

  const handlePhotoDrop = (e) => {
    e.preventDefault();
    setDraggingPhoto(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result);
        setCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReplacePhoto = () => {
    setShowMenu(false);
    handleAddPhoto();
  };

  const handleRecropPhoto = () => {
    setShowMenu(false);
    setImageToCrop(visit.photo_url);
    setCropping(true);
  };

  const handleDeletePhoto = () => {
    setShowMenu(false);
    setConfirmAction({
      type: 'delete',
      title: 'Remove this photo?',
      message: 'This will permanently remove the photo from this visit.',
      confirmText: 'Remove Photo',
      onConfirm: async () => {
        setConfirmAction(null);
        await onUpdate(visit.id, { ...visit, photo_url: null });
      },
    });
  };

  const handleEdit = () => {
    setShowMenu(false);
    onEdit(visit);
  };

  const handleShare = () => {
    setShowMenu(false);
    setShowShareCard(true);
  };

  const handleLogReturnVisit = () => {
    setShowMenu(false);
    onLogReturnVisit?.(visit);
  };

  const handleDelete = () => {
    setShowMenu(false);
    setConfirmAction({
      type: 'delete',
      title: 'Delete this visit?',
      message: `This will permanently delete your visit to ${visit.coffee_shop_name}. This action cannot be undone.`,
      confirmText: 'Move to deleted visits',
      onConfirm: () => {
        setConfirmAction(null);
        onDelete(visit.id);
      },
    });
  };

  const formattedDate = formatDate(visit.date);
  const relativeLabel = getRelativeLabel(visit.date);
  const shopRepeatVisits = useMemo(() => getRepeatVisits(visits, visit), [visits, visit]);
  const shopRepeatIndex = shopRepeatVisits.findIndex((v) => String(v.id) === String(visit.id));
  const previousShopVisit = shopRepeatIndex > 0 ? shopRepeatVisits[shopRepeatIndex - 1] : null;
  const bestShopVisit = shopRepeatVisits.reduce((best, candidate) => (
    !best || Number(candidate.composite_score) > Number(best.composite_score) ? candidate : best
  ), null);

  const mapUrl = getAppleMapsUrl(visit);
  const eventContext = formatEventContext(visit);
  const whenLine = [relativeLabel, formattedDate].filter(Boolean).join(' · ');
  const canPhoto = Boolean(onUpdate);

  return (
    <div
      className={`dialog-shell ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Visit details for ${visit.coffee_shop_name}`}
    >
      <div className="dialog-backdrop" aria-hidden="true" />
      <div className="dialog-positioner">
        <div
          ref={modalRef}
          className={`${closing ? 'animate-modal-out' : 'animate-modal-in'} dialog-panel visit-detail-panel vdm max-w-2xl ${draggingPhoto ? 'vdm-dragging' : ''}`}
          style={{ backgroundColor: 'var(--surface)' }}
          onClick={(e) => e.stopPropagation()}
          onDrop={canPhoto && !visit.photo_url ? handlePhotoDrop : undefined}
          onDragOver={canPhoto && !visit.photo_url ? (e) => { e.preventDefault(); setDraggingPhoto(true); } : undefined}
          onDragLeave={canPhoto && !visit.photo_url ? () => setDraggingPhoto(false) : undefined}
        >
          <div className="vdm-controls">
            {onEdit && (
              <button onClick={() => setShowMenu((prev) => !prev)} className="vdm-icon-btn" aria-label="Visit actions" aria-expanded={showMenu}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
              </button>
            )}
            <button ref={closeRef} onClick={handleClose} className="vdm-icon-btn" aria-label="Close">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                <div className="vdm-menu" role="menu">
                  {visit.photo_url ? (
                    <>
                      <MenuItem icon={MENU_ICONS.crop} onClick={handleRecropPhoto}>Crop photo</MenuItem>
                      <MenuItem icon={MENU_ICONS.replace} onClick={handleReplacePhoto}>Replace photo</MenuItem>
                      <MenuItem icon={MENU_ICONS.trash} onClick={handleDeletePhoto} danger>Remove photo</MenuItem>
                    </>
                  ) : (
                    <MenuItem icon={MENU_ICONS.camera} onClick={handleReplacePhoto} disabled={uploading}>Add photo</MenuItem>
                  )}
                  <div className="vdm-menu-rule" />
                  <MenuItem icon={MENU_ICONS.edit} onClick={handleEdit}>Edit visit</MenuItem>
                  <div className="vdm-menu-rule" />
                  <MenuItem icon={MENU_ICONS.trash} onClick={handleDelete} danger>Move to deleted visits</MenuItem>
                </div>
              </>
            )}
          </div>

          {uploading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface-raised/60 backdrop-blur-sm">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-raised shadow-lg border border-rule">
                <div className="w-5 h-5 border-2 border-rule border-t-ink rounded-full animate-spin" />
                <span className="text-sm font-medium text-ink">Uploading…</span>
              </div>
            </div>
          )}

          {visit.photo_url && (
            <div className="visit-photo-stage">
              <img src={visit.photo_url} alt={visit.coffee_shop_name} className="visit-photo-image" />
              {visit.notes && (
                <>
                  <button type="button" className="photo-note-pill" aria-expanded={showNote} aria-controls="photo-note" onClick={() => setShowNote((open) => !open)}>
                    {showNote ? 'Hide note' : 'Note'}
                  </button>
                  {showNote && <div id="photo-note" className="photo-note" role="note">{visit.notes}</div>}
                </>
              )}
            </div>
          )}

          <div className="vdm-body">
            {photoError && (
              <div className="alert-error" role="alert">
                <span>{photoError}</span>
                <button onClick={() => setPhotoError(null)} aria-label="Dismiss">&times;</button>
              </div>
            )}

            <header className="vdm-header">
              {whenLine && <p className="vdm-kicker">{whenLine}</p>}
              <h2 className="vdm-title">
                {visit.coffee_shop_name ? (
                  <a className="detail-shop-map-link" href={mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${visit.coffee_shop_name} in Maps`}>
                    <span>{visit.coffee_shop_name}</span>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5h5v5m0-5L10 14M19 13v5a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1h5" /></svg>
                  </a>
                ) : visit.coffee_shop_name}
              </h2>
              {(visit.city || eventContext) && (
                <p className="vdm-meta">{[visit.city, eventContext].filter(Boolean).join(' · ')}</p>
              )}
            </header>

            <div className="detail-score-grid">
              <ScoreCell key={`v-${visit.id}`} label="Vibe" score={visit.vibe_rating} standing={standing.vibe} />
              <ScoreCell key={`c-${visit.id}`} label="Coffee" score={visit.coffee_rating} standing={standing.coffee} />
              <ScoreCell key={`t-${visit.id}`} label="Total" score={visit.composite_score} isTotal standing={standing.total} />
            </div>
            {standing.chips.length > 0 && (
              <ul className="detail-chips" aria-label="Highlights">
                {standing.chips.map((chip, i) => <li key={chip} style={{ '--i': i }}>{chip}</li>)}
              </ul>
            )}

            {(visit.coffee_order || (visit.notes && !visit.photo_url)) && (
              <dl className="vdm-facts">
                {visit.coffee_order && (
                  <div>
                    <dt>Order</dt>
                    <dd>{titleCaseOrder(visit.coffee_order)}</dd>
                  </div>
                )}
                {visit.notes && !visit.photo_url && (
                  <div>
                    <dt>Notes</dt>
                    <dd className="vdm-notes">{visit.notes}</dd>
                  </div>
                )}
              </dl>
            )}

            {shopRepeatVisits.length > 1 && (
              <RepeatHistoryCard
                visit={visit}
                visitNumber={shopRepeatIndex + 1}
                total={shopRepeatVisits.length}
                previousVisit={previousShopVisit}
                bestVisit={bestShopVisit}
              />
            )}

            <div className="vdm-actions">
              {onLogReturnVisit && <button type="button" className="btn-primary" onClick={handleLogReturnVisit}>Log return visit</button>}
              <a className="text-action" href={mapUrl} target="_blank" rel="noopener noreferrer">Open in Maps</a>
              {visit.shop_id && <button type="button" className="text-action" onClick={() => onShopClick(visit)}>Shop history</button>}
              <CopyLink />
              <button type="button" className="text-action" onClick={handleShare}>Share image</button>
              {canPhoto && !visit.photo_url && <button type="button" className="text-action" onClick={handleAddPhoto} disabled={uploading}>Add photo</button>}
            </div>

            {(prevVisit || nextVisit) && (
              <nav className="vdm-pager" aria-label="Other visits">
                {prevVisit ? (
                  <button onClick={() => onNavigate(prevVisit)} className="vdm-pager-prev">
                    <span aria-hidden="true">←</span>
                    <span className="min-w-0"><small>Previous</small><b>{prevVisit.coffee_shop_name}</b></span>
                  </button>
                ) : <span />}
                {nextVisit ? (
                  <button onClick={() => onNavigate(nextVisit)} className="vdm-pager-next">
                    <span className="min-w-0"><small>Next</small><b>{nextVisit.coffee_shop_name}</b></span>
                    <span aria-hidden="true">→</span>
                  </button>
                ) : <span />}
              </nav>
            )}
          </div>
        </div>
      </div>

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText={confirmAction.confirmText}
          danger={confirmAction.type === 'delete'}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {cropping && imageToCrop && (
        <PhotoCropper imageUrl={imageToCrop} onComplete={handleCropComplete} onCancel={handleCropCancel} />
      )}

      {showShareCard && (
        <ShareCardModal visit={visit} onClose={() => setShowShareCard(false)} />
      )}
    </div>
  );
}

function useCountUp(target) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [value, setValue] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) { setValue(target); return undefined; }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 800);
      setValue(target * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced]);
  return value;
}

function ScoreCell({ label, score, isTotal = false, standing = null }) {
  const accent = isTotal ? getCompositeColor(score) : getRatingColor(score);
  const maxVal = isTotal ? 20 : 10;
  const shown = useCountUp(Number(score) || 0);
  const delta = standing?.delta;

  return (
    <div className="detail-score-cell" style={{ '--score-accent': accent, '--fill': `${Math.min(100, Math.max(0, (Number(score) / maxVal) * 100))}%` }}>
      <p className="eyebrow text-[0.65rem]">{label}</p>
      <span
        className="detail-score-value tabular-nums"
        style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontWeight: 650,
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}
        role="meter"
        aria-label={`${label} rating`}
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={maxVal}
      >
        {shown.toFixed(1)}
      </span>
      <span className="detail-score-scale">/ {maxVal}</span>
      {standing && (
        <span className="detail-score-rank" title={`Average ${standing.average}`}>
          #{standing.rank} of {standing.of}{delta ? ` · ${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)} vs avg` : ''}
        </span>
      )}
    </div>
  );
}

function RepeatHistoryCard({ visit, visitNumber, total, previousVisit, bestVisit }) {
  const previousDelta = previousVisit
    ? Number(visit.composite_score) - Number(previousVisit.composite_score)
    : null;
  const bestScore = Number(bestVisit?.composite_score);
  const isBest = bestVisit && String(bestVisit.id) === String(visit.id);
  const summary = [
    `${total} visits`,
    bestVisit && !isBest ? `best ${bestScore.toFixed(1)}/20` : isBest ? 'your best here' : null,
    previousDelta != null ? `${previousDelta >= 0 ? '+' : '−'}${Math.abs(previousDelta).toFixed(1)} since last time` : null,
  ].filter(Boolean).join(' · ');

  return (
    <section className="vdm-repeat" aria-label="Repeat history">
      <h3>{DEFAULT_VISITOR_NAME}&rsquo;s visit #{visitNumber} here</h3>
      <p>{summary}</p>
      {previousVisit && (
        <details>
          <summary>Compare with last visit</summary>
          <div className="repeat-comparison" role="table" aria-label="Previous and current visit ratings">
            <div role="row"><span role="columnheader">Rating</span><span role="columnheader">Previous</span><span role="columnheader">Current</span><span role="columnheader">Change</span></div>
            {[
              ['Vibe', 'vibe_rating'],
              ['Coffee', 'coffee_rating'],
              ['Overall', 'composite_score'],
            ].map(([label, field]) => {
              const delta = Number(visit[field]) - Number(previousVisit[field]);
              return <div role="row" key={field}><strong role="cell">{label}</strong><span role="cell">{Number(previousVisit[field]).toFixed(1)}</span><span role="cell">{Number(visit[field]).toFixed(1)}</span><b role="cell" data-direction={delta >= 0 ? 'up' : 'down'}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}</b></div>;
            })}
          </div>
        </details>
      )}
    </section>
  );
}

const MENU_ICONS = {
  camera: ['M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z', 'M15 13a3 3 0 11-6 0 3 3 0 016 0z'],
  crop: ['M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'],
  replace: ['M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'],
  edit: ['M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'],
  trash: ['M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'],
};

function MenuItem({ icon, onClick, children, danger = false, disabled = false }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} disabled={disabled} className={`vdm-menu-item${danger ? ' is-danger' : ''}`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        {icon.map((d) => <path key={d} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />)}
      </svg>
      {children}
    </button>
  );
}
