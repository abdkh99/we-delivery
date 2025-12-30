/**
 * GPS Location Hook
 * Handles device location and reverse geocoding
 */

import { useState, useCallback } from 'react';
import type { GPSLocation, GeocodingResult } from '@/types/address';

interface UseGPSLocationReturn {
  location: GPSLocation | null;
  geocodingResult: GeocodingResult | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => Promise<void>;
  reverseGeocode: (lat: number, lng: number) => Promise<GeocodingResult | null>;
}

export function useGPSLocation(): UseGPSLocationReturn {
  const [location, setLocation] = useState<GPSLocation | null>(null);
  const [geocodingResult, setGeocodingResult] = useState<GeocodingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('GPS is not supported by your device');
      setIsLoading(false);
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const gpsLocation: GPSLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      setLocation(gpsLocation);

      // Automatically reverse geocode
      const result = await reverseGeocode(
        gpsLocation.latitude,
        gpsLocation.longitude
      );

      if (result) {
        setGeocodingResult(result);
      }
    } catch (err: any) {
      let errorMessage = 'Failed to get location';

      if (err.code === 1) {
        errorMessage = 'Location permission denied. Please enable GPS and try again.';
      } else if (err.code === 2) {
        errorMessage = 'Location unavailable. Please check your GPS settings.';
      } else if (err.code === 3) {
        errorMessage = 'Location request timeout. Please try again.';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<GeocodingResult | null> => {
      try {
        // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?` +
          `format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'ar', // Request Arabic names
            },
          }
        );

        if (!response.ok) {
          throw new Error('Geocoding failed');
        }

        const data = await response.json();
        const address = data.address || {};

        // Extract street name (try multiple fields)
        const street =
          address.road ||
          address.street ||
          address.pedestrian ||
          address.path ||
          'Unknown Street';

        // Extract neighborhood
        const neighborhood =
          address.suburb ||
          address.neighbourhood ||
          address.quarter ||
          address.district ||
          undefined;

        // City should always be Damascus for this app
        const city = 'Damascus';

        return {
          street,
          neighborhood,
          city,
          formatted_address: data.display_name || '',
        };
      } catch (err) {
        console.error('Reverse geocoding error:', err);
        setError('Failed to get address details. Please enter street name manually.');
        return null;
      }
    },
    []
  );

  return {
    location,
    geocodingResult,
    isLoading,
    error,
    requestLocation,
    reverseGeocode,
  };
}
