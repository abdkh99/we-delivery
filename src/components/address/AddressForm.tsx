/**
 * Address Form Component
 * 
 * Displayed AFTER GPS location is selected
 * Allows user to:
 * - Choose address label (home, work, etc.)
 * - Edit street name if needed
 * - Add detailed directions for driver
 * - Add optional contact phone
 */

'use client';

import { useState, useEffect } from 'react';
import { Home, Briefcase, Dumbbell, GraduationCap, MapPin, Phone } from 'lucide-react';
import { AddressLabel, GPSCoordinates, ReverseGeocodingResult } from '@/types/address';

interface AddressFormProps {
  coordinates: GPSCoordinates;
  geocodedAddress: ReverseGeocodingResult;
  userPhone?: string;
  onSubmit: (data: AddressFormData) => void;
  isSubmitting?: boolean;
}

export interface AddressFormData {
  label: AddressLabel;
  street: string;
  neighborhood?: string;
  addressDetails: string;
  contactPhone?: string;
  isDefault: boolean;
}

const LABEL_OPTIONS: Array<{
  value: AddressLabel;
  label: string;
  icon: React.ComponentType<any>;
}> = [
  { value: 'home', label: 'المنزل', icon: Home },
  { value: 'work', label: 'العمل', icon: Briefcase },
  { value: 'gym', label: 'النادي الرياضي', icon: Dumbbell },
  { value: 'school', label: 'المدرسة/الجامعة', icon: GraduationCap },
  { value: 'other', label: 'أخرى', icon: MapPin },
];

export function AddressForm({
  coordinates,
  geocodedAddress,
  userPhone,
  onSubmit,
  isSubmitting = false,
}: AddressFormProps) {
  const [formData, setFormData] = useState<AddressFormData>({
    label: 'home',
    street: geocodedAddress.street,
    neighborhood: geocodedAddress.neighborhood,
    addressDetails: '',
    contactPhone: userPhone,
    isDefault: false,
  });

  // Update street when geocoded address changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      street: geocodedAddress.street,
      neighborhood: geocodedAddress.neighborhood,
    }));
  }, [geocodedAddress]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Address Label Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          نوع العنوان <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {LABEL_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, label: value }))}
              className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                formData.label === value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* City (Read-only) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          المدينة
        </label>
        <input
          type="text"
          value="دمشق"
          disabled
          className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 cursor-not-allowed"
        />
      </div>

      {/* Street (Auto-filled, Editable) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          اسم الشارع <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.street}
          onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
          placeholder="شارع..."
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
        <p className="mt-1 text-xs text-gray-500">
          تم ملء هذا الحقل تلقائياً من GPS، يمكنك تعديله إذا لزم الأمر
        </p>
      </div>

      {/* Neighborhood (Optional) */}
      {formData.neighborhood && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الحي
          </label>
          <input
            type="text"
            value={formData.neighborhood}
            onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      )}

      {/* Address Details (Required) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          تفاصيل العنوان <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.addressDetails}
          onChange={(e) => setFormData(prev => ({ ...prev, addressDetails: e.target.value }))}
          placeholder="مثال: البناء 2، الطابق 1، بجانب الصيدلية"
          required
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          أضف تفاصيل واضحة لمساعدة السائق في الوصول إلى موقعك
        </p>
      </div>

      {/* Contact Phone (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Phone className="inline w-4 h-4 mr-1" />
          رقم الهاتف (اختياري)
        </label>
        <input
          type="tel"
          value={formData.contactPhone || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
          placeholder="05X XXX XXXX"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
        <p className="mt-1 text-xs text-gray-500">
          {userPhone
            ? 'رقمك الحالي مضاف تلقائياً، يمكنك تغييره إذا أردت'
            : 'أضف رقم هاتف بديل للتواصل (اختياري)'}
        </p>
      </div>

      {/* Set as Default */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isDefault"
          checked={formData.isDefault}
          onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="isDefault" className="mr-2 text-sm text-gray-700">
          تعيين كعنوان افتراضي
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'جاري الحفظ...' : 'حفظ العنوان'}
      </button>
    </form>
  );
}