/**
 * Address Service
 * 
 * Handles all address CRUD operations with Supabase
 */

import { createClient } from '@/lib/supabase/client';
import {
  DeliveryAddress,
  CreateAddressInput,
  UpdateAddressInput,
} from '@/types/address';

const supabase = createClient();

/**
 * Get all addresses for current user
 */
export async function getUserAddresses(): Promise<DeliveryAddress[]> {
  const { data, error } = await supabase
    .from('delivery_addresses')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching addresses:', error);
    throw error;
  }
  
  return (data || []).map(mapToDeliveryAddress);
}

/**
 * Get default address
 */
export async function getDefaultAddress(): Promise<DeliveryAddress | null> {
  const { data, error } = await supabase
    .from('delivery_addresses')
    .select('*')
    .eq('is_default', true)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No default address found
      return null;
    }
    console.error('Error fetching default address:', error);
    throw error;
  }
  
  return data ? mapToDeliveryAddress(data) : null;
}

/**
 * Get address by ID
 */
export async function getAddressById(id: string): Promise<DeliveryAddress | null> {
  const { data, error } = await supabase
    .from('delivery_addresses')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching address:', error);
    return null;
  }
  
  return data ? mapToDeliveryAddress(data) : null;
}

/**
 * Create new address
 */
export async function createAddress(
  input: CreateAddressInput
): Promise<DeliveryAddress> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  // Validate input
  validateCreateInput(input);
  
  // Prepare data
  const addressData = {
    user_id: user.id,
    label: input.label,
    latitude: input.latitude,
    longitude: input.longitude,
    city: 'Damascus', // Always Damascus
    street: input.street,
    neighborhood: input.neighborhood,
    address_details: input.addressDetails,
    contact_phone: input.contactPhone,
    is_default: input.isDefault || false,
  };
  
  const { data, error } = await supabase
    .from('delivery_addresses')
    .insert(addressData)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating address:', error);
    throw error;
  }
  
  return mapToDeliveryAddress(data);
}

/**
 * Update address
 */
export async function updateAddress(
  id: string,
  input: UpdateAddressInput
): Promise<DeliveryAddress> {
  // Prepare update data
  const updateData: any = {};
  
  if (input.label !== undefined) updateData.label = input.label;
  if (input.street !== undefined) updateData.street = input.street;
  if (input.neighborhood !== undefined) updateData.neighborhood = input.neighborhood;
  if (input.addressDetails !== undefined) updateData.address_details = input.addressDetails;
  if (input.contactPhone !== undefined) updateData.contact_phone = input.contactPhone;
  if (input.isDefault !== undefined) updateData.is_default = input.isDefault;
  
  const { data, error } = await supabase
    .from('delivery_addresses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating address:', error);
    throw error;
  }
  
  return mapToDeliveryAddress(data);
}

/**
 * Delete address
 */
export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase
    .from('delivery_addresses')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting address:', error);
    throw error;
  }
}

/**
 * Set default address
 */
export async function setDefaultAddress(id: string): Promise<void> {
  // The database trigger will automatically unset other default addresses
  await updateAddress(id, { isDefault: true });
}

/**
 * Helper: Map database record to DeliveryAddress
 */
function mapToDeliveryAddress(data: any): DeliveryAddress {
  return {
    id: data.id,
    userId: data.user_id,
    label: data.label,
    latitude: parseFloat(data.latitude),
    longitude: parseFloat(data.longitude),
    city: data.city,
    street: data.street,
    neighborhood: data.neighborhood,
    addressDetails: data.address_details,
    contactPhone: data.contact_phone,
    isDefault: data.is_default,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Helper: Validate create input
 */
function validateCreateInput(input: CreateAddressInput): void {
  if (!input.label) {
    throw new Error('Address label is required');
  }
  
  if (!input.latitude || !input.longitude) {
    throw new Error('GPS coordinates are required');
  }
  
  if (!input.street) {
    throw new Error('Street name is required');
  }
  
  if (!input.addressDetails) {
    throw new Error('Address details are required');
  }
  
  // Validate coordinates
  if (input.latitude < -90 || input.latitude > 90) {
    throw new Error('Invalid latitude');
  }
  
  if (input.longitude < -180 || input.longitude > 180) {
    throw new Error('Invalid longitude');
  }
}