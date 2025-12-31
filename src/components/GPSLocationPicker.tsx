"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic import for Leaflet to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

const MapClickHandler = dynamic(
  () =>
    import("react-leaflet").then((mod) => {
      const { useMapEvents } = mod;
      return function MapClickHandlerComponent({
        onClick,
      }: {
        onClick: (e: { latlng: { lat: number; lng: number } }) => void;
      }) {
        useMapEvents({
          click: onClick,
        });
        return null;
      };
    }),
  { ssr: false }
);

interface GPSLocationPickerProps {
  onLocationSelected: (location: {
    lat: number;
    lng: number;
    street: string;
    neighborhood: string;
    city: string;
  }) => void;
  className?: string;
}

export default function GPSLocationPicker({
  onLocationSelected,
  className = "",
}: GPSLocationPickerProps) {
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geocodedAddress, setGeocodedAddress] = useState<{
    street: string;
    neighborhood: string;
    city: string;
  } | null>(null);

  // Damascus bounds
  const DAMASCUS_CENTER: [number, number] = [33.5138, 36.2765];
  const DAMASCUS_BOUNDS = {
    north: 33.58,
    south: 33.44,
    east: 36.38,
    west: 36.18,
  };

  const [mapCenter, setMapCenter] = useState<[number, number]>(DAMASCUS_CENTER);
  const [mapZoom, setMapZoom] = useState(13);

  // Get user's current location via GPS
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("المتصفح لا يدعم تحديد الموقع");
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Validate location is within Damascus bounds
        if (
          latitude >= DAMASCUS_BOUNDS.south &&
          latitude <= DAMASCUS_BOUNDS.north &&
          longitude >= DAMASCUS_BOUNDS.west &&
          longitude <= DAMASCUS_BOUNDS.east
        ) {
          setSelectedLocation({ lat: latitude, lng: longitude });
          setMapCenter([latitude, longitude]);
          setMapZoom(16);
          setIsLoadingLocation(false);

          // Perform reverse geocoding
          await performReverseGeocoding(latitude, longitude);
        } else {
          setLocationError(
            "⚠️ موقعك خارج نطاق خدمة دمشق - يرجى اختيار موقع داخل دمشق"
          );
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        let errorMessage = "تعذر الحصول على موقعك";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "تم رفض الوصول للموقع - يرجى السماح بالوصول للموقع في إعدادات المتصفح";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "معلومات الموقع غير متاحة - تأكد من تشغيل GPS";
            break;
          case error.TIMEOUT:
            errorMessage = "انتهت مهلة طلب الموقع - حاول مرة أخرى";
            break;
        }
        setLocationError(errorMessage);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  // Perform reverse geocoding
  const performReverseGeocoding = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    setLocationError(null);

    try {
      const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to geocode address");
      }

      const address = {
        street: data.street || "Street name not available",
        neighborhood: data.neighborhood || "",
        city: data.city || "Damascus",
      };

      setGeocodedAddress(address);
      onLocationSelected({
        lat,
        lng,
        ...address,
      });
    } catch (error) {
      console.error("Geocoding error:", error);
      setLocationError("فشل في تحويل الموقع إلى عنوان - يرجى المحاولة مرة أخرى");
      
      // Still allow selection with basic info
      const address = {
        street: "Street name not available",
        neighborhood: "",
        city: "Damascus",
      };
      setGeocodedAddress(address);
      onLocationSelected({
        lat,
        lng,
        ...address,
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle map click
  const handleMapClick = async (e: { latlng: { lat: number; lng: number } }) => {
    const { lat, lng } = e.latlng;

    // Validate location is within Damascus bounds
    if (
      lat < DAMASCUS_BOUNDS.south ||
      lat > DAMASCUS_BOUNDS.north ||
      lng < DAMASCUS_BOUNDS.west ||
      lng > DAMASCUS_BOUNDS.east
    ) {
      setLocationError("⚠️ يرجى اختيار موقع داخل دمشق فقط");
      setTimeout(() => setLocationError(null), 3000);
      return;
    }

    setLocationError(null);
    setSelectedLocation({ lat, lng });
    setMapCenter([lat, lng]);

    // Perform reverse geocoding
    await performReverseGeocoding(lat, lng);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 font-medium mb-2 text-right">
          📍 حدد موقعك على الخريطة
        </p>
        <p className="text-xs text-blue-700 text-right">
          اضغط على زر "استخدام موقعي الحالي" لتحديد موقعك تلقائياً، أو اضغط على أي مكان في الخريطة
        </p>
      </div>

      {/* Location Controls */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={getCurrentLocation}
          disabled={isLoadingLocation || isGeocoding}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoadingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          <span className="text-sm">
            {isLoadingLocation
              ? "جاري تحديد الموقع..."
              : "استخدام موقعي الحالي"}
          </span>
        </button>

        <button
          onClick={() => {
            setMapCenter(DAMASCUS_CENTER);
            setMapZoom(13);
            setSelectedLocation(null);
            setGeocodedAddress(null);
            setLocationError(null);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
        >
          <MapPin className="h-4 w-4" />
          <span className="text-sm">مركز دمشق</span>
        </button>
      </div>

      {/* Error Message */}
      {locationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 flex items-center gap-2 text-right">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {locationError}
          </p>
        </div>
      )}

      {/* Geocoding Status */}
      {isGeocoding && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 flex items-center gap-2 text-right">
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
            جاري تحويل الموقع إلى عنوان...
          </p>
        </div>
      )}

      {/* Success Message */}
      {geocodedAddress && !isGeocoding && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 flex items-center gap-2 text-right mb-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            تم تحديد الموقع بنجاح!
          </p>
          <div className="text-xs text-green-600 space-y-1 text-right">
            <p>
              <span className="font-medium">الشارع:</span> {geocodedAddress.street}
            </p>
            {geocodedAddress.neighborhood && (
              <p>
                <span className="font-medium">المنطقة:</span>{" "}
                {geocodedAddress.neighborhood}
              </p>
            )}
            <p>
              <span className="font-medium">المدينة:</span> {geocodedAddress.city}
            </p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="h-96 w-full border-2 border-blue-300 rounded-lg overflow-hidden shadow-lg">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          minZoom={12}
          maxZoom={18}
          maxBounds={[
            [DAMASCUS_BOUNDS.south, DAMASCUS_BOUNDS.west],
            [DAMASCUS_BOUNDS.north, DAMASCUS_BOUNDS.east],
          ]}
          maxBoundsViscosity={1.0}
          style={{ height: "100%", width: "100%" }}
        >
          <MapClickHandler onClick={handleMapClick} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Selected Location Marker */}
          {selectedLocation && (
            <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold">الموقع المحدد</p>
                  <p className="text-sm text-gray-600">
                    {selectedLocation.lat.toFixed(4)},{" "}
                    {selectedLocation.lng.toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}

