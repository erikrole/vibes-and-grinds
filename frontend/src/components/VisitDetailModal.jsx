import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PhotoCropper from './PhotoCropper';
import { getRatingColor, getCompositeColor } from '../utils/colors';
import { formatDate, getRelativeLabel } from '../utils/dates';
import { DEFAULT_VISITOR_NAME, getRepeatVisits } from '../utils/repeats';
import ShareCardModal from './ShareCardModal';
import useFocusTrap from '../hooks/useFocusTrap';
import { formatEventContext, titleCaseOrder } from '../utils/display';

export default function VisitDetailModal({ visit, visits, onClose, onNavigate, onUpdate, onEdit, onDelete, onLogReturnVisit }) {
  const modalRef = useRef(null);
  const closeRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [closing, setClosing] = useState(false);
  const [draggingPhoto, setDraggingPhoto] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
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
  useFocusTrap(modalRef, { onEscape: handleEscape, enabled: !showShareCard, initialFocusRef: closeRef });

  // Prev/next navigation
  const currentIndex = useMemo(() => visits.findIndex((v) => v.id === visit.id), [visits, visit.id]);
  const prevVisit = currentIndex > 0 ? visits[currentIndex - 1] : null;
  const nextVisit = currentIndex < visits.length - 1 ? visits[currentIndex + 1] : null;

  useEffect(() => {
    const onArrow = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
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
    setConfirmAction({
      type: 'return',
      title: 'Log return visit?',
      message: 'This will prefill the shop, location, and last order so you can add fresh ratings.',
      confirmText: 'Log Return Visit',
      onConfirm: () => {
        setConfirmAction(null);
        onLogReturnVisit?.(visit);
      },
    });
  };

  const handleDelete = () => {
    setShowMenu(false);
    setConfirmAction({
      type: 'delete',
      title: 'Delete this visit?',
      message: `This will permanently delete your visit to ${visit.coffee_shop_name}. This action cannot be undone.`,
      confirmText: 'Delete Visit',
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

  const hasCoordinates = Number.isFinite(Number(visit.coffee_shop_lat)) && Number.isFinite(Number(visit.coffee_shop_lng));
  const webMapUrl = visit.coffee_shop_place_id
    ? `https://www.google.com/maps/place/?q=place_id:${visit.coffee_shop_place_id}`
    : `https://www.google.com/maps?q=${encodeURIComponent(visit.coffee_shop_name)}&ll=${visit.coffee_shop_lat},${visit.coffee_shop_lng}`;
  const appleMapParams = new URLSearchParams({
    coordinate: `${visit.coffee_shop_lat},${visit.coffee_shop_lng}`,
    name: visit.coffee_shop_name,
    ...(visit.coffee_shop_address ? { address: visit.coffee_shop_address } : {}),
  });
  const nativeMapUrl = `https://maps.apple.com/place?${appleMapParams.toString()}`;
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform || navigator.userAgent);
  const mapUrl = isMac ? nativeMapUrl : webMapUrl;

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
          className={`${closing ? 'animate-modal-out' : 'animate-modal-in'} dialog-panel visit-detail-panel max-w-2xl`}
          style={{ backgroundColor: 'var(--paper-2)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Photo or decorative header */}
          <div className="relative">
            {uploading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-stone-900/60 backdrop-blur-sm">
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-stone-800 shadow-lg border border-stone-200 dark:border-stone-700">
                  <div className="w-5 h-5 border-2 border-stone-300 dark:border-stone-500 border-t-stone-700 dark:border-t-stone-200 rounded-full animate-spin" />
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-200">Uploading...</span>
                </div>
              </div>
            )}
            {visit.photo_url ? (
              <div className="visit-photo-stage">
                <img src={visit.photo_url} alt={visit.coffee_shop_name} className="visit-photo-image" />
              </div>
            ) : (
              <div
                className={`detail-header-accent h-28 sm:h-32 relative overflow-hidden transition-colors ${draggingPhoto ? 'ring-2 ring-inset ring-stone-400 dark:ring-stone-500' : ''}`}
                onDrop={handlePhotoDrop}
                onDragOver={(e) => { e.preventDefault(); setDraggingPhoto(true); }}
                onDragLeave={() => setDraggingPhoto(false)}
              >
                <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                {draggingPhoto ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Drop photo here</p>
                  </div>
                ) : (
                  <button
                    onClick={handleAddPhoto}
                    disabled={uploading}
                    className="absolute bottom-3 left-6 sm:left-7 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm border border-stone-200/60 dark:border-stone-600/40 hover:border-stone-300 dark:hover:border-stone-500 transition-all shadow-sm"
                    aria-label="Add photo to this visit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {uploading ? 'Uploading...' : 'Add Photo'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 md:p-7">
            {/* Top-right controls */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1.5 z-10">
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className="bg-white/90 dark:bg-stone-800/90 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-50 p-3 rounded-full backdrop-blur-sm transition-all shadow-lg"
                aria-label="Visit actions"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              <button
                ref={closeRef}
                onClick={handleClose}
                className="bg-white/90 dark:bg-stone-800/90 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-50 p-3 rounded-full backdrop-blur-sm transition-all shadow-lg"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-stone-800 rounded-2xl shadow-xl z-20 border border-stone-200 dark:border-stone-700 overflow-hidden">
                    {!visit.photo_url && (
                      <button
                        onClick={handleReplacePhoto}
                        disabled={uploading}
                        className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-3"
                      >
                        <svg className="w-4 h-4 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Add Photo
                      </button>
                    )}
                    {visit.photo_url && (
                      <>
                        <button
                          onClick={handleRecropPhoto}
                          className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Crop Photo
                        </button>
                        <button
                          onClick={handleReplacePhoto}
                          className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          Replace Photo
                        </button>
                        <button
                          onClick={handleDeletePhoto}
                          className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Remove Photo
                        </button>
                      </>
                    )}
                    <div className="border-t border-stone-100 dark:border-stone-700" />
                    <button
                      onClick={handleEdit}
                      className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Edit Visit
                    </button>
                    <button
                      onClick={handleShare}
                      className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      Share Card
                    </button>
                    <button
                      onClick={handleLogReturnVisit}
                      className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Log Return Visit
                    </button>
                    <div className="border-t border-stone-100 dark:border-stone-700" />
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete Visit
                    </button>
                  </div>
                </>
              )}
            </div>

            {photoError && (
              <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl flex items-center justify-between">
                <span>{photoError}</span>
                <button onClick={() => setPhotoError(null)} className="ml-2 text-red-500 hover:text-red-700">&times;</button>
              </div>
            )}

            {/* Title */}
            <h2
              className="text-2xl sm:text-3xl md:text-4xl pr-24 leading-tight"
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontWeight: 600,
                letterSpacing: '-0.025em',
                color: 'var(--ink)',
              }}
            >
              {hasCoordinates ? (
                <a className="detail-shop-map-link" href={mapUrl} target={isMac ? undefined : '_blank'} rel={isMac ? undefined : 'noopener noreferrer'} aria-label={`Open ${visit.coffee_shop_name} in Maps`}>
                  <span>{visit.coffee_shop_name}</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5h5v5m0-5L10 14M19 13v5a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1h5" /></svg>
                </a>
              ) : visit.coffee_shop_name}
            </h2>

            {/* Inline metadata */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600 dark:text-stone-300">
              {relativeLabel && (
                <>
                  <span className="font-medium" style={{ color: 'var(--ink)' }}>{relativeLabel}</span>
                  <span className="text-stone-300 dark:text-stone-600">·</span>
                </>
              )}
              <span className="text-stone-500 dark:text-stone-400">{formattedDate}</span>
              {visit.city && (
                <>
                  <span className="text-stone-300 dark:text-stone-600">·</span>
                  <span>{visit.city}</span>
                </>
              )}
              {formatEventContext(visit) && (
                <>
                  <span className="text-stone-300 dark:text-stone-600">·</span>
                  <span className="text-stone-500 dark:text-stone-400">{formatEventContext(visit)}</span>
                </>
              )}
            </div>

            {/* Ratings */}
            <div className="detail-score-grid">
              <ScoreCell label="Vibe" score={visit.vibe_rating} />
              <ScoreCell label="Coffee" score={visit.coffee_rating} />
              <ScoreCell label="Total" score={visit.composite_score} isTotal />
            </div>

            {/* Order card */}
            {visit.coffee_order && (
              <div
                className="mt-5 flex items-center gap-4 p-4 sm:p-5 rounded-2xl"
                style={{ backgroundColor: 'var(--paper-tint)' }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{ backgroundColor: 'var(--accent-soft)' }}
                >
                  ☕
                </div>
                <div className="flex-1 min-w-0">
                  <p className="eyebrow mb-0.5 text-[0.65rem]">Order</p>
                  <p className="text-lg font-semibold truncate" style={{ color: 'var(--ink)' }}>
                    {titleCaseOrder(visit.coffee_order)}
                  </p>
                </div>
              </div>
            )}

            {shopRepeatVisits.length > 1 && (
              <RepeatHistoryCard
                visit={visit}
                visits={shopRepeatVisits}
                visitNumber={shopRepeatIndex + 1}
                previousVisit={previousShopVisit}
                bestVisit={bestShopVisit}
                onLogReturnVisit={onLogReturnVisit}
              />
            )}

            {visit.notes && (
              <blockquote className="visit-note-card">
                <p className="eyebrow mb-2 text-[0.65rem]">Straight from AJ</p>
                <p className="visit-note-copy">
                  {visit.notes}
                </p>
              </blockquote>
            )}

            {/* Prev/Next navigation */}
            {(prevVisit || nextVisit) && (
              <div className="mt-6 pt-5 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid var(--rule)' }}>
                {prevVisit ? (
                  <button
                    onClick={() => onNavigate(prevVisit)}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-left transition-all group hover:-translate-y-0.5"
                    style={{ backgroundColor: 'var(--paper-tint)' }}
                  >
                    <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform flex-shrink-0" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <div className="min-w-0">
                      <p className="eyebrow text-[0.65rem]">Previous</p>
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{prevVisit.coffee_shop_name}</p>
                    </div>
                  </button>
                ) : <div />}
                {nextVisit ? (
                  <button
                    onClick={() => onNavigate(nextVisit)}
                    className="flex items-center justify-end gap-2.5 px-4 py-3 rounded-2xl text-right transition-all group hover:-translate-y-0.5"
                    style={{ backgroundColor: 'var(--paper-tint)' }}
                  >
                    <div className="min-w-0">
                      <p className="eyebrow text-[0.65rem]">Next</p>
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{nextVisit.coffee_shop_name}</p>
                    </div>
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform flex-shrink-0" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : <div />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 dark:bg-black/80 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
          onClick={() => setConfirmAction(null)}
        >
          <div
            className="rounded-xl shadow-xl max-w-sm w-full p-7 border border-stone-200 dark:border-stone-700"
            style={{ backgroundColor: 'var(--paper-2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-dialog-title" className="text-xl mb-2" style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              {confirmAction.title}
            </h3>
            <p id="confirm-dialog-message" className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed mb-7">{confirmAction.message}</p>
            <div className="space-y-2">
              <button
                onClick={confirmAction.onConfirm}
                className="w-full py-3.5 rounded-lg font-semibold text-[15px] transition-colors"
                style={
                  confirmAction.type === 'delete'
                    ? { backgroundColor: '#dc2626', color: '#fff' }
                    : { backgroundColor: 'var(--ink)', color: 'var(--paper)' }
                }
              >
                {confirmAction.confirmText}
              </button>
              <button
                onClick={() => setConfirmAction(null)}
                className="w-full py-3 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 font-medium text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
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

function ScoreCell({ label, score, isTotal = false }) {
  const accent = isTotal ? getCompositeColor(score) : getRatingColor(score);
  const maxVal = isTotal ? 20 : 10;

  return (
    <div className="detail-score-cell" style={{ '--score-accent': accent }}>
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
        {score.toFixed(1)}
      </span>
      <span className="detail-score-scale">/ {maxVal}</span>
    </div>
  );
}

function RepeatHistoryCard({ visit, visits, visitNumber, previousVisit, bestVisit, onLogReturnVisit }) {
  const previousDelta = previousVisit
    ? Number(visit.composite_score) - Number(previousVisit.composite_score)
    : null;
  const deltaLabel = previousDelta == null
    ? null
    : `${previousDelta >= 0 ? '+' : ''}${previousDelta.toFixed(1)}`;
  const bestScore = Number(bestVisit?.composite_score);
  const bestDate = bestVisit?.date ? formatDate(bestVisit.date) : null;

  return (
    <div className="mt-5 rounded-2xl p-4 sm:p-5" style={{ backgroundColor: 'var(--paper-tint)' }}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="eyebrow mb-1 text-[0.65rem]">Repeat history</p>
          <p className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
            {DEFAULT_VISITOR_NAME}'s visit #{visitNumber} here
          </p>
        </div>
        <button
          type="button"
          onClick={() => onLogReturnVisit?.(visit)}
          className="self-start rounded-xl px-3 py-2 text-xs font-semibold transition-colors bg-white/70 dark:bg-stone-800/70 text-stone-700 dark:text-stone-200 hover:bg-white dark:hover:bg-stone-800 border border-stone-200/70 dark:border-stone-600/70"
        >
          Log Return Visit
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <RepeatMetric label="Total visits" value={visits.length} />
        {bestVisit && (
          <RepeatMetric
            label="Best here"
            value={`${bestScore.toFixed(1)}/20`}
            detail={bestDate}
            accent={getCompositeColor(bestScore)}
          />
        )}
        {previousVisit && (
          <RepeatMetric
            label="Since previous"
            value={deltaLabel}
            detail={`${Number(previousVisit.composite_score).toFixed(1)}/20 last time`}
            accent={previousDelta >= 0 ? '#16a34a' : '#dc2626'}
          />
        )}
      </div>
      {previousVisit && (
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
      )}
    </div>
  );
}

function RepeatMetric({ label, value, detail, accent }) {
  return (
    <div className="rounded-xl bg-white/55 dark:bg-stone-800/55 px-3.5 py-3 border border-stone-200/50 dark:border-stone-700/50">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-400 dark:text-stone-500 mb-1">
        {label}
      </p>
      <p className="text-lg font-black" style={{ color: accent || 'var(--ink)' }}>
        {value}
      </p>
      {detail && <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">{detail}</p>}
    </div>
  );
}
