/**
 * Geolocation Service
 * 
 * Handles GPS location detection with proper error handling
 */

import { GPSCoordinates, GPSPermissionState, LocationError } from '@/types/address';

/**
 * Check if geolocation is supported
 */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Check GPS permission state
 */
export async function checkGPSPermission(): Promise<GPSPermissionState> {
  if (!isGeolocationSupported()) {
    return { granted: false, denied: true, prompt: false };
  }
  
  try {
    // Check if Permissions API is available
    if ('permissions' in navigator) {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      
      return {
        granted: result.state === 'granted',
        denied: result.state === 'denied',
        prompt: result.state === 'prompt',
      };
    }
    
    // Fallback: assume prompt state
    return { granted: false, denied: false, prompt: true };
  } catch (error) {
    console.error('Permission check error:', error);
    return { granted: false, denied: false, prompt: true };
  }
}

/**
 * Get current GPS location
 */
export async function getCurrentLocation(): Promise<GPSCoordinates> {
  if (!isGeolocationSupported()) {
    throw {
      code: 0,
      message: 'Geolocation is not supported by this browser',
      type: 'UNKNOWN',
    } as LocationError;
  }
  
  return new Promise((resolve, reject) => {
    const options: PositionOptions = {
      enableHighAccuracy: true, // Request GPS instead of network location
      timeout: 10000, // 10 seconds
      maximumAge: 0, // Don't use cached position
    };
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        const locationError: LocationError = {
          code: error.code,
          message: getErrorMessage(error),
          type: getErrorType(error),
        };
        reject(locationError);
      },
      options
    );
  });
}

/**
 * Watch GPS location (for real-time tracking)
 */
export function watchLocation(
  onSuccess: (coordinates: GPSCoordinates) => void,
  onError: (error: LocationError) => void
): number {
  if (!isGeolocationSupported()) {
    onError({
      code: 0,
      message: 'Geolocation is not supported',
      type: 'UNKNOWN',
    });
    return -1;
  }
  
  const options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000, // Accept cached position up to 5 seconds old
  };
  
  return navigator.geolocation.watchPosition(
    (position) => {
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    },
    (error) => {
      onError({
        code: error.code,
        message: getErrorMessage(error),
        type: getErrorType(error),
      });
    },
    options
  );
}

/**
 * Stop watching location
 */
export function clearLocationWatch(watchId: number): void {
  if (isGeolocationSupported() && watchId !== -1) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Helper: Get error message
 */
function getErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location permission denied. Please enable location access in your browser settings.';
    case error.POSITION_UNAVAILABLE:
      return 'Location information is unavailable. Please check your GPS settings.';
    case error.TIMEOUT:
      return 'Location request timed out. Please try again.';
    default:
      return 'An unknown error occurred while getting your location.';
  }
}

/**
 * Helper: Get error type
 */
function getErrorType(error: GeolocationPositionError): LocationError['type'] {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'PERMISSION_DENIED';
    case error.POSITION_UNAVAILABLE:
      return 'POSITION_UNAVAILABLE';
    case error.TIMEOUT:
      return 'TIMEOUT';
    default:
      return 'UNKNOWN';
  }
}