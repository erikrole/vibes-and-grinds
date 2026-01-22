import { useState } from 'react';

// Big Ten city to team mapping
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

export default function AddVisitForm({ onSubmit, onCancel, initialData = null }) {
  const isEditing = Boolean(initialData);

  // Get today's date in local timezone
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updates = { [name]: value };

    // Auto-fill opponent when city changes
    if (name === 'city' && value) {
      const cityLower = value.toLowerCase().trim();
      const matchedTeam = BIG_TEN_TEAMS[cityLower];
      if (matchedTeam && !formData.opponent) {
        updates.opponent = matchedTeam;
      }
    }

    setFormData({ ...formData, ...updates });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
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

    if (!validate()) {
      return;
    }

    setUploading(true);

    try {
      let photoUrl = formData.photo_url;

      // Upload photo if there's a new file
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
    <div className="card">
      <h2 className="text-2xl font-bold mb-6">
        {isEditing ? 'Edit Visit' : 'Add Visit'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className="input-field"
          />
          {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
        </div>

        {/* Coffee Shop */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Coffee Shop Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="coffee_shop_name"
            value={formData.coffee_shop_name}
            onChange={handleInputChange}
            className="input-field"
          />
          {errors.coffee_shop_name && (
            <p className="text-red-500 text-sm mt-1">{errors.coffee_shop_name}</p>
          )}
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            className="input-field"
          />
        </div>

        {/* Opponent */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Opponent
          </label>
          <input
            type="text"
            name="opponent"
            value={formData.opponent}
            onChange={handleInputChange}
            className="input-field"
          />
        </div>

        {/* Sport */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sport
          </label>
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
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            name="coffee_shop_address"
            value={formData.coffee_shop_address}
            onChange={handleInputChange}
            className="input-field"
          />
        </div>

        {/* Coffee Order */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Coffee Order
          </label>
          <input
            type="text"
            name="coffee_order"
            value={formData.coffee_order}
            onChange={handleInputChange}
            className="input-field"
          />
        </div>

        {/* Ratings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vibe Rating (0-10) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="vibe_rating"
              value={formData.vibe_rating}
              onChange={handleInputChange}
              step="0.1"
              min="0"
              max="10"
              className="input-field"
            />
            {errors.vibe_rating && (
              <p className="text-red-500 text-sm mt-1">{errors.vibe_rating}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coffee Rating (0-10) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="coffee_rating"
              value={formData.coffee_rating}
              onChange={handleInputChange}
              step="0.1"
              min="0"
              max="10"
              className="input-field"
            />
            {errors.coffee_rating && (
              <p className="text-red-500 text-sm mt-1">{errors.coffee_rating}</p>
            )}
          </div>
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photo
          </label>
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg border border-stone-300"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-stone-300 border-dashed rounded-lg cursor-pointer hover:bg-stone-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-10 h-10 mb-3 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mb-2 text-sm text-stone-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-stone-400">PNG, JPG, HEIC (MAX. 10MB)</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          )}
          {errors.photo && (
            <p className="text-red-500 text-sm mt-1">{errors.photo}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows="3"
            className="input-field resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button type="submit" className="btn-primary flex-1" disabled={uploading}>
            {uploading ? 'Uploading...' : isEditing ? 'Save Changes' : 'Add Visit'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary" disabled={uploading}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
