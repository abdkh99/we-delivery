"use client";

import { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Navigation,
  Edit3,
  CheckCircle,
  AlertCircle,
  MapIcon,
  Target,
} from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic import for Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  {
    ssr: false,
  }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  {
    ssr: false,
  }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  {
    ssr: false,
  }
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

interface MapLocationPickerProps {
  value: string;
  onChange: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
}

export default function MapLocationPicker({
  value,
  onChange,
  placeholder = "أدخل عنوان التوصيل",
  className = "",
}: MapLocationPickerProps) {
  const [mode, setMode] = useState<"manual" | "map">("manual");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  // مركز دمشق مع حدود أوسع لتشمل كل منطقة دمشق الكبرى
  const DAMASCUS_CENTER: [number, number] = [33.5138, 36.2765];
  const DAMASCUS_BOUNDS = {
    north: 33.58,
    south: 33.44,
    east: 36.38,
    west: 36.18,
  };
  
  const [mapCenter, setMapCenter] = useState<[number, number]>(DAMASCUS_CENTER);
  const [mapZoom, setMapZoom] = useState(13);
  const inputRef = useRef<HTMLInputElement>(null);

  // Damascus area addresses with Arabic names
  const damascusAddresses = [
    "دمشق - وسط البلد",
    "دمشق - المدينة القديمة",
    "دمشق - المزة",
    "دمشق - كفر سوسة",
    "دمشق - المالكي",
    "دمشق - برامكة",
    "دمشق - المزة 86",
    "دمشق - القنوات",
    "دمشق - المزة الغربية",
    "دمشق - الشاغور",
    "دمشق - الصالحية",
    "دمشق - القصاع",
    "دمشق - الميدان",
    "دمشق - باب توما",
    "دمشق - باب شرقي",
    "دمشق - باب الجابية",
    "دمشق - أبو رمانة",
    "دمشق - ركن الدين",
    "دمشق - المهاجرين",
    "دمشق - جوبر",
    "دمشق - حرستا",
    "دمشق - دوما",
    "دمشق - عربين",
    "دمشق - الزبداني",
    "دمشق - صيدنايا",
  ];

  // Get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("المتصفح لا يدعم تحديد الموقع");
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // التحقق من أن الموقع ضمن حدود دمشق
        if (
          latitude >= DAMASCUS_BOUNDS.south &&
          latitude <= DAMASCUS_BOUNDS.north &&
          longitude >= DAMASCUS_BOUNDS.west &&
          longitude <= DAMASCUS_BOUNDS.east
        ) {
          setCurrentLocation({ lat: latitude, lng: longitude });
          setMapCenter([latitude, longitude]);
          setMapZoom(16);
          const address = `موقعك الحالي في دمشق`;
          onChange(address, latitude, longitude);
          setSelectedLocation({ lat: latitude, lng: longitude });
        } else {
          // الموقع خارج دمشق - استخدم مركز دمشق كافتراضي
          setLocationError("⚠️ موقعك خارج نطاق خدمة دمشق - تم تحديد مركز دمشق");
          setMapCenter(DAMASCUS_CENTER);
          setMapZoom(13);
        }
        setIsLoadingLocation(false);
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

  // Handle manual address input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue, 33.5138, 36.2765); // Default Damascus coordinates

    if (inputValue.length > 1) {
      const filtered = damascusAddresses.filter((addr) =>
        addr.includes(inputValue)
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion, 33.5138, 36.2765); // Default Damascus coordinates
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.value = suggestion;
    }
  };

  // Handle map click
  const handleMapClick = (e: { latlng: { lat: number; lng: number } }) => {
    const { lat, lng } = e.latlng;
    
    // التحقق من أن الموقع ضمن حدود دمشق
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

    // Create address from coordinates
    const address = `موقع في دمشق (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    onChange(address, lat, lng);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  // Reset to Damascus center when switching to map mode
  useEffect(() => {
    if (mode === "map" && !currentLocation && !selectedLocation) {
      setMapCenter([33.5138, 36.2765]);
      setMapZoom(13);
    }
  }, [mode, currentLocation, selectedLocation]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("manual")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
            mode === "manual"
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-gray-300 text-gray-600 hover:border-gray-400"
          }`}
        >
          <Edit3 className="h-4 w-4" />
          <span className="text-sm font-medium">إدخال يدوي</span>
        </button>
        <button
          onClick={() => setMode("map")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
            mode === "map"
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-gray-300 text-gray-600 hover:border-gray-400"
          }`}
        >
          <MapIcon className="h-4 w-4" />
          <span className="text-sm font-medium">تحديد على الخريطة</span>
        </button>
      </div>

      {/* Manual Entry Mode */}
      {mode === "manual" && (
        <div className="relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-blue-500" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              className="block w-full pl-10 pr-3 py-3 text-gray-900 font-medium placeholder:text-gray-500 placeholder:font-normal bg-white border-2 border-gray-300 rounded-lg transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:shadow-lg hover:border-gray-400 sm:text-sm text-right"
              dir="rtl"
            />
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 text-right"
                >
                  <div className="flex items-center justify-end">
                    <span className="font-normal block truncate text-gray-900">
                      {suggestion}
                    </span>
                    <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map Mode */}
      {mode === "map" && (
        <div className="space-y-4">
          {/* Location Controls */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoadingLocation ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {isLoadingLocation
                  ? "جاري تحديد الموقع..."
                  : "استخدام موقعي الحالي"}
              </span>
            </button>

            <button
              onClick={() => {
                setMapCenter([33.5138, 36.2765]);
                setMapZoom(13);
                setSelectedLocation(null);
                setCurrentLocation(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">مركز دمشق</span>
            </button>
          </div>

          {/* Error Message */}
          {locationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {locationError}
              </p>
            </div>
          )}

          {/* Success Message */}
          {currentLocation && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                تم تحديد الموقع بنجاح!
              </p>
            </div>
          )}

          {/* Map Container */}
          <div className="h-80 w-full border-2 border-blue-300 rounded-lg overflow-hidden shadow-lg">
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

              {/* Current Location Marker */}
              {currentLocation && (
                <Marker position={[currentLocation.lat, currentLocation.lng]}>
                  <Popup>
                    <div className="text-center">
                      <p className="font-semibold">موقعك الحالي</p>
                      <p className="text-sm text-gray-600">
                        {currentLocation.lat.toFixed(4)},{" "}
                        {currentLocation.lng.toFixed(4)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

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

          {/* Instructions */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-2 text-right">طريقة الاستخدام:</p>
            <ul className="list-disc list-inside space-y-1 text-right">
              <li>
                اضغط على &quot;استخدام موقعي الحالي&quot; لتحديد موقعك تلقائياً
              </li>
              <li>أو اضغط على أي مكان في الخريطة لتحديد موقع آخر</li>
              <li>استخدم &quot;مركز دمشق&quot; للعودة إلى وسط المدينة</li>
              <li>سيتم استخدام الموقع المحدد للتوصيل</li>
            </ul>
          </div>
        </div>
      )}

      {/* Selected Address Display */}
      {value && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 flex items-center gap-2 text-right">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">العنوان المحدد:</span>
          </p>
          <p className="text-sm text-blue-600 mt-1 text-right">{value}</p>
        </div>
      )}
    </div>
  );
}
