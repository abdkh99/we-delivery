"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  CheckCircle,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import GPSLocationPicker from "./GPSLocationPicker";
import AddressForm from "./AddressForm";
import { useAuth } from "@/contexts/AuthContext";

interface SavedAddress {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  street: string;
  neighborhood: string | null;
  city: string;
  address_details: string;
  contact_phone: string | null;
  is_default: boolean;
}

interface AddressStepProps {
  onAddressSelected: (address: {
    id?: string;
    lat: number;
    lng: number;
    street: string;
    neighborhood: string;
    city: string;
    address_details: string;
    contact_phone?: string;
    label: string;
  }) => void;
  selectedAddressId?: string;
  className?: string;
}

interface AddressStepState {
  selectedAddressId: string | null;
}

type Step = "select" | "gps" | "form" | "saved";

export default function AddressStep({
  onAddressSelected,
  selectedAddressId,
  className = "",
}: AddressStepProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("select");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number;
    lng: number;
    street: string;
    neighborhood: string;
    city: string;
  } | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalSelectedAddressId, setInternalSelectedAddressId] = useState<string | null>(
    null
  );

  // Load saved addresses
  useEffect(() => {
    if (user) {
      loadSavedAddresses();
    }
  }, [user]);

  // Auto-select if addressId is provided from parent
  useEffect(() => {
    if (selectedAddressId && savedAddresses.length > 0 && internalSelectedAddressId !== selectedAddressId) {
      const address = savedAddresses.find((a) => a.id === selectedAddressId);
      if (address) {
        setInternalSelectedAddressId(address.id);
        handleSelectSavedAddress(address);
      }
    }
  }, [selectedAddressId, savedAddresses, internalSelectedAddressId]);

  const loadSavedAddresses = async () => {
    if (!user) return;

    setLoadingAddresses(true);
    try {
      const response = await fetch("/api/addresses");
      if (response.ok) {
        const data = await response.json();
        setSavedAddresses(data.addresses || []);
      } else {
        console.error("Failed to load addresses");
      }
    } catch (error) {
      console.error("Error loading addresses:", error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSelectSavedAddress = (address: SavedAddress) => {
    setInternalSelectedAddressId(address.id);
    onAddressSelected({
      id: address.id,
      lat: Number(address.latitude),
      lng: Number(address.longitude),
      street: address.street,
      neighborhood: address.neighborhood || "",
      city: address.city,
      address_details: address.address_details,
      contact_phone: address.contact_phone || undefined,
      label: address.label,
    });
  };

  const handleGPSLocationSelected = (location: {
    lat: number;
    lng: number;
    street: string;
    neighborhood: string;
    city: string;
  }) => {
    setGpsLocation(location);
    setStep("form");
  };

  const handleFormSubmit = async (formData: {
    label: string;
    street: string;
    neighborhood: string;
    city: string;
    address_details: string;
    contact_phone: string;
    is_default: boolean;
    lat: number;
    lng: number;
  }) => {
    if (!user) {
      setError("يرجى تسجيل الدخول أولاً");
      return;
    }

    setSavingAddress(true);
    setError(null);

    try {
      // Validate required fields before sending
      if (!formData.label || !formData.street?.trim() || !formData.address_details?.trim()) {
        setError("يرجى ملء جميع الحقول المطلوبة");
        setSavingAddress(false);
        return;
      }

      // Transform formData to match API expectations
      const apiData = {
        label: formData.label,
        latitude: formData.lat,
        longitude: formData.lng,
        street: formData.street.trim(),
        neighborhood: formData.neighborhood?.trim() || null,
        city: formData.city || "Damascus",
        address_details: formData.address_details.trim(),
        contact_phone: formData.contact_phone?.trim() || null,
        is_default: formData.is_default || false,
      };

      console.log("📤 Sending address data:", apiData);

      const response = await fetch("/api/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("❌ API Error:", data);
        throw new Error(data.error || "Failed to save address");
      }

      const data = await response.json();
      const savedAddress = data.address;

      // Reload addresses
      await loadSavedAddresses();

      // Notify parent component
      onAddressSelected({
        id: savedAddress.id,
        lat: formData.lat,
        lng: formData.lng,
        street: formData.street,
        neighborhood: formData.neighborhood,
        city: formData.city,
        address_details: formData.address_details,
        contact_phone: formData.contact_phone,
        label: formData.label,
      });

      // Reset to select step
      setStep("select");
      setGpsLocation(null);
    } catch (error) {
      console.error("Error saving address:", error);
      setError(
        error instanceof Error ? error.message : "فشل في حفظ العنوان"
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm("هل أنت متأكد من حذف هذا العنوان؟")) {
      return;
    }

    try {
      const response = await fetch(`/api/addresses/${addressId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadSavedAddresses();
      } else {
        throw new Error("Failed to delete address");
      }
    } catch (error) {
      console.error("Error deleting address:", error);
      alert("فشل في حذف العنوان");
    }
  };

  const getLabelIcon = (label: string) => {
    switch (label) {
      case "home":
        return "🏠";
      case "work":
        return "💼";
      case "gym":
        return "💪";
      case "school":
        return "🎓";
      default:
        return "📍";
    }
  };

  const getLabelText = (label: string) => {
    switch (label) {
      case "home":
        return "المنزل";
      case "work":
        return "العمل";
      case "gym":
        return "النادي";
      case "school":
        return "المدرسة";
      default:
        return "أخرى";
    }
  };

  // Step: Select (saved addresses or new)
  if (step === "select") {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-right">
            اختر عنوان التوصيل
          </h3>
          <p className="text-sm text-gray-600 text-right">
            اختر من العناوين المحفوظة أو أضف عنواناً جديداً
          </p>
        </div>

        {/* Saved Addresses */}
        {loadingAddresses ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : savedAddresses.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 text-right">
              العناوين المحفوظة:
            </h4>
            {savedAddresses.map((address) => {
              const isSelected = internalSelectedAddressId === address.id || selectedAddressId === address.id;
              
              const labelColors = {
                home: {
                  default: "bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-500",
                  selected: "bg-blue-600 border-blue-700 text-white shadow-lg ring-4 ring-blue-200",
                },
                work: {
                  default: "bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-500",
                  selected: "bg-purple-600 border-purple-700 text-white shadow-lg ring-4 ring-purple-200",
                },
                gym: {
                  default: "bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-500",
                  selected: "bg-orange-600 border-orange-700 text-white shadow-lg ring-4 ring-orange-200",
                },
                school: {
                  default: "bg-green-100 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-500",
                  selected: "bg-green-600 border-green-700 text-white shadow-lg ring-4 ring-green-200",
                },
                other: {
                  default: "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-500",
                  selected: "bg-gray-700 border-gray-800 text-white shadow-lg ring-4 ring-gray-200",
                },
              };

              const colorScheme = labelColors[address.label as keyof typeof labelColors] || labelColors.other;
              const currentStyle = isSelected ? colorScheme.selected : colorScheme.default;

              return (
                <div
                  key={address.id}
                  onClick={() => handleSelectSavedAddress(address)}
                  className={`p-4 sm:p-5 border-2 rounded-xl cursor-pointer transition-all ${currentStyle} ${isSelected ? 'scale-105' : 'scale-100'} transform`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 text-right">
                      {/* Label Header */}
                      <div className="flex items-center justify-end gap-2 mb-3">
                        <span className="text-2xl sm:text-3xl">{getLabelIcon(address.label)}</span>
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-base sm:text-lg">
                            {getLabelText(address.label)}
                          </span>
                          {address.is_default && (
                            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 font-medium ${
                              isSelected 
                                ? 'bg-white/30 text-white' 
                                : 'bg-white/80 text-blue-700'
                            }`}>
                              ⭐ افتراضي
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-xs bg-white/30 text-white px-2 py-0.5 rounded-full mt-1 font-medium">
                              ✓ محدد
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Address Details */}
                      <div className={`space-y-2 rounded-lg p-3 mt-3 ${
                        isSelected ? 'bg-white/20' : 'bg-white/60'
                      }`}>
                        <div className="flex items-start gap-2">
                          <MapPin className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                            isSelected ? 'text-white' : 'text-gray-600'
                          }`} />
                          <div className="flex-1 text-right">
                            <p className={`text-sm sm:text-base font-semibold mb-1 ${
                              isSelected ? 'text-white' : 'text-gray-900'
                            }`}>
                              {address.street}
                            </p>
                            {address.neighborhood && (
                              <p className={`text-xs sm:text-sm mb-1 ${
                                isSelected ? 'text-white/90' : 'text-gray-600'
                              }`}>
                                {address.neighborhood}
                              </p>
                            )}
                            <p className={`text-xs ${
                              isSelected ? 'text-white/80' : 'text-gray-500'
                            }`}>
                              {address.address_details}
                            </p>
                          </div>
                        </div>

                        {address.contact_phone && (
                          <div className={`flex items-center justify-end gap-2 pt-2 border-t ${
                            isSelected ? 'border-white/30' : 'border-gray-200'
                          }`}>
                            <Phone className={`h-3.5 w-3.5 ${
                              isSelected ? 'text-white' : 'text-gray-600'
                            }`} />
                            <span className={`text-xs sm:text-sm font-medium ${
                              isSelected ? 'text-white' : 'text-gray-700'
                            }`}>
                              {address.contact_phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDeleteAddress(address.id, e)}
                      className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                        isSelected 
                          ? 'text-white hover:bg-white/20' 
                          : 'text-red-600 hover:bg-red-100'
                      }`}
                      title="حذف العنوان"
                    >
                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">لا توجد عناوين محفوظة</p>
          </div>
        )}

        {/* Add New Address Button */}
        <button
          onClick={() => setStep("gps")}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
        >
          <Plus className="h-5 w-5" />
          <span>إضافة عنوان جديد</span>
        </button>

        {/* Important Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800 text-right">
            ⚠️ <strong>ملاحظة مهمة:</strong> يجب تحديد الموقع عبر GPS لإضافة عنوان جديد
          </p>
        </div>
      </div>
    );
  }

  // Step: GPS Selection
  if (step === "gps") {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              setStep("select");
              setGpsLocation(null);
            }}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← العودة
          </button>
          <h3 className="text-lg font-semibold text-gray-900 text-right">
            حدد موقعك على الخريطة
          </h3>
        </div>

        <GPSLocationPicker onLocationSelected={handleGPSLocationSelected} />
      </div>
    );
  }

  // Step: Address Form
  if (step === "form" && gpsLocation) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setStep("gps")}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← العودة
          </button>
          <h3 className="text-lg font-semibold text-gray-900 text-right">
            أكمل معلومات العنوان
          </h3>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 flex items-center gap-2 text-right">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </p>
          </div>
        )}

        <AddressForm
          initialData={gpsLocation}
          defaultPhone={user?.phone || ""}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setStep("gps");
            setGpsLocation(null);
          }}
        />

        {savingAddress && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="mr-2 text-sm text-gray-600">جاري حفظ العنوان...</span>
          </div>
        )}
      </div>
    );
  }

  return null;
}

