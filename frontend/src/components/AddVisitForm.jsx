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

  const [formData, setFormData] = useState(
    initialData || {
      date: new Date().toISOString().split('T')[0'),
      coffee_shop_name: '',
      city: '',
      opponent: '',
      coffee_shop_address: '',
      coffee_order: '',
      vibe_rating: '',
      coffee_rating: '',
      notes: '',
      photo_url: '',
    }
  );

  const [errors, setErrors] = useState({});

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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const submitData = {
      ...formData,
      vibe_rating: parseFloat(formData.vibe_rating),
      coffee_rating: parseFloat(formData.coffee_rating),
    };

    onSubmit(submitData);
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

        {/* Photo URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photo URL
          </label>
          <input
            type="url"
            name="photo_url"
            value={formData.photo_url}
            onChange={handleInputChange}
            className="input-field"
          />
          <p className="text-xs text-stone-500 mt-1">Paste a URL to a photo of the coffee shop or your order</p>
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
          <button type="submit" className="btn-primary flex-1">
            {isEditing ? 'Save Changes' : 'Add Visit'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
