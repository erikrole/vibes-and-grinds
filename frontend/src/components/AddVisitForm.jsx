import { useState, useMemo } from 'react';
import PhotoCropper from './PhotoCropper';
import AutocompleteInput from './AutocompleteInput';
import PlacesAutocomplete from './PlacesAutocomplete';

const BIG_TEN_TEAMS = {
  'minneapolis': 'Minnesota Golden Gophers',
  'minneapolis, mn': 'Minnesota Golden Gophers',
  'madison': 'Wisconsin Badgers',
  'madison, wi': 'Wisconsin Badgers',
  'ann arbor': 'Michigan Wolverines',
  'ann arbor, mi': 'Michigan Wolverines',
  'east lansing': 'Michigan State Spartans',
  'east lansing, mi': 'Michigan State Spartans',
  'columbus': 'Ohio State Buckeyes',
  'columbus, oh': 'Ohio State Buckeyes',
  'state college': 'Penn State Nittany Lions',
  'state college, pa': 'Penn State Nittany Lions',
  'bloomington': 'Indiana Hoosiers',
  'bloomington, in': 'Indiana Hoosiers',
  'west lafayette': 'Purdue Boilermakers',
  'west lafayette, in': 'Purdue Boilermakers',
  'champaign': 'Illinois Fighting Illini',
  'champaign, il': 'Illinois Fighting Illini',
  'evanston': 'Northwestern Wildcats',
  'evanston, il': 'Northwestern Wildcats',
  'lincoln': 'Nebraska Cornhuskers',
  'lincoln, ne': 'Nebraska Cornhuskers',
  'iowa city': 'Iowa Hawkeyes',
  'iowa city, ia': 'Iowa Hawkeyes',
  'college park': 'Maryland Terrapins',
  'college park, md': 'Maryland Terrapins',
  'piscataway': 'Rutgers Scarlet Knights',
  'piscataway, nj': 'Rutgers Scarlet Knights',
  'milwaukee': 'Villanova',
  'milwaukee, wi': 'Villanova',
};

// Transparent, borderless input style for use inside section cells
const FI = 'w-full bg-transparent border-none outline-none focus:ring-0 text-[15px] text-stone-900 dark:text-stone-50 placeholder:text-stone-300 dark:placeholder:text-stone-600';
const FS = 'w-full bg-transparent border-none outline-none focus:ring-0 text-[15px] text-stone-900 dark:text-stone-50 appearance-none cursor-pointer';

export default function AddVisitForm({ onSubmit, onCancel, initialData = null, visits = [] }) {
  const isEditing = Boolean(initialData);

  const suggestions = useMemo(() => ({
    coffeeShops: [...new Set(visits.map((v) => v.coffee_shop_name).filter(Boolean))].sort(),
    cities: [...new Set(visits.map((v) => v.city).filter(Boolean))].sort(),
    opponents: [...new Set(visits.map((v) => v.opponent).filter(Boolean))].sort(),
    orders: [...new Set(visits.map((v) => v.coffee_order).filter(Boolean))].sort(),
  }), [visits]);

  const getLocalDate = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState(
    initialData || {
      date: getLocalDate(),
      coffee_shop_name: '',
      city: '',
      opponent: '',
      sport: '',
      coffee_shop_address: '',
      coffee_shop_place_id: '',
      coffee_shop_lat: '',
      coffee_shop_lng: '',
      coffee_order: '',
      vibe_rating: '',
      coffee_rating: '',
      notes: '',
      photo_url: '',
    }
  );

  const [errors, setErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(initialData?.photo_url || null);
  const [uploading, setUploading] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updates = { [name]: value };

    if (name === 'city' && value) {
      const cityLower = value.toLowerCase().trim();
      const matchedTeam = BIG_TEN_TEAMS[cityLower];
      if (matchedTeam && !formData.opponent) updates.opponent = matchedTeam;
    }

    setFormData({ ...formData, ...updates });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const extractCityFromAddress = (address = '') => {
    const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) return `${parts[parts.length - 3]}, ${parts[parts.length - 2].split(' ')[0]}`;
    return parts[0] || '';
  };

  const handlePlaceSelected = (place) => {
    if (!place) return;
    const cityFromAddress = extractCityFromAddress(place.address);
    const updates = {
      coffee_shop_name: place.name || formData.coffee_shop_name,
      coffee_shop_address: place.address || formData.coffee_shop_address,
      coffee_shop_place_id: place.place_id || '',
      coffee_shop_lat: typeof place.lat === 'number' ? place.lat : '',
      coffee_shop_lng: typeof place.lng === 'number' ? place.lng : '',
    };
    if (cityFromAddress && !formData.city) {
      updates.city = cityFromAddress;
      const matchedTeam = BIG_TEN_TEAMS[cityFromAddress.toLowerCase()];
      if (matchedTeam && !formData.opponent) updates.opponent = matchedTeam;
    }
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setImageToCrop(reader.result); setCropping(true); };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedFile) => {
    setCropping(false);
    setImageToCrop(null);
    setPhotoFile(croppedFile);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(croppedFile);
  };

  const handleCropCancel = () => { setCropping(false); setImageToCrop(null); };

  const handleRecropPhoto = () => {
    if (photoPreview) { setImageToCrop(photoPreview); setCropping(true); }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormData({ ...formData, photo_url: '' });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.coffee_shop_name) newErrors.coffee_shop_name = 'Coffee shop is required';
    if (!formData.vibe_rating) newErrors.vibe_rating = 'Vibe rating is required';
    if (!formData.coffee_rating) newErrors.coffee_rating = 'Coffee rating is required';

    const vibeRating = parseFloat(formData.vibe_rating);
    if (isNaN(vibeRating) || vibeRating < 0 || vibeRating > 10) newErrors.vibe_rating = 'Must be 0–10';

    const coffeeRating = parseFloat(formData.coffee_rating);
    if (isNaN(coffeeRating) || coffeeRating < 0 || coffeeRating > 10) newErrors.coffee_rating = 'Must be 0–10';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setUploading(true);
    try {
      let photoUrl = formData.photo_url;
      if (photoFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', photoFile);
        const response = await fetch('/api/upload', { method: 'POST', body: uploadFormData });
        if (!response.ok) throw new Error('Failed to upload photo');
        const { url } = await response.json();
        photoUrl = url;
      }
      onSubmit({
        ...formData,
        vibe_rating: parseFloat(formData.vibe_rating),
        coffee_rating: parseFloat(formData.coffee_rating),
        photo_url: photoUrl,
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      setErrors({ ...errors, photo: 'Failed to upload photo. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-7 pr-10">
        <h2 className="coffee-shop-name text-4xl">{isEditing ? 'Edit Visit' : 'New Visit'}</h2>
        <p className="text-sm text-stone-400 dark:text-stone-500 mt-1.5">
          {isEditing ? 'Update the details for this stop.' : 'Log your coffee shop experience.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>

        {/* ── WHEN & WHERE ─────────────────────────────── */}
        <FormSection title="When & Where">
          <FieldRow>
            <Field label="Date" required error={errors.date}>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className={FI}
              />
            </Field>
            <Field label="Sport">
              <div className="relative">
                <select
                  name="sport"
                  value={formData.sport}
                  onChange={handleInputChange}
                  className={FS}
                >
                  <option value="">None</option>
                  <option value="Men's Basketball">Men's Basketball</option>
                  <option value="Football">Football</option>
                  <option value="Track & Field">Track & Field</option>
                  <option value="Cross Country">Cross Country</option>
                </select>
                <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300 dark:text-stone-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </Field>
          </FieldRow>

          <Field label="Coffee Shop" required error={errors.coffee_shop_name}>
            <PlacesAutocomplete
              value={formData.coffee_shop_name}
              onChange={(e) => {
                const nextValue = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  coffee_shop_name: nextValue,
                  ...(!isEditing && {
                    coffee_shop_address: '',
                    coffee_shop_place_id: '',
                    coffee_shop_lat: '',
                    coffee_shop_lng: '',
                  }),
                }));
                if (errors.coffee_shop_name) setErrors((prev) => ({ ...prev, coffee_shop_name: '' }));
              }}
              onPlaceSelected={handlePlaceSelected}
              inputClassName={FI}
            />
          </Field>

          <FieldRow>
            <Field label="City">
              <AutocompleteInput
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                suggestions={suggestions.cities}
                className={FI}
                placeholder="City, ST"
              />
            </Field>
            <Field label="Opponent">
              <AutocompleteInput
                name="opponent"
                value={formData.opponent}
                onChange={handleInputChange}
                suggestions={suggestions.opponents}
                className={FI}
              />
            </Field>
          </FieldRow>

          <Field label="Address">
            <input
              type="text"
              name="coffee_shop_address"
              value={formData.coffee_shop_address}
              onChange={handleInputChange}
              className={`${FI} text-stone-500 dark:text-stone-400`}
              placeholder="Auto-fills from Places"
            />
          </Field>
        </FormSection>

        {/* ── ORDER & RATINGS ───────────────────────────── */}
        <FormSection title="Order & Ratings">
          <Field label="Coffee Order">
            <AutocompleteInput
              name="coffee_order"
              value={formData.coffee_order}
              onChange={handleInputChange}
              suggestions={suggestions.orders}
              className={FI}
              placeholder="e.g. Iced Salted Caramel Latte"
            />
          </Field>

          <FieldRow>
            <Field label="Vibe" required error={errors.vibe_rating}>
              <div className="flex items-baseline gap-1.5 mt-1">
                <input
                  type="number"
                  name="vibe_rating"
                  value={formData.vibe_rating}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  max="10"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="—"
                  className="w-16 bg-transparent border-none outline-none focus:ring-0 text-3xl font-black rating-number text-stone-900 dark:text-stone-50 placeholder:text-stone-200 dark:placeholder:text-stone-700"
                />
                <span className="text-sm text-stone-300 dark:text-stone-600 mb-0.5">/ 10</span>
              </div>
            </Field>
            <Field label="Coffee" required error={errors.coffee_rating}>
              <div className="flex items-baseline gap-1.5 mt-1">
                <input
                  type="number"
                  name="coffee_rating"
                  value={formData.coffee_rating}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  max="10"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="—"
                  className="w-16 bg-transparent border-none outline-none focus:ring-0 text-3xl font-black rating-number text-stone-900 dark:text-stone-50 placeholder:text-stone-200 dark:placeholder:text-stone-700"
                />
                <span className="text-sm text-stone-300 dark:text-stone-600 mb-0.5">/ 10</span>
              </div>
            </Field>
          </FieldRow>
        </FormSection>

        {/* ── MEMORIES ─────────────────────────────────── */}
        <FormSection title="Memories">
          {/* Photo */}
          {photoPreview ? (
            <>
              <div className="relative aspect-video rounded-t-2xl overflow-hidden">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleRecropPhoto}
                    className="bg-black/40 backdrop-blur-sm border border-white/20 text-white px-3 py-1.5 rounded-full text-xs font-medium hover:bg-black/60 transition-colors"
                  >
                    Crop
                  </button>
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="bg-black/40 backdrop-blur-sm border border-white/20 text-white px-3 py-1.5 rounded-full text-xs font-medium hover:bg-black/60 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-3 px-4 py-3 cursor-pointer group">
                <svg className="w-4 h-4 text-stone-400 dark:text-stone-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="text-[14px] text-stone-500 dark:text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors">
                  Change photo
                </span>
                {errors.photo && <span className="text-xs text-red-500 ml-auto">{errors.photo}</span>}
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </>
          ) : (
            <label className="flex items-center gap-4 px-4 py-3.5 cursor-pointer group">
              <div className="w-14 h-14 rounded-2xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-700 flex items-center justify-center flex-shrink-0 group-hover:border-stone-300 dark:group-hover:border-stone-600 transition-colors">
                <svg className="w-6 h-6 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-stone-700 dark:text-stone-300">Add a photo</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">PNG, JPG, HEIC up to 10MB</p>
              </div>
              <svg className="w-4 h-4 text-stone-300 dark:text-stone-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {errors.photo && <span className="text-xs text-red-500">{errors.photo}</span>}
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </label>
          )}

          {/* Notes */}
          <Field label="Notes">
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className={`${FI} resize-none`}
              placeholder="What stood out about this stop?"
            />
          </Field>
        </FormSection>

        {/* ── ACTIONS ──────────────────────────────────── */}
        <div className="sticky bottom-0 z-10 bg-white/95 dark:bg-stone-800/95 backdrop-blur-md pt-4 pb-2 border-t border-stone-100 dark:border-stone-700/60">
          <button
            type="submit"
            disabled={uploading}
            className="w-full py-4 bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 rounded-2xl font-semibold text-[15px] tracking-wide hover:bg-stone-800 dark:hover:bg-white transition-all active:scale-[0.99] disabled:opacity-40"
          >
            {uploading ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Visit'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="w-full py-3 mt-1 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 font-medium text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      {cropping && imageToCrop && (
        <PhotoCropper imageUrl={imageToCrop} onComplete={handleCropComplete} onCancel={handleCropCancel} />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FormSection({ title, children }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400 dark:text-stone-500 mb-2 pl-1">
        {title}
      </p>
      {/* No overflow-hidden so autocomplete dropdowns can escape the card */}
      <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700/60 divide-y divide-stone-100 dark:divide-stone-700/50 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function FieldRow({ children }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-stone-100 dark:divide-stone-700/50">
      {children}
    </div>
  );
}

function Field({ label, required = false, error, children }) {
  return (
    <div className="px-4 py-3.5 focus-within:bg-stone-50/80 dark:focus-within:bg-stone-700/20 transition-colors">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500 mb-1.5 select-none">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </p>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-red-500 dark:text-red-400 text-xs mt-1.5">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
