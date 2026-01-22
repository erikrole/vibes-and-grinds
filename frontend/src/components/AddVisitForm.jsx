import { useState } from 'react';
import PlacesAutocomplete from './PlacesAutocomplete';

export default function AddVisitForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    coffee_shop_name: '',
    coffee_shop_address: '',
    coffee_shop_place_id: '',
    coffee_shop_lat: null,
    coffee_shop_lng: null,
    coffee_order: '',
    vibe_rating: '',
    coffee_rating: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});

  const handlePlaceSelected = (place) => {
    setFormData({
      ...formData,
      coffee_shop_name: place.name,
      coffee_shop_address: place.address,
      coffee_shop_place_id: place.place_id,
      coffee_shop_lat: place.lat,
      coffee_shop_lng: place.lng,
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

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
      <h2 className="text-2xl font-bold mb-6">Add Coffee Shop Visit</h2>

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
            Coffee Shop <span className="text-red-500">*</span>
          </label>
          <PlacesAutocomplete
            value={formData.coffee_shop_name}
            onChange={handleInputChange}
            onPlaceSelected={handlePlaceSelected}
          />
          {errors.coffee_shop_name && (
            <p className="text-red-500 text-sm mt-1">{errors.coffee_shop_name}</p>
          )}
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
            placeholder="e.g., Cappuccino, Flat White"
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
              placeholder="7.5"
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
              placeholder="8.0"
              className="input-field"
            />
            {errors.coffee_rating && (
              <p className="text-red-500 text-sm mt-1">{errors.coffee_rating}</p>
            )}
          </div>
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
            placeholder="Any additional thoughts..."
            rows="3"
            className="input-field resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button type="submit" className="btn-primary flex-1">
            Add Visit
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
