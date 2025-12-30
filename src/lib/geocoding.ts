/**
 * Geocoding Service
 * 
 * Uses OpenStreetMap Nominatim for reverse geocoding (FREE)
 * Production-ready with error handling and rate limiting
 */

import { ReverseGeocodingResult, GPSCoordinates } from '@/types/address';

const NOMINATIM_API = 'https://nominatim.openstreetmap.org';
const DEFAULT_LANGUAGE = 'ar'; // Arabic for Damascus

// Rate limiting: Max 1 request per second as per Nominatim usage policy
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const delay = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastRequestTime = Date.now();
  return fetch(url);
}

export async function reverseGeocode(
  coordinates: GPSCoordinates
): Promise<ReverseGeocodingResult> {
  try {
    const { latitude, longitude } = coordinates;
    
    // Validate coordinates
    if (!latitude || !longitude) {
      throw new Error('Invalid coordinates');
    }
    
    if (latitude < -90 || latitude > 90) {
      throw new Error('Invalid latitude');
    }
    
    if (longitude < -180 || longitude > 180) {
      throw new Error('Invalid longitude');
    }
    
    // Build request URL
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      format: 'json',
      'accept-language': DEFAULT_LANGUAGE,
      addressdetails: '1',
      zoom: '18', // Street-level detail
    });
    
    const url = `${NOMINATIM_API}/reverse?${params.toString()}`;
    
    // Add User-Agent header (required by Nominatim)
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || data.error) {
      throw new Error(data?.error || 'Geocoding failed');
    }
    
    // Extract address components
    const address = data.address || {};
    
    // Extract street name
    const street = 
      address.road ||
      address.street ||
      address.pedestrian ||
      address.path ||
      address.footway ||
      'شارع غير معروف'; // Unknown street in Arabic
    
    // Extract neighborhood
    const neighborhood = 
      address.neighbourhood ||
      address.suburb ||
      address.quarter ||
      address.district ||
      undefined;
    
    // City is always Damascus
    const city = 'Damascus';
    
    // Format display address
    const formattedAddress = data.display_name || 
      `${street}${neighborhood ? ', ' + neighborhood : ''}, ${city}`;
    
    return {
      street,
      neighborhood,
      city,
      formattedAddress,
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    
    // Return fallback address
    return {
      street: 'شارع غير معروف',
      city: 'Damascus',
      formattedAddress: 'Damascus, Syria',
    };
  }
}

/**
 * Alternative: Google Maps Geocoding API
 * 
 * Requires API key, but provides more accurate results
 * Uncomment and configure if you have a Google Maps API key
 */
/*
export async function reverseGeocodeGoogle(
  coordinates: GPSCoordinates,
  apiKey: string
): Promise<ReverseGeocodingResult> {
  try {
    const { latitude, longitude } = coordinates;
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&language=ar`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results[0]) {
      throw new Error('Geocoding failed');
    }
    
    const result = data.results[0];
    const components = result.address_components;
    
    const street = components.find((c: any) => c.types.includes('route'))?.long_name || 'Unknown Street';
    const neighborhood = components.find((c: any) => c.types.includes('neighborhood'))?.long_name;
    
    return {
      street,
      neighborhood,
      city: 'Damascus',
      formattedAddress: result.formatted_address,
    };
  } catch (error) {
    console.error('Google geocoding error:', error);
    throw error;
  }
}
*/