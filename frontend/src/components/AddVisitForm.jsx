import { useEffect, useId, useMemo, useRef, useState } from 'react';
import PhotoCropper from './PhotoCropper';
import AutocompleteInput from './AutocompleteInput';
import PlacesAutocomplete from './PlacesAutocomplete';
import { formatDate, getTodayDateString } from '../utils/dates';
import { getRepeatContext } from '../utils/repeats';
import { fetchBadgerGames } from '../utils/api';
import { gameFill, gameLabel } from '../utils/gameSuggestions';
import { titleCaseOrder } from '../utils/display';
import { HOME_CITY, VISIT_TYPES, getVisitType, isMadisonArea } from '../utils/visitTypes';

function moreSummary({ city, sport, opponent, notes }) {
  return [city, sport, opponent, notes && 'Note'].filter(Boolean).join(' · ');
}

function getDefaultVisitData() {
  return {
    date: getTodayDateString(),
    coffee_shop_name: '',
    city: '',
    opponent: '',
    sport: '',
    visit_type: VISIT_TYPES.ROAD,
    coffee_shop_address: '',
    shop_id: null,
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

export default function AddVisitForm({ onSubmit, initialData = null, visits = [], mode = 'add', onDirtyChange, onSavingChange }) {
  const isEditing = mode === 'edit';
  const isReturnVisit = mode === 'return';

  const suggestions = useMemo(() => ({
    cities: [...new Set(visits.map((v) => v.city).filter(Boolean))].sort(),
    opponents: [...new Set(visits.map((v) => v.opponent).filter(Boolean))].sort(),
    orders: [...new Set(visits.map((v) => v.coffee_order).filter(Boolean))].sort(),
    recentOrders: [...new Map([...visits]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .map((v) => [titleCaseOrder(v.coffee_order || '').toLowerCase(), titleCaseOrder(v.coffee_order || '')])
      .filter(([key]) => key)).values()].slice(0, 5),
  }), [visits]);

  const [formData, setFormData] = useState({ ...getDefaultVisitData(), ...(initialData || {}) });
  const [searchCity, setSearchCity] = useState(initialData?.city || '');

  const [errors, setErrors] = useState({});
  const [locating, setLocating] = useState(false);
  const [showMore, setShowMore] = useState(
    () => Boolean(initialData?.city || initialData?.coffee_shop_address || initialData?.sport || initialData?.opponent || initialData?.notes)
  );
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

  const baselineRef = useRef(JSON.stringify({ ...getDefaultVisitData(), ...(initialData || {}) }));
  useEffect(() => {
    onDirtyChange?.(JSON.stringify(formData) !== baselineRef.current || Boolean(photoFile));
  }, [formData, photoFile, onDirtyChange]);
  useEffect(() => { onSavingChange?.(uploading); }, [uploading, onSavingChange]);

  const visitType = getVisitType(formData);
  const isHomeStop = visitType === VISIT_TYPES.HOME;

  // Wisconsin games on the picked date, offered as one-tap fills for new road visits.
  const [games, setGames] = useState([]);
  useEffect(() => {
    if (isEditing || isHomeStop || !/^\d{4}-\d{2}-\d{2}$/.test(formData.date || '')) {
      setGames([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchBadgerGames(formData.date, controller.signal).then((found) => {
        if (!controller.signal.aborted) setGames(found);
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [formData.date, isEditing, isHomeStop]);

  const useGame = (game) => {
    setFormData((prev) => ({ ...prev, ...gameFill(prev, game) }));
    setShowMore(true);
  };
  const gameChoices = games.filter((game) => Object.keys(gameFill(formData, game)).length > 0);

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

    if (name === 'city') {
      setSearchCity(value);
      Object.assign(updates, { shop_id: null, coffee_shop_place_id: '', coffee_shop_lat: '', coffee_shop_lng: '' });
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
    const cityFromAddress = place.city || extractCityFromAddress(place.address);
    const updates = {
      coffee_shop_name: place.name || formData.coffee_shop_name,
      shop_id: place.shop_id || null,
      coffee_shop_address: place.address || '',
      coffee_shop_place_id: place.place_id || '',
      coffee_shop_lat: place.lat ?? '',
      coffee_shop_lng: place.lng ?? '',
    };
    if (cityFromAddress) {
      updates.city = cityFromAddress;
      setSearchCity(cityFromAddress);
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
    setErrors((prev) => ({ ...prev, coffee_shop_name: '' }));
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
    if (name === 'coffee_shop_name' && !String(value || '').trim()) return 'Coffee shop is required';
    if (name === 'vibe_rating') {
      if (value === '' || value == null) return 'Vibe rating is required';
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 10) return 'Must be 0–10';
    }
    if (name === 'coffee_rating') {
      if (value === '' || value == null) return 'Coffee rating is required';
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 10) return 'Must be 0–10';
    }
    return '';
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
    if (uploading || locating || !validate()) return;
    setErrors((prev) => ({ ...prev, submit: '' }));
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
        coffee_shop_name: formData.coffee_shop_name.trim(),
        visit_type: visitType,
        vibe_rating: parseFloat(formData.vibe_rating),
        coffee_rating: parseFloat(formData.coffee_rating),
        photo_url: photoUrl,
      });
    } catch (error) {
      console.error('Error submitting visit:', error);
      setErrors((prev) => ({ ...prev, submit: 'Couldn’t save this visit. Your entry is still here. Try again.' }));
    } finally {
      setUploading(false);
    }
  };

  const rated = formData.vibe_rating !== '' && formData.coffee_rating !== '';
  const total = rated ? (Number(formData.vibe_rating) + Number(formData.coffee_rating)).toFixed(1) : null;
  const moreHint = moreSummary(formData) || (isHomeStop ? 'City, address, note' : 'City, sport, opponent, note');

  return (
    <div className="avf">
      <h2 className="type-title avf-title">
        {isEditing ? 'Edit visit' : isReturnVisit ? 'Return visit' : 'Add visit'}
      </h2>

      <form ref={formRef} onSubmit={handleSubmit} className="avf-form" noValidate>
        <div className="avf-top">
          <div className="avf-scope" role="group" aria-label="Visit type">
            {[
              { value: VISIT_TYPES.ROAD, label: 'Road trip' },
              { value: VISIT_TYPES.HOME, label: 'Madison' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleVisitTypeChange(option.value);
                }}
                aria-pressed={visitType === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="avf-date">
            <label htmlFor={fieldIds.date} className="sr-only">Date</label>
            <input
              id={fieldIds.date}
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? `${fieldIds.date}-error` : undefined}
            />
          </div>
        </div>
        {errors.date && <p id={`${fieldIds.date}-error`} className="avf-error" role="alert">{errors.date}</p>}

        {gameChoices.length > 0 && (
          <div className="avf-games" role="group" aria-label="Wisconsin games that day">
            {gameChoices.map((game) => (
              <button key={`${game.sport}-${game.opponent}`} type="button" className="avf-game" onClick={() => useGame(game)}>
                <span>{gameLabel(game)}{game.city && game.location !== 'vs' ? ` · ${game.city}` : ''}</span>
                <small>Fill in</small>
              </button>
            ))}
          </div>
        )}

        {repeatContext?.personalCount > 0 && (
          <RepeatContextPanel context={repeatContext} />
        )}

        <Field label="Coffee shop" htmlFor={fieldIds.coffee_shop_name} error={errors.coffee_shop_name}>
          <PlacesAutocomplete
            id={fieldIds.coffee_shop_name}
            value={formData.coffee_shop_name}
            onChange={(e) => {
              const nextValue = e.target.value;
              setFormData((prev) => ({
                ...prev,
                coffee_shop_name: nextValue,
                city: isHomeStop ? HOME_CITY : '',
                coffee_shop_address: '',
                shop_id: null,
                coffee_shop_place_id: '',
                coffee_shop_lat: '',
                coffee_shop_lng: '',
              }));
              if (errors.coffee_shop_name) setErrors((prev) => ({ ...prev, coffee_shop_name: '' }));
            }}
            onPlaceSelected={handlePlaceSelected}
            inputClassName="avf-input"
            ariaInvalid={Boolean(errors.coffee_shop_name)}
            ariaDescribedBy={errors.coffee_shop_name ? `${fieldIds.coffee_shop_name}-error` : undefined}
            enterKeyHint="next"
            savedPlaces={visits}
            city={isHomeStop ? HOME_CITY : searchCity}
            onBusyChange={setLocating}
          />
          {formData.city && <p className="avf-hint">{[formData.city, formData.coffee_shop_address].filter(Boolean).join(' · ')}</p>}
        </Field>

        <Field label="Order" htmlFor={fieldIds.coffee_order}>
          <AutocompleteInput
            id={fieldIds.coffee_order}
            name="coffee_order"
            value={formData.coffee_order}
            onChange={handleInputChange}
            suggestions={suggestions.orders}
            className="avf-input"
            placeholder="What did you get?"
            enterKeyHint="next"
            autoCapitalize="words"
          />
          {!formData.coffee_order && suggestions.recentOrders.length > 0 && (
            <div className="avf-chips" role="group" aria-label="Recent orders">
              {suggestions.recentOrders.map((order) => (
                <button key={order} type="button" className="avf-chip" onClick={() => setFormData((prev) => ({ ...prev, coffee_order: order }))}>{order}</button>
              ))}
            </div>
          )}
        </Field>

        <div className="avf-ratings">
          {[
            { key: 'vibe_rating', label: 'Vibe' },
            { key: 'coffee_rating', label: 'Coffee' },
          ].map(({ key, label }) => {
            const value = formData[key];
            const unset = value === '';
            return (
              <div key={key} className={`avf-rating ${unset ? 'is-unset' : ''} ${errors[key] ? 'has-error' : ''}`}>
                <div className="avf-rating-head">
                  <label htmlFor={fieldIds[key]}>{label}</label>
                  <span className="avf-rating-value">
                    <input
                      id={fieldIds[key]}
                      type="number"
                      name={key}
                      value={value}
                      onChange={handleInputChange}
                      step="0.1"
                      min="0"
                      max="10"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="Tap to rate"
                      aria-invalid={Boolean(errors[key])}
                      aria-describedby={errors[key] ? `${fieldIds[key]}-error` : undefined}
                      enterKeyHint={key === 'coffee_rating' ? 'done' : 'next'}
                    />
                    {!unset && <small>/ 10</small>}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  name={key}
                  value={unset ? 0 : value}
                  onChange={handleInputChange}
                  aria-label={`${label} rating slider`}
                  aria-valuetext={unset ? 'Not rated yet' : `${value} out of 10`}
                  className="avf-slider"
                />
                {errors[key] && <p id={`${fieldIds[key]}-error`} className="avf-error" role="alert">{errors[key]}</p>}
              </div>
            );
          })}
        </div>

        {/* Photo */}
        {photoPreview ? (
          <div className="avf-photo">
            <img src={photoPreview} alt="Visit photo preview" />
            <div>
              <button type="button" onClick={handleRecropPhoto}>Crop</button>
              <button type="button" onClick={removePhoto}>Remove</button>
              <label htmlFor={fieldIds.photo}>Change<input id={fieldIds.photo} type="file" accept="image/*" onChange={handlePhotoChange} className="sr-only" /></label>
            </div>
          </div>
        ) : (
          <label
            htmlFor={fieldIds.photo}
            className={`avf-photo-add ${dragging ? 'is-dragging' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {dragging ? 'Drop photo here' : 'Add a photo'}
            <input id={fieldIds.photo} type="file" accept="image/*" onChange={handlePhotoChange} className="sr-only" />
          </label>
        )}
        {errors.photo && <p className="avf-error" role="alert">{errors.photo}</p>}

        <div className="avf-more">
          <button
            type="button"
            className="avf-more-toggle"
            aria-expanded={showMore}
            onClick={(event) => {
              event.stopPropagation();
              setShowMore((open) => !open);
            }}
          >
            <span>More details</span>
            <small>{moreHint}</small>
            <svg className={showMore ? 'is-open' : ''} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showMore && (
            <div className="avf-more-body">
              <div className="avf-pair">
                <Field label="City" htmlFor={fieldIds.city}>
                  <AutocompleteInput id={fieldIds.city} name="city" value={formData.city} onChange={handleInputChange} suggestions={suggestions.cities} className="avf-input" placeholder="City, state" />
                </Field>
                <Field label="Address" htmlFor={fieldIds.coffee_shop_address}>
                  <input id={fieldIds.coffee_shop_address} name="coffee_shop_address" value={formData.coffee_shop_address} onChange={(event) => {
                    handleInputChange(event);
                    setFormData((prev) => ({ ...prev, shop_id: null, coffee_shop_place_id: '', coffee_shop_lat: '', coffee_shop_lng: '' }));
                  }} className="avf-input" placeholder="Street address" />
                </Field>
              </div>
              {!isHomeStop && (
                <div className="avf-pair">
                  <Field label="Sport" htmlFor={showCustomSport ? fieldIds.customSport : fieldIds.sport}>
                    {showCustomSport ? (
                      <input
                        id={fieldIds.customSport}
                        name="sport"
                        type="text"
                        value={formData.sport}
                        onChange={handleInputChange}
                        placeholder="Sport name"
                        className="avf-input"
                        autoFocus
                        enterKeyHint="next"
                        autoCapitalize="words"
                      />
                    ) : (
                      <select id={fieldIds.sport} name="sport" value={formData.sport} onChange={handleInputChange} className="avf-input avf-select">
                        <option value="">None</option>
                        <option value="Men's Basketball">Men's Basketball</option>
                        <option value="Men's Hockey">Men's Hockey</option>
                        <option value="Football">Football</option>
                        <option value="Track & Field">Track & Field</option>
                        <option value="Cross Country">Cross Country</option>
                        <option value="__custom__">+ Add sport</option>
                      </select>
                    )}
                  </Field>
                  <Field label="Event or opponent" htmlFor={fieldIds.opponent}>
                    <AutocompleteInput id={fieldIds.opponent} name="opponent" value={formData.opponent} onChange={handleInputChange} suggestions={suggestions.opponents} className="avf-input" placeholder={/Cross Country|Track/.test(formData.sport) ? 'Meet or event' : 'Opponent'} />
                  </Field>
                </div>
              )}
              <Field label="Note" htmlFor={fieldIds.notes}>
                <textarea id={fieldIds.notes} name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="avf-input avf-textarea" placeholder="Anything worth remembering" enterKeyHint="done" />
              </Field>
            </div>
          )}
        </div>

        <div className="avf-actions safe-bottom">
          {errors.submit && <p className="alert-error" role="alert">{errors.submit}</p>}
          <div className="avf-save-row">
            <div className="avf-total" aria-live="polite">
              <span className="avf-total-label">Total</span>
              <span className="avf-total-value"><strong>{total ?? '–'}</strong><small>/ 20</small></span>
            </div>
            <button type="submit" disabled={uploading || locating} className="avf-submit">
              {uploading ? 'Saving…' : locating ? 'Finding the shop…' : isEditing ? 'Save changes' : 'Save visit'}
            </button>
          </div>
        </div>
      </form>

      {cropping && imageToCrop && (
        <PhotoCropper imageUrl={imageToCrop} onComplete={handleCropComplete} onCancel={handleCropCancel} />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function RepeatContextPanel({ context }) {
  const lastVisitDate = context.lastVisit?.date
    ? formatDate(context.lastVisit.date, { month: 'short', day: 'numeric' })
    : null;
  const bestScore = Number.isFinite(Number(context.bestVisit?.composite_score))
    ? Number(context.bestVisit.composite_score).toFixed(1)
    : null;

  return (
    <div className="repeat-context px-4 py-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-ink-soft">
            Previous visits
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            Visit {context.visitNumber} to this shop
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-ink-soft">
          {lastVisitDate && (
            <span className="rounded-full bg-surface-raised px-2.5 py-1">
              Last: {lastVisitDate}
            </span>
          )}
          {context.lastVisit?.coffee_order && (
            <span className="rounded-full bg-surface-raised px-2.5 py-1">
              {titleCaseOrder(context.lastVisit.coffee_order)}
            </span>
          )}
          {bestScore && (
            <span className="rounded-full bg-surface-raised px-2.5 py-1">
              Best: {bestScore}/20
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, error, children }) {
  return (
    <div className="avf-field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <p id={`${htmlFor}-error`} className="avf-error" role="alert">{error}</p>}
    </div>
  );
}
