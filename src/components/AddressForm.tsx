/**
 * Address Form Component
 * Shows ONLY after GPS location is selected
 */

'use client';

import { useState } from 'react';
import type { AddressLabel, CreateAddressInput } from '@/types/address';
import { MapPin, Phone, Home, Briefcase, Dumbbell, GraduationCap, MapPinned } from 'lucide-react';

interface AddressFormProps {
  initialData: {
    latitude: number;
    longitude: number;
    street: string;
    neighborhood?: string;
    city: string;
  };
  userPhone?: string;
  onSubmit: (data: CreateAddressInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const ADDRESS_LABELS: { value: AddressLabel; label: string; icon: typeof Home }[] = [
  { value: 'home', label: 'Home', icon: Home },
  { value: 'work', label: 'Work', icon: Briefcase },
  { value: 'gym', label: 'Gym', icon: Dumbbell },
  { value: 'school', label: 'School', icon: GraduationCap },
  { value: 'other', label: 'Other', icon: MapPinned },
];

export function AddressForm({
  initialData,
  userPhone,
  onSubmit,
  onCancel,
  isLoading = false,
}: AddressFormProps) {
  const [formData, setFormData] = useState<CreateAddressInput>({
    label: 'home',
    latitude: initialData.latitude,
    longitude: initialData.longitude,
    street: initialData.street,
    neighborhood: initialData.neighborhood,
    city: initialData.city,
    address_details: '',
    alternative_phone: userPhone || '',
    is_default: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.street.trim()) {
      newErrors.street = 'Street name is required';
    }

    if (!formData.address_details.trim()) {
      newErrors.address_details = 'Address details are required (building, floor, landmark)';
    } else if (formData.address_details.trim().length < 10) {
      newErrors.address_details = 'Please provide more detailed instructions (at least 10 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* GPS Location Info (Read-only) */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 mb-1">GPS Location</p>
            <p className="text-xs text-blue-700">
              {initialData.latitude.toFixed(6)}, {initialData.longitude.toFixed(6)}
            </p>
          </div>
        </div>
      </div>

      {/* Address Label Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Address Label *
        </label>
        <div className="grid grid-cols-5 gap-2">
          {ADDRESS_LABELS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormData({ ...formData, label: value })}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                formData.label === value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* City (Read-only) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          City
        </label>
        <input
          type="text"
          value={formData.city}
          readOnly
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
        />
      </div>

      {/* Street (Editable) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Street *
        </label>
        <input
          type="text"
          value={formData.street}
          onChange={(e) => setFormData({ ...formData, street: e.target.value })}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.street ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., Aklaaseh Street"
        />
        {errors.street && (
          <p className="mt-1 text-sm text-red-600">{errors.street}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Auto-filled from GPS, but you can edit if needed
        </p>
      </div>

      {/* Neighborhood (Optional) */}
      {formData.neighborhood && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Neighborhood
          </label>
          <input
            type="text"
            value={formData.neighborhood}
            onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Address Details (REQUIRED) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address Details *
        </label>
        <textarea
          value={formData.address_details}
          onChange={(e) => setFormData({ ...formData, address_details: e.target.value })}
          rows={3}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.address_details ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Building 2, Floor 1, near the pharmacy"
        />
        {errors.address_details && (
          <p className="mt-1 text-sm text-red-600">{errors.address_details}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Please provide clear instructions for the driver
        </p>
      </div>

      {/* Alternative Phone (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contact Number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="tel"
            value={formData.alternative_phone}
            onChange={(e) => setFormData({ ...formData, alternative_phone: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optional alternative number"
          />
        </div>
        {userPhone && (
          <p className="mt-1 text-xs text-gray-500">
            Default: {userPhone}
          </p>
        )}
      </div>

      {/* Set as Default */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_default"
          checked={formData.is_default}
          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="is_default" className="text-sm text-gray-700">
          Set as default address
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Saving...' : 'Save Address'}
        </button>
      </div>
    </form>
  );
}
