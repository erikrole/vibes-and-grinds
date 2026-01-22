import { useEffect, useState } from 'react';
import RatingBadge from './RatingBadge';
import CompositeBadge from './CompositeBadge';
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
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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
        // Create a URL for the file to display in the cropper
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
    // Use the existing photo URL for re-cropping
    setImageToCrop(visit.photo_url);
    setCropping(true);
  };

  const handleDeletePhoto = async () => {
    setShowPhotoMenu(false);
    if (confirm('Are you sure you want to delete this photo?')) {
      try {
        await onUpdate(visit.id, { ...visit, photo_url: null });
      } catch (error) {
        console.error('Error deleting photo:', error);
        alert('Failed to delete photo. Please try again.');
      }
    }
  };

  const handleEdit = () => {
    setShowMenu(false);
    onEdit(visit);
    onClose();
  };

  const handleDelete = () => {
    setShowMenu(false);
    if (confirm(`Are you sure you want to delete the visit to ${visit.coffee_shop_name}?`)) {
      onDelete(visit.id);
      onClose();
    }
  };

  // Format date - parse manually to avoid timezone issues
  const [year, month, day] = visit.date.split('-');
  const formattedDate = new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Menu and Close buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            {/* 3-dot menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-stone-400 hover:text-stone-600 p-1 transition-colors"
                aria-label="Menu"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-20 border border-stone-200">
                    <button
                      onClick={handleEdit}
                      className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 rounded-t-md transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-md transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* Header - Big Title */}
            <h2 className="coffee-shop-name text-4xl md:text-5xl mb-6 pr-8">
              {visit.coffee_shop_name}
            </h2>

            {/* Photo with Notes Overlay */}
            <div className="mb-6 rounded-lg overflow-hidden relative bg-stone-100 flex items-end" style={{ aspectRatio: '4 / 5' }}>
              {visit.photo_url ? (
                <>
                  <img
                    src={visit.photo_url}
                    alt={visit.coffee_shop_name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Photo Menu */}
                  <div className="absolute top-4 right-4 z-10">
                    <button
                      onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                      className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                      disabled={uploading}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    {showPhotoMenu && (
                      <>
                        <div className="fixed inset-0" onClick={() => setShowPhotoMenu(false)} />
                        <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-20 border border-stone-200">
                          <button
                            onClick={handleRecropPhoto}
                            className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 rounded-t-md transition-colors"
                          >
                            Recrop
                          </button>
                          <button
                            onClick={handleReplacePhoto}
                            className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                          >
                            Replace
                          </button>
                          <button
                            onClick={handleDeletePhoto}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-md transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Add Photo Button */}
                  <button
                    onClick={handleAddPhoto}
                    disabled={uploading}
                    className="absolute top-4 right-4 bg-stone-800 text-stone-50 px-4 py-2 rounded-md hover:bg-stone-900 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Add Photo'}
                  </button>
                </>
              )}

              {/* Notes Overlay - Fancy Blockquote */}
              {visit.notes && (
                <div className={`relative w-full p-8 pt-16 ${visit.photo_url ? 'bg-gradient-to-t from-black/80 via-black/50 to-transparent' : ''}`}>
                  <blockquote className="relative">
                    <svg className={`absolute -top-4 -left-2 w-12 h-12 ${visit.photo_url ? 'text-white/30' : 'text-stone-300'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                    <p className={`${visit.photo_url ? 'text-white' : 'text-stone-900'} text-lg leading-relaxed italic pl-8`}>
                      {visit.notes}
                    </p>
                  </blockquote>
                </div>
              )}
            </div>

            {/* Visit Details */}
            <div className="space-y-2 mb-6">
              <p className="text-stone-700">
                <span className="font-semibold">Date:</span> {formattedDate}
              </p>
              {visit.coffee_order && (
                <p className="text-stone-700">
                  <span className="font-semibold">Order:</span> {visit.coffee_order}
                </p>
              )}
              {visit.city && (
                <p className="text-stone-700">
                  <span className="font-semibold">City:</span> {visit.city}
                </p>
              )}
              {visit.opponent && (
                <p className="text-stone-700">
                  <span className="font-semibold">Opponent:</span> {visit.opponent}
                </p>
              )}
              {visit.sport && (
                <p className="text-stone-700">
                  <span className="font-semibold">Sport:</span> {visit.sport}
                </p>
              )}
              {visit.coffee_shop_address && (
                <p className="text-stone-700">
                  <span className="font-semibold">Address:</span> {visit.coffee_shop_address}
                </p>
              )}
            </div>

            {/* Divider */}
            <hr className="border-stone-300 my-6" />

            {/* Ratings - All same size */}
            <div className="flex gap-4 justify-center mb-6">
              <div className="flex flex-col items-center flex-1 max-w-[120px]">
                <span className="text-xs text-stone-500 mb-2 font-medium tracking-widest uppercase">Vibe</span>
                <div
                  className="w-full px-4 py-3 rounded-md font-black text-2xl flex items-center justify-center border border-stone-200 tabular-nums min-w-[75px]"
                  style={{
                    backgroundColor: getRatingColor(visit.vibe_rating),
                    color: getTextColor(getRatingColor(visit.vibe_rating)),
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                >
                  {visit.vibe_rating.toFixed(1)}
                </div>
              </div>

              <div className="flex flex-col items-center flex-1 max-w-[120px]">
                <span className="text-xs text-stone-500 mb-2 font-medium tracking-widest uppercase">Coffee</span>
                <div
                  className="w-full px-4 py-3 rounded-md font-black text-2xl flex items-center justify-center border border-stone-200 tabular-nums min-w-[75px]"
                  style={{
                    backgroundColor: getRatingColor(visit.coffee_rating),
                    color: getTextColor(getRatingColor(visit.coffee_rating)),
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                >
                  {visit.coffee_rating.toFixed(1)}
                </div>
              </div>

              <div className="flex flex-col items-center flex-1 max-w-[120px]">
                <span className="text-xs text-stone-500 mb-2 font-medium tracking-widest uppercase">Total</span>
                <div
                  className="w-full px-4 py-3 rounded-md font-black text-2xl flex items-center justify-center border-2 tabular-nums min-w-[75px]"
                  style={{
                    backgroundColor: getRatingColor(visit.composite_score / 2),
                    color: getTextColor(getRatingColor(visit.composite_score / 2)),
                    borderColor: `${getRatingColor(visit.composite_score / 2)}dd`,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                >
                  {visit.composite_score.toFixed(1)}
                </div>
              </div>
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

function getTextColor(rating) {
  return rating >= 7 ? '#1c1917' : '#ffffff';
}
