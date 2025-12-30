/**
 * GPS Location Picker Component
 * STRICT: User MUST select GPS location before proceeding
 */

'use client';

import { useGPSLocation } from '@/hooks/useGPSLocation';
import { MapPin, Navigation, AlertCircle, Loader2 } from 'lucide-react';

interface GPSLocationPickerProps {
  onLocationSelected: (data: {
    latitude: number;
    longitude: number;
    street: string;
    neighborhood?: string;
    city: string;
  }) => void;
  disabled?: boolean;
}

export function GPSLocationPicker({
  onLocationSelected,
  disabled = false,
}: GPSLocationPickerProps) {
  const {
    location,
    geocodingResult,
    isLoading,
    error,
    requestLocation,
  } = useGPSLocation();

  const handleSelectLocation = () => {
    if (location && geocodingResult) {
      onLocationSelected({
        latitude: location.latitude,
        longitude: location.longitude,
        street: geocodingResult.street,
        neighborhood: geocodingResult.neighborhood,
        city: geocodingResult.city,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* GPS Selection Button */}
      <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Navigation className="w-8 h-8 text-blue-600" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Select Your Location
            </h3>
            <p className="text-sm text-gray-600">
              We need your GPS location to deliver your order accurately
            </p>
          </div>

          <button
            onClick={requestLocation}
            disabled={isLoading || disabled}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Getting Location...
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5" />
                Select Location
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Location Preview */}
      {location && geocodingResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 mb-1">
                Location Detected
              </p>
              <p className="text-sm text-green-700">
                <span className="font-medium">Street:</span> {geocodingResult.street}
              </p>
              {geocodingResult.neighborhood && (
                <p className="text-sm text-green-700">
                  <span className="font-medium">Neighborhood:</span>{' '}
                  {geocodingResult.neighborhood}
                </p>
              )}
              <p className="text-sm text-green-700">
                <span className="font-medium">City:</span> {geocodingResult.city}
              </p>
              <p className="text-xs text-green-600 mt-2">
                GPS: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                {location.accuracy && (
                  <span className="ml-2">
                    (Accuracy: ±{Math.round(location.accuracy)}m)
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={handleSelectLocation}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Use This Location
          </button>
        </div>
      )}
    </div>
  );
}
