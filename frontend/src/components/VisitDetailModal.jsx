import { useEffect, useMemo, useState } from 'react';
import PhotoCropper from './PhotoCropper';
import { getRatingColor, getCompositeColor, getTextColor } from '../utils/colors';

export default function VisitDetailModal({ visit, visits, onClose, onUpdate, onEdit, onDelete, onDuplicate }) {
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const shopVisits = useMemo(
    () => visits.filter((v) => v.coffee_shop_name.toLowerCase() === visit.coffee_shop_name.toLowerCase()),
    [visits, visit.coffee_shop_name]
  );

  const visitCount = shopVisits.length;
  const avgVibe = visitCount
    ? shopVisits.reduce((sum, v) => sum + v.vibe_rating, 0) / visitCount
    : visit.vibe_rating;
  const avgCoffee = visitCount
    ? shopVisits.reduce((sum, v) => sum + v.coffee_rating, 0) / visitCount
    : visit.coffee_rating;
  const avgTotal = visitCount
    ? shopVisits.reduce((sum, v) => sum + v.composite_score, 0) / visitCount
    : visit.composite_score;

  const latestShopVisit = useMemo(() => {
    const sorted = [...shopVisits].sort((a, b) => new Date(b.date) - new Date(a.date));
    return sorted[0];
  }, [shopVisits]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key !== 'Escape') return;

      if (showPhotoMenu) {
        setShowPhotoMenu(false);
        return;
      }

      if (showMenu) {
        setShowMenu(false);
        return;
      }

      onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, showMenu, showPhotoMenu]);

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
      setShowPhotoMenu(false);
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

  const handleReplacePhoto = () => {
    setShowPhotoMenu(false);
    handleAddPhoto();
  };

  const handleRecropPhoto = () => {
    setShowPhotoMenu(false);
    setImageToCrop(visit.photo_url);
    setCropping(true);
  };

  const handleDeletePhoto = async () => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      await onUpdate(visit.id, { ...visit, photo_url: null });
      setShowPhotoMenu(false);
    }
  };

  const handleEdit = () => {
    setShowMenu(false);
    setConfirmAction({
      type: 'edit',
      title: 'Edit this visit?',
      message: 'You can make changes and save them.',
      confirmText: 'Edit Visit',
      onConfirm: () => {
        setConfirmAction(null);
        onEdit(visit);
      },
    });
  };

  const handleDuplicate = () => {
    setShowMenu(false);
    setConfirmAction({
      type: 'duplicate',
      title: 'Duplicate this visit?',
      message: 'This will create a copy with today\'s date that you can edit.',
      confirmText: 'Duplicate Visit',
      onConfirm: () => {
        setConfirmAction(null);
        onDuplicate?.(visit);
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

  const [year, month, day] = visit.date.split('-');
  const formattedDate = new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const hasCoordinates = Number.isFinite(Number(visit.coffee_shop_lat)) && Number.isFinite(Number(visit.coffee_shop_lng));

  const mapEmbedUrl = useMemo(() => {
    if (visit.coffee_shop_place_id) {
      return `https://maps.google.com/maps?q=place_id:${visit.coffee_shop_place_id}&zoom=15&output=embed`;
    }
    if (hasCoordinates && visit.coffee_shop_name) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(visit.coffee_shop_name)}&ll=${visit.coffee_shop_lat},${visit.coffee_shop_lng}&z=15&output=embed`;
    }
    if (hasCoordinates) {
      return `https://maps.google.com/maps?q=${visit.coffee_shop_lat},${visit.coffee_shop_lng}&z=15&output=embed`;
    }
    return null;
  }, [visit.coffee_shop_place_id, hasCoordinates, visit.coffee_shop_lat, visit.coffee_shop_lng, visit.coffee_shop_name]);

  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${visit.coffee_shop_lat},${visit.coffee_shop_lng}`
    : visit.coffee_shop_address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visit.coffee_shop_address)}`
      : '';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 dark:bg-black/80 backdrop-blur-sm transition-colors"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-3xl bg-white dark:bg-stone-800 rounded-3xl shadow-2xl overflow-hidden transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            {visit.photo_url ? (
              <div className="relative aspect-[16/9] bg-stone-100 dark:bg-stone-700 overflow-hidden">
                <img src={visit.photo_url} alt={visit.coffee_shop_name} className="w-full h-full object-cover" />

                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                    className="bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full backdrop-blur-sm transition-all shadow-lg"
                    disabled={uploading}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  {showPhotoMenu && (
                    <>
                      <div className="fixed inset-0" onClick={() => setShowPhotoMenu(false)} />
                      <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-stone-800 rounded-xl shadow-xl z-20 border border-stone-200 dark:border-stone-700 overflow-hidden">
                        <button
                          onClick={handleRecropPhoto}
                          className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                        >
                          Recrop
                        </button>
                        <button
                          onClick={handleReplacePhoto}
                          className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                        >
                          Replace
                        </button>
                        <button
                          onClick={handleDeletePhoto}
                          className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-stone-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {visit.notes && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6">
                    <p className="text-white text-base leading-relaxed italic">“{visit.notes}”</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative aspect-[16/9] bg-stone-100 dark:bg-stone-700 flex items-center justify-center">
                <button
                  onClick={handleAddPhoto}
                  disabled={uploading}
                  className="flex flex-col items-center gap-3 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 transition-colors"
                >
                  <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium">{uploading ? 'Uploading...' : 'Add Photo'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8">
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className="bg-white/90 dark:bg-stone-800/90 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-50 p-2 rounded-full backdrop-blur-sm transition-all shadow-lg"
                aria-label="Visit actions"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="bg-white/90 dark:bg-stone-800/90 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-50 p-2 rounded-full backdrop-blur-sm transition-all shadow-lg"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-stone-800 rounded-xl shadow-xl z-20 border border-stone-200 dark:border-stone-700 overflow-hidden">
                    <button
                      onClick={handleEdit}
                      className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                    >
                      Edit Visit
                    </button>
                    <button
                      onClick={handleDuplicate}
                      className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                    >
                      Duplicate Visit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-stone-700 transition-colors"
                    >
                      Delete Visit
                    </button>
                  </div>
                </>
              )}
            </div>

            {photoError && (
              <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg flex items-center justify-between">
                <span>{photoError}</span>
                <button onClick={() => setPhotoError(null)} className="ml-2 text-red-500 hover:text-red-700">✕</button>
              </div>
            )}

            <h2 className="text-4xl font-black text-stone-900 dark:text-stone-50 tracking-wide uppercase">
              {visit.coffee_shop_name}
            </h2>

            <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-wide">
              {visit.city && (
                <span className="px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                  {visit.city}
                </span>
              )}
              {visit.sport && (
                <span className="px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                  {visit.sport}
                </span>
              )}
              {visit.opponent && (
                <span className="px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                  vs {visit.opponent}
                </span>
              )}
            </div>

            <p className="text-sm text-stone-500 dark:text-stone-400 mt-4">{formattedDate}</p>

            <div className="grid grid-cols-3 gap-3 mt-6">
              <ScoreCard label="Vibe" score={visit.vibe_rating} />
              <ScoreCard label="Coffee" score={visit.coffee_rating} />
              <ScoreCard label="Total" score={visit.composite_score} isTotal />
            </div>

            {mapEmbedUrl && (
              <div className="mt-6 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 h-48">
                <iframe
                  title="Shop location"
                  src={mapEmbedUrl}
                  className="w-full h-full"
                  loading="lazy"
                />
              </div>
            )}

            {visitCount > 1 && (
              <section className="mt-6 p-4 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-700">
                <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200 uppercase tracking-wide">Shop History Snapshot</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  <SnapshotStat label="Visits" value={visitCount} />
                  <SnapshotStat label="Avg vibe" value={avgVibe.toFixed(1)} />
                  <SnapshotStat label="Avg coffee" value={avgCoffee.toFixed(1)} />
                  <SnapshotStat label="Avg total" value={avgTotal.toFixed(1)} />
                </div>
                {latestShopVisit && (
                  <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                    Last stop here: {new Date(latestShopVisit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </section>
            )}

            <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {visit.coffee_order && <DetailRow label="Order" value={visit.coffee_order} />}
              {visit.coffee_shop_address && <DetailRow label="Address" value={visit.coffee_shop_address} />}
              {googleMapsUrl && (
                <DetailRow
                  label="Map"
                  value={<a href={googleMapsUrl} target="_blank" rel="noreferrer" className="text-stone-700 dark:text-stone-300 underline underline-offset-2">Open in Google Maps ↗</a>}
                />
              )}
              {!visit.photo_url && visit.notes && <DetailRow label="Notes" value={visit.notes} />}
            </section>

            <div className="flex flex-wrap gap-3 mt-8">
              <button
                onClick={handleEdit}
                className="flex-1 min-w-[120px] px-6 py-3 bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-50 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors font-medium"
              >
                Edit Visit
              </button>
              <button
                onClick={handleDuplicate}
                className="px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/35 transition-colors font-medium"
              >
                Duplicate
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 dark:bg-black/80 backdrop-blur-sm" onClick={() => setConfirmAction(null)}>
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-stone-900 dark:text-stone-50 mb-2">{confirmAction.title}</h3>
            <p className="text-stone-600 dark:text-stone-400 mb-6">{confirmAction.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-4 py-2.5 bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-50 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction.onConfirm}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  confirmAction.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : confirmAction.type === 'duplicate'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-stone-800 hover:bg-stone-900 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900'
                }`}
              >
                {confirmAction.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {cropping && imageToCrop && (
        <PhotoCropper imageUrl={imageToCrop} onComplete={handleCropComplete} onCancel={handleCropCancel} />
      )}
    </div>
  );
}

function ScoreCard({ label, score, isTotal = false }) {
  const bgColor = isTotal ? getCompositeColor(score) : getRatingColor(score);

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-3 text-center bg-white/60 dark:bg-stone-800/60">
      <p className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2">{label}</p>
      <div
        className="rounded-lg px-3 py-2 rating-number text-2xl"
        style={{
          backgroundColor: bgColor,
          color: getTextColor(bgColor),
          border: isTotal ? `2px solid ${bgColor}dd` : 'none',
        }}
      >
        {score.toFixed(1)}
      </div>
    </div>
  );
}

function SnapshotStat({ label, value }) {
  return (
    <div className="rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</p>
      <p className="text-lg font-semibold text-stone-900 dark:text-stone-100 mt-1 rating-number">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-3">
      <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</p>
      <p className="text-stone-700 dark:text-stone-300 mt-1">{value}</p>
    </div>
  );
}
