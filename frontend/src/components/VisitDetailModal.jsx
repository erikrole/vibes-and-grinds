import { useEffect, useState } from 'react';
import PhotoCropper from './PhotoCropper';

export default function VisitDetailModal({ visit, visits, onClose, onUpdate, onEdit, onDelete }) {
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

  // Calculate how many times this shop has been visited
  const shopVisits = visits.filter(
    v => v.coffee_shop_name.toLowerCase() === visit.coffee_shop_name.toLowerCase()
  );
  const visitCount = shopVisits.length;

  // Calculate average ratings for this shop
  const avgVibe = shopVisits.reduce((sum, v) => sum + v.vibe_rating, 0) / visitCount;
  const avgCoffee = shopVisits.reduce((sum, v) => sum + v.coffee_rating, 0) / visitCount;
  const avgTotal = shopVisits.reduce((sum, v) => sum + v.composite_score, 0) / visitCount;

  // Close on Escape key
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

      // Update the visit with the new photo URL
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

  // Format date
  const [year, month, day] = visit.date.split('-');
  const formattedDate = new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 dark:bg-black/80 backdrop-blur-sm transition-colors" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white dark:bg-stone-800 rounded-3xl shadow-2xl overflow-hidden transition-colors" onClick={(e) => e.stopPropagation()}>
          {/* Photo Section */}
          <div className="relative">
            {visit.photo_url ? (
              <div className="relative aspect-[4/3] bg-stone-100 dark:bg-stone-700 overflow-hidden">
                <img
                  src={visit.photo_url}
                  alt={visit.coffee_shop_name}
                  className="w-full h-full object-cover"
                />

                {/* 3-dot menu on photo */}
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
                      <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-stone-800 rounded-xl shadow-xl z-20 border border-stone-200 dark:border-stone-700 overflow-hidden">
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

                {/* Notes overlay on photo */}
                {visit.notes && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6">
                    <p className="text-white text-sm leading-relaxed italic">
                      "{visit.notes}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative aspect-[4/3] bg-stone-100 dark:bg-stone-700 flex items-center justify-center">
                <button
                  onClick={handleAddPhoto}
                  disabled={uploading}
                  className="flex flex-col items-center gap-3 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 transition-colors"
                >
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">{uploading ? 'Uploading...' : 'Add Photo'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-8">
            {/* Close X button */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-stone-800/90 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-50 p-2 rounded-full backdrop-blur-sm transition-all shadow-lg"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Coffee Shop Name - ALL CAPS */}
            <h2 className="text-4xl font-bold text-stone-900 dark:text-stone-50 mb-3 tracking-wide uppercase">
              {visit.coffee_shop_name}
            </h2>

            {/* Location & Matchup Info */}
            <div className="text-stone-600 dark:text-stone-400 text-base mb-4 space-y-1">
              {visit.city && visit.opponent && visit.sport && (
                <p>{visit.city} for the {visit.sport} matchup against {visit.opponent}</p>
              )}
              {visit.city && !visit.opponent && <p>{visit.city}</p>}
              {visit.opponent && !visit.city && visit.sport && (
                <p>{visit.sport} matchup against {visit.opponent}</p>
              )}
              {visit.opponent && !visit.city && !visit.sport && <p>vs {visit.opponent}</p>}
            </div>

            {/* Date */}
            <p className="text-sm text-stone-500 dark:text-stone-500 mb-6 font-medium">
              {formattedDate}
            </p>

            {/* Divider */}
            <hr className="border-stone-200 dark:border-stone-700 my-6" />

            {/* Ratings - Keep the colorful boxes */}
            <div className="flex gap-4 justify-center mb-6">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div
                  className="px-5 py-2.5 rounded-lg font-black text-3xl rating-number shadow-sm"
                  style={{
                    backgroundColor: getRatingColor(visit.vibe_rating),
                    color: getTextColor(getRatingColor(visit.vibe_rating)),
                  }}
                >
                  {visit.vibe_rating.toFixed(1)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                <div
                  className="px-5 py-2.5 rounded-lg font-black text-3xl rating-number shadow-sm"
                  style={{
                    backgroundColor: getRatingColor(visit.coffee_rating),
                    color: getTextColor(getRatingColor(visit.coffee_rating)),
                  }}
                >
                  {visit.coffee_rating.toFixed(1)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <div
                  className="px-5 py-2.5 rounded-lg font-black text-3xl rating-number shadow-sm border-2"
                  style={{
                    backgroundColor: getRatingColor(visit.composite_score / 2),
                    color: getTextColor(getRatingColor(visit.composite_score / 2)),
                    borderColor: `${getRatingColor(visit.composite_score / 2)}dd`,
                  }}
                >
                  {visit.composite_score.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Additional Details */}
            {(visit.coffee_order || visit.coffee_shop_address) && (
              <div className="space-y-2 text-sm">
                {visit.coffee_order && (
                  <p className="text-stone-600 dark:text-stone-400">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">Order:</span> {visit.coffee_order}
                  </p>
                )}
                {visit.coffee_shop_address && (
                  <p className="text-stone-600 dark:text-stone-400">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">Address:</span> {visit.coffee_shop_address}
                  </p>
                )}
              </div>
            )}

            {/* Edit/Delete buttons */}
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

      {/* Photo Cropper Modal */}
      {cropping && imageToCrop && (
        <PhotoCropper
          imageUrl={imageToCrop}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}

// Helper functions for colors
function getRatingColor(rating) {
  const clampedRating = Math.max(0, Math.min(10, rating));
  if (clampedRating <= 5) {
    const percentage = clampedRating / 5;
    const r = 220;
    const g = Math.round(38 + (184 - 38) * percentage);
    const b = 38;
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const percentage = (clampedRating - 5) / 5;
    const r = Math.round(220 - (220 - 34) * percentage);
    const g = Math.round(184 + (197 - 184) * percentage);
    const b = Math.round(38 + (94 - 38) * percentage);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function getTextColor(bgColor) {
  // Parse the RGB values
  const match = bgColor.match(/rgb\((\d+), (\d+), (\d+)\)/);
  if (!match) return '#ffffff';

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white for dark backgrounds, dark for light backgrounds
  return luminance > 0.5 ? '#1c1917' : '#ffffff';
}
