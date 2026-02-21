import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import PhotoCropper from './PhotoCropper';
import { getRatingColor, getCompositeColor, getTextColor } from '../utils/colors';

const coffeeIcon = L.divIcon({
  html: '<span style="font-size:28px;line-height:1;display:block;">☕</span>',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export default function VisitDetailModal({ visit, visits, onClose, onUpdate, onEdit, onDelete, onDuplicate }) {
  const [showMenu, setShowMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isDark, setIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key !== 'Escape') return;

      if (showMenu) {
        setShowMenu(false);
        return;
      }

      onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, showMenu]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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

  const handleDuplicate = () => {
    setShowMenu(false);
    setConfirmAction({
      type: 'duplicate',
      title: 'Duplicate this visit?',
      message: "This will create a copy with today's date that you can edit.",
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

  const mapCenter = useMemo(() => {
    if (!hasCoordinates) return null;
    return [Number(visit.coffee_shop_lat), Number(visit.coffee_shop_lng)];
  }, [hasCoordinates, visit.coffee_shop_lat, visit.coffee_shop_lng]);

  return (
    <div
      className="fixed inset-0 z-[1001] overflow-y-auto bg-black/70 dark:bg-black/80 backdrop-blur-sm transition-colors"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="animate-modal-in relative w-full max-w-2xl bg-white dark:bg-stone-800 rounded-3xl shadow-2xl overflow-hidden border border-stone-200/60 dark:border-stone-700/60 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Photo / placeholder */}
          <div className="relative">
            {visit.photo_url ? (
              <div className="relative aspect-[16/9] bg-stone-100 dark:bg-stone-700 overflow-hidden">
                <img src={visit.photo_url} alt={visit.coffee_shop_name} className="w-full h-full object-cover" />
                {visit.notes && (
                  <div
                    className="absolute bottom-0 left-0 right-0 pt-32 pb-5 px-5 sm:pb-6 sm:px-7"
                    style={{
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.12)',
                      maskImage: 'linear-gradient(to top, black 0%, black 35%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to top, black 0%, black 35%, transparent 100%)',
                    }}
                  >
                    <p className="text-white text-lg sm:text-xl font-semibold leading-relaxed tracking-wide" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
                      "{visit.notes}"
                    </p>
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

          {/* Body */}
          <div className="p-6 sm:p-7">
            {/* Top-right controls */}
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
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-stone-800 rounded-2xl shadow-xl z-20 border border-stone-200 dark:border-stone-700 overflow-hidden">
                    {!visit.photo_url && (
                      <button
                        onClick={handleReplacePhoto}
                        disabled={uploading}
                        className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                      >
                        Add Photo
                      </button>
                    )}
                    {visit.photo_url && (
                      <>
                        <button
                          onClick={handleRecropPhoto}
                          className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                        >
                          Crop Photo
                        </button>
                        <button
                          onClick={handleReplacePhoto}
                          className="w-full text-left px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
                        >
                          Edit Photo
                        </button>
                        <button
                          onClick={handleDeletePhoto}
                          className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-stone-700 transition-colors"
                        >
                          Remove Photo
                        </button>
                      </>
                    )}
                    <div className="border-t border-stone-100 dark:border-stone-700" />
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
                    <div className="border-t border-stone-100 dark:border-stone-700" />
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
              <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl flex items-center justify-between">
                <span>{photoError}</span>
                <button onClick={() => setPhotoError(null)} className="ml-2 text-red-500 hover:text-red-700">✕</button>
              </div>
            )}

            {/* Title */}
            <h2 className="coffee-shop-name text-4xl pr-20">
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
                  {visit.opponent}
                </span>
              )}
            </div>

            <p className="text-sm text-stone-500 dark:text-stone-400 mt-3">{formattedDate}</p>

            {/* Ratings — iOS grouped card */}
            <div className="mt-5 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700/60 shadow-sm overflow-hidden">
              <div className="grid grid-cols-3 divide-x divide-stone-100 dark:divide-stone-700/50">
                <ScoreCell label="Vibe" score={visit.vibe_rating} />
                <ScoreCell label="Coffee" score={visit.coffee_rating} />
                <ScoreCell label="Total" score={visit.composite_score} isTotal />
              </div>
            </div>

            {/* Order - prominent card */}
            {visit.coffee_order && (
              <div className="mt-5 p-5 rounded-2xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/60 dark:border-stone-700/60">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500 mb-2 select-none">
                  Order
                </p>
                <p className="text-xl font-semibold text-stone-900 dark:text-stone-50 leading-relaxed">
                  {visit.coffee_order}
                </p>
              </div>
            )}

            {/* Map */}
            {mapCenter && (
              <div className="mt-5 relative rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 h-48 sm:h-56">
                <MapContainer
                  center={mapCenter}
                  zoom={18}
                  className="h-full w-full"
                  scrollWheelZoom={false}
                  zoomControl={false}
                  key={mapCenter.join(',')}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url={
                      isDark
                        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                    }
                  />
                  <Marker position={mapCenter} icon={coffeeIcon}>
                    <Tooltip permanent direction="top" offset={[0, -30]} className="map-shop-label">
                      {visit.coffee_shop_name}
                    </Tooltip>
                  </Marker>
                </MapContainer>
                <a
                  href={
                    visit.coffee_shop_place_id
                      ? `https://www.google.com/maps/place/?q=place_id:${visit.coffee_shop_place_id}`
                      : `https://www.google.com/maps?q=${encodeURIComponent(visit.coffee_shop_name)}&ll=${visit.coffee_shop_lat},${visit.coffee_shop_lng}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 dark:bg-stone-800/90 text-stone-700 dark:text-stone-200 shadow-md backdrop-blur-sm hover:bg-white dark:hover:bg-stone-800 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Open in Maps
                </a>
              </div>
            )}

            {/* Notes - if no photo */}
            {!visit.photo_url && visit.notes && (
              <div className="mt-5 p-5 rounded-2xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/60 dark:border-stone-700/60">
                <p className="text-base text-stone-700 dark:text-stone-300 italic leading-relaxed">
                  "{visit.notes}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 dark:bg-black/80 backdrop-blur-sm"
          onClick={() => setConfirmAction(null)}
        >
          <div
            className="bg-white dark:bg-stone-800 rounded-3xl shadow-2xl max-w-sm w-full p-7 border border-stone-200/60 dark:border-stone-700/60"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-stone-900 dark:text-stone-50 mb-2">{confirmAction.title}</h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed mb-7">{confirmAction.message}</p>
            <div className="space-y-2">
              <button
                onClick={confirmAction.onConfirm}
                className={`w-full py-3.5 rounded-2xl font-semibold text-[15px] tracking-wide transition-all active:scale-[0.99] ${
                  confirmAction.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : confirmAction.type === 'duplicate'
                    ? 'bg-stone-900 dark:bg-stone-50 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900'
                    : 'bg-stone-900 dark:bg-stone-50 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900'
                }`}
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
    </div>
  );
}

function ScoreCell({ label, score, isTotal = false }) {
  const bgColor = isTotal ? getCompositeColor(score) : getRatingColor(score);

  return (
    <div className="px-4 py-4 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500 mb-2 select-none">
        {label}
      </p>
      <div
        className="inline-block rounded-xl px-3 py-1.5 rating-number text-2xl font-black"
        style={{
          backgroundColor: bgColor,
          color: getTextColor(bgColor),
        }}
      >
        {score.toFixed(1)}
      </div>
    </div>
  );
}
