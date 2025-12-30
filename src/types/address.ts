/**
 * Address System Types
 * Strict GPS-based address validation for delivery
 */

export type AddressLabel = 'home' | 'work' | 'gym' | 'school' | 'other';

export interface UserAddress {
  id: string;
  user_id: string;
  
  // Address Label
  label: AddressLabel;
  
  // GPS Coordinates (REQUIRED)
  latitude: number;
  longitude: number;
  
  // Auto-filled from reverse geocoding
  street: string;
  neighborhood?: string;
  city: string; // Default: Damascus
  
  // User-provided details
  address_details: string; // Building, floor, landmark
  alternative_phone?: string;
  
  // Metadata
  is_default: boolean;
  is_active: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface GeocodingResult {
  street: string;
  neighborhood?: string;
  city: string;
  formatted_address: string;
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface CreateAddressInput {
  label: AddressLabel;
  latitude: number;
  longitude: number;
  street: string;
  neighborhood?: string;
  city: string;
  address_details: string;
  alternative_phone?: string;
  is_default?: boolean;
}

export interface UpdateAddressInput extends Partial<CreateAddressInput> {
  id: string;
}
