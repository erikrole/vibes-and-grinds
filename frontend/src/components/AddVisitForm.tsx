import { useState, useMemo } from 'react';
import PhotoCropper from './PhotoCropper';
import AutocompleteInput from './AutocompleteInput';
import PlacesAutocomplete from './PlacesAutocomplete';
import { getTodayDateString } from '../utils/dates';
import { uploadPhoto } from '../utils/api';
import type { Visit, VisitInput } from '../types';

interface Props {
  onSubmit: (visit: VisitInput) => void | Promise<void>;
  onCancel: () => void;
  initialData?: Visit | null;
  visits?: Visit[];
}

const BIG_TEN_TEAMS: Record<string, string> = {
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

export default function AddVisitForm({ onSubmit, onCancel, initialData = null, visits = [] }: Props) {
  const isEditing = Boolean(initialData);

  const suggestions = useMemo(() => {
    const isNonEmpty = (v: string | null | undefined): v is string => Boolean(v);
    return {
      coffeeShops: [...new Set(visits.map((v) => v.coffee_shop_name).filter(isNonEmpty))].sort(),
      cities: [...new Set(visits.map((v) => v.city).filter(isNonEmpty))].sort(),
      opponents: [...new Set(visits.map((v) => v.opponent).filter(isNonEmpty))].sort(),
      orders: [...new Set(visits.map((v) => v.coffee_order).filter(isNonEmpty))].sort(),
    };
  }, [visits]);

  const [formData, setFormData] = useState<any>(
    initialData || {
      date: getTodayDateString(),
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCustomSport, setShowCustomSport] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photo_url || null);
  const [uploading, setUploading] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    let { value } = e.target;

    // Clamp ratings to [0, 10] — skip while mid-decimal-entry (e.g. "8.")
    if ((name === 'vibe_rating' || name === 'coffee_rating') && value !== '' && !value.endsWith('.')) {
      const num = parseFloat(value);
      if (!isNaN(num)) value = String(Math.min(10, Math.max(0, num)));
    }

    if (name === 'sport' && value === '__custom__') {
      setShowCustomSport(true);
      setFormData({ ...formData, sport: '' });
      if (errors.sport) setErrors({ ...errors, sport: '' });
      return;
    }

    const updates: Record<string, string> = { [name]: value };

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

  const handlePlaceSelected = (place: any) => {
    if (!place) return;
    const cityFromAddress = extractCityFromAddress(place.address);
    const updates: Record<string, string | number> = {
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
    setFormData((prev: any) => ({ ...prev, ...updates }));
  };

  const processPhotoFile = (file: File | undefined | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => { setImageToCrop(reader.result as string); setCropping(true); };
    reader.readAsDataURL(file);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processPhotoFile(e.target.files?.[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    processPhotoFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleCropComplete = (croppedFile: File) => {
    setCropping(false);
    setImageToCrop(null);
    setPhotoFile(croppedFile);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
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

  const validateField = (name: string, value: string) => {
    if (name === 'date' && !value) return 'Date is required';
    if (name === 'coffee_shop_name' && !value) return 'Coffee shop is required';
    if (name === 'vibe_rating') {
      if (!value) return 'Vibe rating is required';
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 10) return 'Must be 0–10';
    }
    if (name === 'coffee_rating') {
      if (!value) return 'Coffee rating is required';
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 10) return 'Must be 0–10';
    }
    return '';
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    for (const name of ['date', 'coffee_shop_name', 'vibe_rating', 'coffee_rating']) {
      const error = validateField(name, formData[name]);
      if (error) newErrors[name] = error;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setUploading(true);
    try {
      let photoUrl = formData.photo_url;
      if (photoFile) {
        const { url } = await uploadPhoto(photoFile);
        photoUrl = url;
      }
      await onSubmit({
        ...formData,
        vibe_rating: parseFloat(formData.vibe_rating),
        coffee_rating: parseFloat(formData.coffee_rating),
        photo_url: photoUrl,
      });
    } catch (error) {
      console.error('Error submitting visit:', error);
      setErrors({ ...errors, photo: 'Failed to save visit. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-5 sm:mb-7 pr-12">
        <h2 className="coffee-shop-name text-2xl sm:text-4xl">{isEditing ? 'Edit Visit' : 'New Visit'}</h2>
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
                onBlur={handleBlur}
                className={FI}
              />
            </Field>
            <Field label="Sport">
              <div className="relative">
                {showCustomSport ? (
                  <input
                    name="sport"
                    type="text"
                    value={formData.sport}
                    onChange={handleInputChange}
                    placeholder="Enter sport name"
                    className={FI}
                    autoFocus
                  />
                ) : (
                  <>
                    <select
                      name="sport"
                      value={formData.sport}
                      onChange={handleInputChange}
                      className={FS}
                    >
                      <option value="">None</option>
                      <option value="Men's Basketball">Men's Basketball</option>
                      <option value="Men's Hockey">Men's Hockey</option>
                      <option value="Football">Football</option>
                      <option value="Track & Field">Track & Field</option>
                      <option value="Cross Country">Cross Country</option>
                      <option value="__custom__">+ Add Sport</option>
                    </select>
                    <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-300 dark:text-stone-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </div>
            </Field>
          </FieldRow>

          <Field label="Coffee Shop" required error={errors.coffee_shop_name}>
            <PlacesAutocomplete
              value={formData.coffee_shop_name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const nextValue = e.target.value;
                setFormData((prev: any) => ({
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
              onBlur={handleBlur}
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
                  onBlur={handleBlur}
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
                  onBlur={handleBlur}
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
              <div className="relative aspect-[4/5] rounded-t-2xl overflow-hidden">
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
            <label
              className={`flex items-center gap-4 px-4 py-3.5 cursor-pointer group transition-colors ${dragging ? 'bg-stone-100 dark:bg-stone-700/40' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className={`w-14 h-14 rounded-2xl bg-stone-50 dark:bg-stone-900/40 border-2 border-dashed flex items-center justify-center flex-shrink-0 transition-colors ${dragging ? 'border-stone-400 dark:border-stone-400' : 'border-stone-200 dark:border-stone-700 group-hover:border-stone-300 dark:group-hover:border-stone-600'}`}>
                <svg className={`w-6 h-6 transition-colors ${dragging ? 'text-stone-500 dark:text-stone-400' : 'text-stone-300 dark:text-stone-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-stone-700 dark:text-stone-300">{dragging ? 'Drop photo here' : 'Add a photo'}</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Drag & drop or click to browse</p>
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
            />
          </Field>
        </FormSection>

        {/* ── ACTIONS ──────────────────────────────────── */}
        <div className="sticky bottom-0 z-10 bg-white/95 dark:bg-stone-800/95 backdrop-blur-md pt-4 pb-2 border-t border-stone-100 dark:border-stone-600/60 safe-bottom">
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

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400 dark:text-stone-500 mb-2 pl-1">
        {title}
      </p>
      {/* No overflow-hidden so autocomplete dropdowns can escape the card */}
      <div className="rounded-2xl bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-600/60 divide-y divide-stone-100 dark:divide-stone-700/50 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-stone-100 dark:divide-stone-700/50">
      {children}
    </div>
  );
}

function Field({ label, required = false, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
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
