/**
 * GPS-Based Address System Types
 * 
 * STRICT RULES:
 * - All addresses MUST have GPS coordinates
 * - No manual address creation without GPS
 * - City is always "Damascus"
 */

export type AddressLabel = 'home' | 'work' | 'gym' | 'school' | 'other';

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // GPS accuracy in meters
}

export interface ReverseGeocodingResult {
  street: string;
  neighborhood?: string;
  city: string;
  formattedAddress: string;
}

export interface DeliveryAddress {
  id: string;
  userId: string;
  label: AddressLabel;
  
  // GPS Data (REQUIRED)
  latitude: number;
  longitude: number;
  
  // Auto-filled from GPS
  city: string; // Always "Damascus"
  street: string;
  neighborhood?: string;
  
  // User-provided details (REQUIRED)
  addressDetails: string; // e.g., "Building 2, Floor 1, near the pharmacy"
  
  // Optional contact
  contactPhone?: string;
  
  // Default address flag
  isDefault: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressInput {
  label: AddressLabel;
  latitude: number;
  longitude: number;
  street: string;
  neighborhood?: string;
  addressDetails: string;
  contactPhone?: string;
  isDefault?: boolean;
}

export interface UpdateAddressInput {
  label?: AddressLabel;
  street?: string;
  neighborhood?: string;
  addressDetails?: string;
  contactPhone?: string;
  isDefault?: boolean;
}

export interface GPSPermissionState {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export interface LocationError {
  code: number;
  message: string;
  type: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN';
}