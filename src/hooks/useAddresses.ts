/**
 * Custom Hook for Address Management
 * 
 * Provides easy access to address operations with SWR caching
 */

'use client';

import useSWR from 'swr';
import {
  getUserAddresses,
  getDefaultAddress,
  createAddress as createAddressService,
  updateAddress as updateAddressService,
  deleteAddress as deleteAddressService,
  setDefaultAddress as setDefaultAddressService,
} from '@/lib/address-service';
import { DeliveryAddress, CreateAddressInput, UpdateAddressInput } from '@/types/address';

/**
 * Get all addresses for current user
 */
export function useAddresses() {
  const { data, error, mutate } = useSWR<DeliveryAddress[]>(
    'user-addresses',
    getUserAddresses,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    addresses: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

/**
 * Get default address
 */
export function useDefaultAddress() {
  const { data, error, mutate } = useSWR<DeliveryAddress | null>(
    'default-address',
    getDefaultAddress,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    defaultAddress: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

/**
 * Address operations with automatic cache updates
 */
export function useAddressOperations() {
  const { mutate: mutateAddresses } = useAddresses();
  const { mutate: mutateDefault } = useDefaultAddress();

  const createAddress = async (input: CreateAddressInput) => {
    const newAddress = await createAddressService(input);
    
    // Revalidate caches
    await mutateAddresses();
    if (input.isDefault) {
      await mutateDefault();
    }
    
    return newAddress;
  };

  const updateAddress = async (id: string, input: UpdateAddressInput) => {
    const updatedAddress = await updateAddressService(id, input);
    
    // Revalidate caches
    await mutateAddresses();
    if (input.isDefault) {
      await mutateDefault();
    }
    
    return updatedAddress;
  };

  const deleteAddress = async (id: string) => {
    await deleteAddressService(id);
    
    // Revalidate caches
    await mutateAddresses();
    await mutateDefault();
  };

  const setDefaultAddress = async (id: string) => {
    await setDefaultAddressService(id);
    
    // Revalidate caches
    await mutateAddresses();
    await mutateDefault();
  };

  return {
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  };
}