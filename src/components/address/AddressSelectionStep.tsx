/**
 * Address Selection Step Component
 * 
 * STRICT IMPLEMENTATION:
 * 1. Show saved addresses first (if any)
 * 2. OR show GPS location picker
 * 3. After GPS selection, show address form
 * 4. No manual entry without GPS
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { GPSLocationPicker } from './GPSLocationPicker';
import { AddressForm, AddressFormData } from './AddressForm';
import { SavedAddresses } from './SavedAddresses';
import { getUserAddresses, createAddress, deleteAddress } from '@/lib/address-service';
import { DeliveryAddress, GPSCoordinates, ReverseGeocodingResult } from '@/types/address';

interface AddressSelectionStepProps {
  onAddressSelected: (address: DeliveryAddress) => void;
  userPhone?: string;
}

export function AddressSelectionStep({ onAddressSelected, userPhone }: AddressSelectionStepProps) {
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddNew, setShowAddNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // GPS Selection State
  const [gpsSelected, setGpsSelected] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<GPSCoordinates | null>(null);
  const [geocodedAddress, setGeocodedAddress] = useState<ReverseGeocodingResult | null>(null);

  // Load addresses on mount
  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const data = await getUserAddresses();
      setAddresses(data);
      
      // Auto-select default address if exists
      const defaultAddress = data.find(a => a.isDefault);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelected = (coordinates: GPSCoordinates, address: ReverseGeocodingResult) => {
    setGpsCoordinates(coordinates);
    setGeocodedAddress(address);
    setGpsSelected(true);
  };

  const handleFormSubmit = async (formData: AddressFormData) => {
    if (!gpsCoordinates) return;

    try {
      setIsSubmitting(true);

      const newAddress = await createAddress({
        label: formData.label,
        latitude: gpsCoordinates.latitude,
        longitude: gpsCoordinates.longitude,
        street: formData.street,
        neighborhood: formData.neighborhood,
        addressDetails: formData.addressDetails,
        contactPhone: formData.contactPhone,
        isDefault: formData.isDefault,
      });

      // Reload addresses
      await loadAddresses();

      // Select the new address
      setSelectedAddress(newAddress);

      // Reset add new state
      setShowAddNew(false);
      setGpsSelected(false);
      setGpsCoordinates(null);
      setGeocodedAddress(null);
    } catch (error) {
      console.error('Error creating address:', error);
      alert('حدث خطأ أثناء حفظ العنوان. الرجاء المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await deleteAddress(addressId);
      await loadAddresses();
      
      // Clear selection if deleted address was selected
      if (selectedAddress?.id === addressId) {
        setSelectedAddress(null);
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      alert('حدث خطأ أثناء حذف العنوان.');
    }
  };

  const handleContinue = () => {
    if (selectedAddress) {
      onAddressSelected(selectedAddress);
    }
  };

  const handleCancelAddNew = () => {
    setShowAddNew(false);
    setGpsSelected(false);
    setGpsCoordinates(null);
    setGeocodedAddress(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          تحديد عنوان التوصيل
        </h2>
        <p className="text-gray-600">
          اختر عنواناً محفوظاً أو أضف عنواناً جديداً باستخدام GPS
        </p>
      </div>

      {/* Main Content */}
      {!showAddNew ? (
        <>
          {/* Saved Addresses */}
          {addresses.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">عناوينك المحفوظة</h3>
              <SavedAddresses
                addresses={addresses}
                selectedAddressId={selectedAddress?.id}
                onSelect={setSelectedAddress}
                onDelete={handleDeleteAddress}
                showActions
              />
            </div>
          )}

          {/* Add New Address Button */}
          <button
            onClick={() => setShowAddNew(true)}
            className="w-full py-4 px-6 border-2 border-dashed border-gray-300 hover:border-blue-500 text-gray-600 hover:text-blue-500 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة عنوان جديد</span>
          </button>

          {/* Continue Button */}
          {selectedAddress && (
            <button
              onClick={handleContinue}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              متابعة إلى معلومات الدفع
            </button>
          )}
        </>
      ) : (
        <>
          {/* Add New Address Flow */}
          {!gpsSelected ? (
            <>
              <GPSLocationPicker onLocationSelected={handleLocationSelected} />
              
              {addresses.length > 0 && (
                <button
                  onClick={handleCancelAddNew}
                  className="w-full py-3 px-6 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200"
                >
                  إلغاء
                </button>
              )}
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  ✅ تم تحديد موقعك بنجاح!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {geocodedAddress?.formattedAddress}
                </p>
              </div>

              {gpsCoordinates && geocodedAddress && (
                <AddressForm
                  coordinates={gpsCoordinates}
                  geocodedAddress={geocodedAddress}
                  userPhone={userPhone}
                  onSubmit={handleFormSubmit}
                  isSubmitting={isSubmitting}
                />
              )}

              <button
                onClick={handleCancelAddNew}
                className="w-full py-3 px-6 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200"
              >
                إلغاء
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}