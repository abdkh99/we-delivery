/**
 * Address Manager Component
 * Main component for managing user addresses
 */

'use client';

import { useState, useEffect } from 'react';
import type { UserAddress, CreateAddressInput } from '@/types/address';
import { GPSLocationPicker } from './GPSLocationPicker';
import { AddressForm } from './AddressForm';
import { SavedAddressesList } from './SavedAddressesList';
import { Plus, Loader2 } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface AddressManagerProps {
  mode?: 'selection' | 'management'; // selection for checkout, management for profile
  onAddressSelected?: (address: UserAddress) => void;
  selectedAddressId?: string;
}

type Step = 'list' | 'gps' | 'form';

export function AddressManager({
  mode = 'management',
  onAddressSelected,
  selectedAddressId,
}: AddressManagerProps) {
  const [step, setStep] = useState<Step>('list');
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpsData, setGpsData] = useState<any>(null);
  const [userPhone, setUserPhone] = useState<string>('');

  const supabase = createClientComponentClient();

  // Load addresses and user data
  useEffect(() => {
    loadAddresses();
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('phone')
        .eq('id', user.id)
        .single();

      if (userData?.phone) {
        setUserPhone(userData.phone);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const loadAddresses = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAddresses(data || []);
    } catch (err: any) {
      console.error('Error loading addresses:', err);
      setError(err.message || 'Failed to load addresses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGPSLocationSelected = (locationData: any) => {
    setGpsData(locationData);
    setStep('form');
  };

  const handleSaveAddress = async (formData: CreateAddressInput) => {
    try {
      setIsSaving(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error: insertError } = await supabase
        .from('user_addresses')
        .insert({
          user_id: user.id,
          ...formData,
        });

      if (insertError) throw insertError;

      // Reload addresses
      await loadAddresses();

      // Reset to list view
      setStep('list');
      setGpsData(null);
    } catch (err: any) {
      console.error('Error saving address:', err);
      setError(err.message || 'Failed to save address');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId);

      if (deleteError) throw deleteError;

      // Reload addresses
      await loadAddresses();
    } catch (err: any) {
      console.error('Error deleting address:', err);
      alert(err.message || 'Failed to delete address');
    }
  };

  const handleAddressSelect = (address: UserAddress) => {
    if (onAddressSelected) {
      onAddressSelected(address);
    }
  };

  const handleCancel = () => {
    setStep('list');
    setGpsData(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* List View */}
      {step === 'list' && (
        <div className="space-y-4">
          {/* Saved Addresses */}
          <SavedAddressesList
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            onSelect={handleAddressSelect}
            onDelete={mode === 'management' ? handleDeleteAddress : undefined}
            isLoading={isSaving}
          />

          {/* Add New Address Button */}
          <button
            onClick={() => setStep('gps')}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg font-medium hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Address
          </button>
        </div>
      )}

      {/* GPS Selection Step */}
      {step === 'gps' && (
        <div className="space-y-4">
          <GPSLocationPicker onLocationSelected={handleGPSLocationSelected} />
          <button
            onClick={handleCancel}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Form Step */}
      {step === 'form' && gpsData && (
        <AddressForm
          initialData={gpsData}
          userPhone={userPhone}
          onSubmit={handleSaveAddress}
          onCancel={handleCancel}
          isLoading={isSaving}
        />
      )}
    </div>
  );
}
