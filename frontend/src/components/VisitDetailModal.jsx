import { useEffect, useMemo, useState } from 'react';
import PhotoCropper from './PhotoCropper';

export default function VisitDetailModal({ visit, visits, onClose, onUpdate, onEdit, onDelete }) {
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

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
      alert('Failed to upload photo. Please try again.');
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
    onEdit(visit);
  };

  const handleDelete = () => {
    setShowMenu(false);
    if (window.confirm(`Are you sure you want to delete this visit to ${visit.coffee_shop_name}?`)) {
      onDelete(visit.id);
    }
  };

  const [year, month, day] = visit.date.split('-');
  const formattedDate = new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

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
            <button
              onClick={onClose}
              className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-stone-800/90 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-50 p-2 rounded-full backdrop-blur-sm transition-all shadow-lg"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="absolute top-4 right-4">
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className="bg-white/90 dark:bg-stone-800/90 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-50 p-2 rounded-full backdrop-blur-sm transition-all shadow-lg"
                aria-label="Visit actions"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-stone-800 rounded-xl shadow-xl z-20 border border-stone-200 dark:border-stone-700 overflow-hidden">
                    <button
                      onClick={handleEdit}
                      className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                    >
                      Edit Visit
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
              {!visit.photo_url && visit.notes && <DetailRow label="Notes" value={visit.notes} />}
            </section>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleEdit}
                className="flex-1 px-6 py-3 bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-50 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors font-medium"
              >
                Edit Visit
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

      {cropping && imageToCrop && (
        <PhotoCropper imageUrl={imageToCrop} onComplete={handleCropComplete} onCancel={handleCropCancel} />
      )}
    </div>
  );
}

function ScoreCard({ label, score, isTotal = false }) {
  const ratingForColor = isTotal ? score / 2 : score;
  const bgColor = getRatingColor(ratingForColor);

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

function getRatingColor(rating) {
  const clampedRating = Math.max(0, Math.min(10, rating));
  if (clampedRating <= 5) {
    const percentage = clampedRating / 5;
    const r = 220;
    const g = Math.round(38 + (184 - 38) * percentage);
    const b = 38;
    return `rgb(${r}, ${g}, ${b})`;
  }

  const percentage = (clampedRating - 5) / 5;
  const r = Math.round(220 - (220 - 34) * percentage);
  const g = Math.round(184 + (197 - 184) * percentage);
  const b = Math.round(38 + (94 - 38) * percentage);
  return `rgb(${r}, ${g}, ${b})`;
}

function getTextColor(bgColor) {
  const match = bgColor.match(/rgb\((\d+), (\d+), (\d+)\)/);
  if (!match) return '#ffffff';

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#1c1917' : '#ffffff';
}
