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

export default function AddVisitForm({ onSubmit, onCancel, initialData = null, visits = [] }) {
  const isEditing = Boolean(initialData);

  const suggestions = useMemo(() => {
    return {
      coffeeShops: [...new Set(visits.map((v) => v.coffee_shop_name).filter(Boolean))].sort(),
      cities: [...new Set(visits.map((v) => v.city).filter(Boolean))].sort(),
      opponents: [...new Set(visits.map((v) => v.opponent).filter(Boolean))].sort(),
      orders: [...new Set(visits.map((v) => v.coffee_order).filter(Boolean))].sort(),
    };
  }, [visits]);

  const getLocalDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
      if (matchedTeam && !formData.opponent) {
        updates.opponent = matchedTeam;
      }
    }

    setFormData({ ...formData, ...updates });

    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const extractCityFromAddress = (address = '') => {
    const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 3) {
      return `${parts[parts.length - 3]}, ${parts[parts.length - 2].split(' ')[0]}`;
    }
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
      if (matchedTeam && !formData.opponent) {
        updates.opponent = matchedTeam;
      }
    }

    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result);
      setCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedFile) => {
    setCropping(false);
    setImageToCrop(null);
    setPhotoFile(croppedFile);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(croppedFile);
  };

  const handleCropCancel = () => {
    setCropping(false);
    setImageToCrop(null);
  };

  const handleRecropPhoto = () => {
    if (photoPreview) {
      setImageToCrop(photoPreview);
      setCropping(true);
    }
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
    if (isNaN(vibeRating) || vibeRating < 0 || vibeRating > 10) {
      newErrors.vibe_rating = 'Vibe rating must be between 0 and 10';
    }

    const coffeeRating = parseFloat(formData.coffee_rating);
    if (isNaN(coffeeRating) || coffeeRating < 0 || coffeeRating > 10) {
      newErrors.coffee_rating = 'Coffee rating must be between 0 and 10';
    }

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

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload photo');
        }

        const { url } = await response.json();
        photoUrl = url;
      }

      const submitData = {
        ...formData,
        vibe_rating: parseFloat(formData.vibe_rating),
        coffee_rating: parseFloat(formData.coffee_rating),
        photo_url: photoUrl,
      };

      onSubmit(submitData);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setErrors({ ...errors, photo: 'Failed to upload photo. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 pr-8">
        <h2 className="coffee-shop-name text-4xl md:text-5xl">{isEditing ? 'Edit Visit' : 'Add Visit'}</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">
          Capture the shop, the matchup, and how it scored. <span className="text-red-500">*</span> required
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSection title="Visit basics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Date" required error={errors.date}>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="input-field"
              />
            </Field>

            <Field label="Sport">
              <select
                name="sport"
                value={formData.sport}
                onChange={handleInputChange}
                className="input-field"
              >
                <option value="">Select a sport</option>
                <option value="Men's Basketball">Men's Basketball</option>
                <option value="Football">Football</option>
                <option value="Track & Field">Track & Field</option>
                <option value="Cross Country">Cross Country</option>
              </select>
            </Field>
          </div>

          <Field label="Coffee shop name" required error={errors.coffee_shop_name}>
            <PlacesAutocomplete
              value={formData.coffee_shop_name}
              onChange={(e) => handleInputChange({ target: { name: 'coffee_shop_name', value: e.target.value } })}
              onPlaceSelected={handlePlaceSelected}
            />
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Use Google Places suggestions for best address/location autofill.</p>
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="City">
              <AutocompleteInput
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                suggestions={suggestions.cities}
                className="input-field"
              />
            </Field>

            <Field label="Opponent">
              <AutocompleteInput
                name="opponent"
                value={formData.opponent}
                onChange={handleInputChange}
                suggestions={suggestions.opponents}
                className="input-field"
              />
            </Field>
          </div>

          <Field label="Address">
            <input
              type="text"
              name="coffee_shop_address"
              value={formData.coffee_shop_address}
              onChange={handleInputChange}
              className="input-field"
            />
          </Field>
        </FormSection>

        <FormSection title="Order + ratings">
          <Field label="Coffee order">
            <AutocompleteInput
              name="coffee_order"
              value={formData.coffee_order}
              onChange={handleInputChange}
              suggestions={suggestions.orders}
              className="input-field"
              placeholder="e.g. Iced Salted Caramel Latte"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Vibe rating (0-10)" required error={errors.vibe_rating}>
              <input
                type="number"
                name="vibe_rating"
                value={formData.vibe_rating}
                onChange={handleInputChange}
                step="0.1"
                min="0"
                max="10"
                className="input-field rating-number"
                inputMode="decimal"
                autoComplete="off"
              />
            </Field>

            <Field label="Coffee rating (0-10)" required error={errors.coffee_rating}>
              <input
                type="number"
                name="coffee_rating"
                value={formData.coffee_rating}
                onChange={handleInputChange}
                step="0.1"
                min="0"
                max="10"
                className="input-field rating-number"
                inputMode="decimal"
                autoComplete="off"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Photo + notes">
          <Field label="Photo" error={errors.photo}>
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-52 object-cover rounded-lg border border-stone-300 dark:border-stone-600"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleRecropPhoto}
                    className="bg-stone-600 text-white rounded-full p-2 hover:bg-stone-700 transition-colors shadow-lg"
                    title="Recrop photo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg"
                    title="Remove photo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-52 border-2 border-stone-300 dark:border-stone-600 border-dashed rounded-lg cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-10 h-10 mb-3 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm text-stone-500 dark:text-stone-400">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">PNG, JPG, HEIC (MAX. 10MB)</p>
                </div>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            )}
          </Field>

          <Field label="Notes">
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="4"
              className="input-field resize-none"
              placeholder="What stood out about this stop?"
            />
          </Field>
        </FormSection>

        <div className="sticky bottom-0 z-10 bg-white/95 dark:bg-stone-800/95 backdrop-blur border-t border-stone-200 dark:border-stone-700 pt-4 mt-2">
          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex-1" disabled={uploading}>
              {uploading ? 'Uploading...' : isEditing ? 'Save Changes' : 'Add Visit'}
            </button>
            <button type="button" onClick={onCancel} className="btn-secondary" disabled={uploading}>
              Cancel
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

function FormSection({ title, children }) {
  return (
    <section className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-900/30 p-4 sm:p-5 space-y-4">
      <h3 className="text-sm uppercase tracking-wide font-semibold text-stone-600 dark:text-stone-300">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, required = false, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
        {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
}
