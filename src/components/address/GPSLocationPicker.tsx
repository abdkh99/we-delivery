/**
 * GPS Location Picker Component
 * 
 * STRICT: This is the ONLY way to select an address
 * No manual address entry without GPS
 */

'use client';

import { useState } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { getCurrentLocation, checkGPSPermission } from '@/lib/geolocation';
import { reverseGeocode } from '@/lib/geocoding';
import { GPSCoordinates, ReverseGeocodingResult, LocationError } from '@/types/address';

interface GPSLocationPickerProps {
  onLocationSelected: (location: GPSCoordinates, address: ReverseGeocodingResult) => void;
  className?: string;
}

export function GPSLocationPicker({ onLocationSelected, className = '' }: GPSLocationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const handleSelectLocation = async () => {
    setLoading(true);
    setError(null);
    setPermissionDenied(false);

    try {
      // Check permission first
      const permission = await checkGPSPermission();
      
      if (permission.denied) {
        setPermissionDenied(true);
        setError(
          'تم رفض إذن الموقع. الرجاء تفعيل الموقع في إعدادات المتصفح.'
        );
        setLoading(false);
        return;
      }

      // Get current location
      const coordinates = await getCurrentLocation();

      // Reverse geocode to get address
      const address = await reverseGeocode(coordinates);

      // Success! Pass data to parent
      onLocationSelected(coordinates, address);
    } catch (err) {
      const locationError = err as LocationError;
      
      if (locationError.type === 'PERMISSION_DENIED') {
        setPermissionDenied(true);
        setError(
          'تم رفض إذن الموقع. الرجاء تفعيل الموقع في إعدادات المتصفح.'
        );
      } else if (locationError.type === 'POSITION_UNAVAILABLE') {
        setError(
          'لا يمكن تحديد موقعك. الرجاء التأكد من تفعيل GPS.'
        );
      } else if (locationError.type === 'TIMEOUT') {
        setError(
          'انتهت مهلة تحديد الموقع. الرجاء المحاولة مرة أخرى.'
        );
      } else {
        setError(
          'حدث خطأ أثناء تحديد موقعك. الرجاء المحاولة مرة أخرى.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Action Button */}
      <button
        type="button"
        onClick={handleSelectLocation}
        disabled={loading}
        className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>جاري تحديد موقعك...</span>
          </>
        ) : (
          <>
            <MapPin className="w-5 h-5" />
            <span>تحديد الموقع باستخدام GPS</span>
          </>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
            
            {permissionDenied && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-red-700">لتفعيل الموقع:</p>
                <ol className="text-xs text-red-700 space-y-1 list-decimal list-inside">
                  <li>انقر على أيقونة القفل في شريط العنوان</li>
                  <li>اختر "إعدادات الموقع"</li>
                  <li>اختر "السماح"</li>
                  <li>أعد تحميل الصفحة</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm text-blue-800">
          <p className="font-medium mb-1">لماذا نحتاج موقعك؟</p>
          <p className="text-xs">
            نحتاج إلى موقعك الدقيق لضمان توصيل طلبك إلى العنوان الصحيح. 
            سيتم استخدام GPS لتحديد موقعك بدقة.
          </p>
        </div>
      </div>
    </div>
  );
}