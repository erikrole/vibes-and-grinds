import { useId, useMemo, useRef, useState } from 'react';
import PhotoCropper from './PhotoCropper';
import AutocompleteInput from './AutocompleteInput';
import PlacesAutocomplete from './PlacesAutocomplete';
import { formatDate, getTodayDateString } from '../utils/dates';
import { getRepeatContext } from '../utils/repeats';
import { titleCaseOrder } from '../utils/display';
import { HOME_CITY, VISIT_TYPES, getVisitType, isMadisonArea } from '../utils/visitTypes';

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
const FI = 'form-control';
const FS = 'form-control appearance-none cursor-pointer';

function getDefaultVisitData() {
  return {
    date: getTodayDateString(),
    coffee_shop_name: '',
    city: '',
    opponent: '',
    sport: '',
    visit_type: VISIT_TYPES.ROAD,
    coffee_shop_address: '',
    coffee_shop_place_id: '',
    coffee_shop_lat: '',
    coffee_shop_lng: '',
    coffee_order: '',
    vibe_rating: '',
    coffee_rating: '',
    notes: '',
    photo_url: '',
  };
}

export default function AddVisitForm({ onSubmit, initialData = null, visits = [], mode = 'add' }) {
  const isEditing = mode === 'edit';
  const isReturnVisit = mode === 'return';

  const suggestions = useMemo(() => ({
    coffeeShops: [...new Set(visits.map((v) => v.coffee_shop_name).filter(Boolean))].sort(),
    cities: [...new Set(visits.map((v) => v.city).filter(Boolean))].sort(),
    opponents: [...new Set(visits.map((v) => v.opponent).filter(Boolean))].sort(),
    orders: [...new Set(visits.map((v) => v.coffee_order).filter(Boolean))].sort(),
  }), [visits]);

  const [formData, setFormData] = useState({ ...getDefaultVisitData(), ...(initialData || {}) });

  const [errors, setErrors] = useState({});
  const [showCustomSport, setShowCustomSport] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(initialData?.photo_url || null);
  const [uploading, setUploading] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [dragging, setDragging] = useState(false);
  const formRef = useRef(null);
  const reactId = useId().replace(/:/g, '');
  const fieldIds = useMemo(() => ({
    date: `${reactId}-date`,
    sport: `${reactId}-sport`,
    customSport: `${reactId}-custom-sport`,
    coffee_shop_name: `${reactId}-coffee-shop-name`,
    city: `${reactId}-city`,
    opponent: `${reactId}-opponent`,
    coffee_shop_address: `${reactId}-coffee-shop-address`,
    coffee_order: `${reactId}-coffee-order`,
    vibe_rating: `${reactId}-vibe-rating`,
    coffee_rating: `${reactId}-coffee-rating`,
    photo: `${reactId}-photo`,
    notes: `${reactId}-notes`,
  }), [reactId]);

  const repeatContext = useMemo(
    () => getRepeatContext(visits, formData, { excludeId: isEditing ? initialData?.id : null }),
    [formData, initialData?.id, isEditing, visits]
  );

  const visitType = getVisitType(formData);
  const isHomeStop = visitType === VISIT_TYPES.HOME;

  // Madison-area locations tag themselves as home stops. Once the toggle is used
  // by hand that choice sticks, so detection can't undo a deliberate override.
  const [scopeLocked, setScopeLocked] = useState(false);

  const detectedScopeUpdates = (location, { allowRevert = false } = {}) => {
    if (scopeLocked) return {};

    if (isMadisonArea(location)) {
      if (isHomeStop) return {};
      return { visit_type: VISIT_TYPES.HOME, sport: '', opponent: '' };
    }

    // A half-typed city isn't evidence of anything; only a resolved place is.
    if (!allowRevert || !isHomeStop) return {};
    return { visit_type: VISIT_TYPES.ROAD };
  };

  const handleVisitTypeChange = (nextType) => {
    setScopeLocked(true);
    if (nextType === visitType) return;
    setShowCustomSport(false);
    setFormData((prev) => ({
      ...prev,
      visit_type: nextType,
      // Madison stops carry no game context, so clear it rather than let the
      // now-hidden fields save values the user can no longer see.
      ...(nextType === VISIT_TYPES.HOME && {
        sport: '',
        opponent: '',
        city: prev.city?.trim() ? prev.city : HOME_CITY,
      }),
    }));
  };

  const handleInputChange = (e) => {
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

    const updates = { [name]: value };

    // Home stops never get an opponent, and Madison would otherwise match the map.
    if (name === 'city' && value && !isHomeStop) {
      const cityLower = value.toLowerCase().trim();
      const matchedTeam = BIG_TEN_TEAMS[cityLower];
      if (matchedTeam && !formData.opponent) updates.opponent = matchedTeam;
    }

    if (name === 'city') {
      Object.assign(updates, detectedScopeUpdates({ city: value }));
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
      if (!isHomeStop) {
        const matchedTeam = BIG_TEN_TEAMS[cityFromAddress.toLowerCase()];
        if (matchedTeam && !formData.opponent) updates.opponent = matchedTeam;
      }
    }

    // Applied last so a Madison result clears any opponent guessed just above.
    Object.assign(updates, detectedScopeUpdates(
      {
        city: updates.city ?? formData.city,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      },
      { allowRevert: true }
    ));

    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const processPhotoFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => { setImageToCrop(reader.result); setCropping(true); };
    reader.readAsDataURL(file);
  };

  const handlePhotoChange = (e) => {
    processPhotoFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processPhotoFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

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

  const validateField = (name, value) => {
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

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validate = () => {
    const newErrors = {};
    for (const name of ['date', 'coffee_shop_name', 'vibe_rating', 'coffee_rating']) {
      const error = validateField(name, formData[name]);
      if (error) newErrors[name] = error;
    }
    setErrors(newErrors);
    const firstError = Object.keys(newErrors)[0];
    if (firstError) {
      requestAnimationFrame(() => {
        const field = formRef.current?.querySelector(`#${fieldIds[firstError]}`);
        field?.focus({ preventScroll: true });
        field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    }
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
      await onSubmit({
        ...formData,
        visit_type: visitType,
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
      <div className="visit-form-header">
        <p className="type-label">{isHomeStop ? 'Madison coffee journal' : 'Road coffee journal'}</p>
        <h2 className="type-title">
          {isEditing ? 'Edit Visit' : isReturnVisit ? 'Return Visit' : 'New Visit'}
        </h2>
        <p className="type-meta">
          {isHomeStop
            ? 'A regular stop around town. No game, no opponent — just the cup.'
            : 'Capture the stop first. Add the trip context only when it matters.'}
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="visit-form" noValidate>
        <div className="form-scope" role="group" aria-label="Visit type">
          {[
            { value: VISIT_TYPES.ROAD, label: 'Road trip' },
            { value: VISIT_TYPES.HOME, label: 'Around Madison' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleVisitTypeChange(option.value)}
              aria-pressed={visitType === option.value}
              className="form-scope-option"
            >
              {option.label}
            </button>
          ))}
        </div>

        {repeatContext?.personalCount > 0 && (
          <RepeatContextPanel context={repeatContext} isReturnVisit={isReturnVisit} />
        )}

        {/* ── WHEN & WHERE ─────────────────────────────── */}
        <FormSection title="Where did you stop?" description="Search first and the location details will fill themselves in.">
          <Field label="Coffee Shop" htmlFor={fieldIds.coffee_shop_name} required error={errors.coffee_shop_name}>
            <PlacesAutocomplete
              id={fieldIds.coffee_shop_name}
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
              onBlur={handleBlur}
              onPlaceSelected={handlePlaceSelected}
              inputClassName={FI}
              ariaInvalid={Boolean(errors.coffee_shop_name)}
              ariaDescribedBy={errors.coffee_shop_name ? `${fieldIds.coffee_shop_name}-error` : undefined}
              enterKeyHint="next"
            />
          </Field>
          <FieldRow>
            <Field label="Date" htmlFor={fieldIds.date} required error={errors.date}>
              <input
                id={fieldIds.date}
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className={FI}
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? `${fieldIds.date}-error` : undefined}
              />
            </Field>
          </FieldRow>

          {!isHomeStop && (
          <Field label="Sport" htmlFor={showCustomSport ? fieldIds.customSport : fieldIds.sport}>
            <div className="relative">
              {showCustomSport ? (
                <input
                  id={fieldIds.customSport}
                  name="sport"
                  type="text"
                  value={formData.sport}
                  onChange={handleInputChange}
                  placeholder="Enter sport name"
                  className={FI}
                  autoFocus
                  enterKeyHint="next"
                  autoCapitalize="words"
                />
              ) : (
                <>
                  <select
                    id={fieldIds.sport}
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
          )}

          {repeatContext?.personalCount > 0 && (
            <div className="px-4 py-3 bg-amber-50/70 dark:bg-amber-900/10 text-sm text-stone-600 dark:text-stone-300">
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                {repeatContext.visitorName}'s visit #{repeatContext.visitNumber}
              </span>
              {repeatContext.lastVisit?.coffee_order && (
                <span className="text-stone-500 dark:text-stone-400"> · Last order: {titleCaseOrder(repeatContext.lastVisit.coffee_order)}</span>
              )}
            </div>
          )}

          {isHomeStop ? (
            <Field label="City" htmlFor={fieldIds.city}>
              <AutocompleteInput
                id={fieldIds.city}
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                suggestions={suggestions.cities}
                className={FI}
                placeholder={HOME_CITY}
                enterKeyHint="next"
                autoCapitalize="words"
              />
            </Field>
          ) : (
          <FieldRow>
            <Field label="City" htmlFor={fieldIds.city}>
              <AutocompleteInput
                id={fieldIds.city}
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                suggestions={suggestions.cities}
                className={FI}
                enterKeyHint="next"
                autoCapitalize="words"
              />
            </Field>
            <Field label="Opponent" htmlFor={fieldIds.opponent}>
              <AutocompleteInput
                id={fieldIds.opponent}
                name="opponent"
                value={formData.opponent}
                onChange={handleInputChange}
                suggestions={suggestions.opponents}
                className={FI}
                enterKeyHint="next"
                autoCapitalize="words"
              />
            </Field>
          </FieldRow>
          )}

          <Field label="Address" htmlFor={fieldIds.coffee_shop_address}>
            <input
              id={fieldIds.coffee_shop_address}
              type="text"
              name="coffee_shop_address"
              value={formData.coffee_shop_address}
              onChange={handleInputChange}
              className={`${FI} text-stone-500 dark:text-stone-400`}
              placeholder="Auto-fills from Places"
              enterKeyHint="next"
              autoCapitalize="words"
            />
          </Field>
        </FormSection>

        {/* ── ORDER & RATINGS ───────────────────────────── */}
        <FormSection title="What did AJ order?" description="Name the drink, then score the cup and the room.">
          <Field label="Coffee Order" htmlFor={fieldIds.coffee_order}>
            <AutocompleteInput
              id={fieldIds.coffee_order}
              name="coffee_order"
              value={formData.coffee_order}
              onChange={handleInputChange}
              suggestions={suggestions.orders}
              className={FI}
              enterKeyHint="next"
              autoCapitalize="words"
            />
          </Field>

          <FieldRow>
            <Field label="Vibe" htmlFor={fieldIds.vibe_rating} required error={errors.vibe_rating}>
              <div className="form-rating-control">
                <input
                  id={fieldIds.vibe_rating}
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
                  className="form-rating-input"
                  aria-invalid={Boolean(errors.vibe_rating)}
                  aria-describedby={errors.vibe_rating ? `${fieldIds.vibe_rating}-error` : undefined}
                  enterKeyHint="next"
                />
                <span>/ 10</span>
              </div>
            </Field>
            <Field label="Coffee" htmlFor={fieldIds.coffee_rating} required error={errors.coffee_rating}>
              <div className="form-rating-control">
                <input
                  id={fieldIds.coffee_rating}
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
                  className="form-rating-input"
                  aria-invalid={Boolean(errors.coffee_rating)}
                  aria-describedby={errors.coffee_rating ? `${fieldIds.coffee_rating}-error` : undefined}
                  enterKeyHint="done"
                />
                <span>/ 10</span>
              </div>
            </Field>
          </FieldRow>
        </FormSection>

        {/* ── MEMORIES ─────────────────────────────────── */}
        <FormSection title="Save the memory" description="A photo and one honest line are enough.">
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
              <label htmlFor={fieldIds.photo} className="flex items-center gap-3 px-4 py-3 cursor-pointer group">
                <svg className="w-4 h-4 text-stone-400 dark:text-stone-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="text-[14px] text-stone-500 dark:text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors">
                  Change photo
                </span>
                {errors.photo && <span className="text-xs text-red-500 ml-auto">{errors.photo}</span>}
                <input id={fieldIds.photo} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </>
          ) : (
            <label
              htmlFor={fieldIds.photo}
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
              <input id={fieldIds.photo} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </label>
          )}

          {/* Notes */}
          <Field label="Notes" htmlFor={fieldIds.notes}>
            <textarea
              id={fieldIds.notes}
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className={`${FI} resize-none`}
              enterKeyHint="done"
            />
          </Field>
        </FormSection>

        {/* ── ACTIONS ──────────────────────────────────── */}
        <div className="form-actions safe-bottom">
          <button
            type="submit"
            disabled={uploading}
            className="form-submit"
          >
            {uploading ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Visit'}
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

function FormSection({ title, description, children }) {
  return (
    <section className="form-section">
      <div className="form-section-heading">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {/* No overflow-hidden so autocomplete dropdowns can escape the card */}
      <div className="form-surface">
        {children}
      </div>
    </section>
  );
}

function RepeatContextPanel({ context, isReturnVisit }) {
  const lastVisitDate = context.lastVisit?.date
    ? formatDate(context.lastVisit.date, { month: 'short', day: 'numeric' })
    : null;
  const bestScore = Number.isFinite(Number(context.bestVisit?.composite_score))
    ? Number(context.bestVisit.composite_score).toFixed(1)
    : null;

  return (
    <div className="rounded-2xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-900/15 px-4 py-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
            {isReturnVisit ? 'Return visit ready' : 'Repeat visit'}
          </p>
          <p className="mt-1 text-sm font-semibold text-stone-900 dark:text-stone-50">
            {context.visitorName}'s visit #{context.visitNumber} here
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-stone-600 dark:text-stone-300">
          {lastVisitDate && (
            <span className="rounded-full bg-white/70 dark:bg-stone-800/70 px-2.5 py-1">
              Last: {lastVisitDate}
            </span>
          )}
          {context.lastVisit?.coffee_order && (
            <span className="rounded-full bg-white/70 dark:bg-stone-800/70 px-2.5 py-1">
              {titleCaseOrder(context.lastVisit.coffee_order)}
            </span>
          )}
          {bestScore && (
            <span className="rounded-full bg-white/70 dark:bg-stone-800/70 px-2.5 py-1">
              Best: {bestScore}/20
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldRow({ children }) {
  return (
    <div className="form-field-row">
      {children}
    </div>
  );
}

function Field({ label, htmlFor, required = false, error, children }) {
  const labelClassName = 'form-label';
  const labelContent = (
    <>
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </>
  );

  return (
    <div className="form-field">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={`block ${labelClassName}`}>
          {labelContent}
        </label>
      ) : (
        <p className={labelClassName}>{labelContent}</p>
      )}
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className="flex items-center gap-1 text-red-500 dark:text-red-400 text-xs mt-1.5">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
