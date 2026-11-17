"use client";

import { useState, useEffect } from "react";
import { Home, Briefcase, Dumbbell, GraduationCap, MapPin, Phone } from "lucide-react";

interface AddressFormData {
  label: "home" | "work" | "gym" | "school" | "other";
  street: string;
  neighborhood: string;
  city: string;
  address_details: string;
  contact_phone: string;
  is_default: boolean;
}

interface AddressFormProps {
  initialData?: {
    lat: number;
    lng: number;
    street: string;
    neighborhood: string;
    city: string;
  };
  defaultPhone?: string;
  onSubmit: (data: AddressFormData & { lat: number; lng: number }) => void;
  onCancel?: () => void;
  className?: string;
}

const LABEL_OPTIONS = [
  { value: "home" as const, label: "المنزل", icon: Home },
  { value: "work" as const, label: "العمل", icon: Briefcase },
  { value: "gym" as const, label: "النادي", icon: Dumbbell },
  { value: "school" as const, label: "المدرسة", icon: GraduationCap },
  { value: "other" as const, label: "أخرى", icon: MapPin },
];

export default function AddressForm({
  initialData,
  defaultPhone = "",
  onSubmit,
  onCancel,
  className = "",
}: AddressFormProps) {
  const [formData, setFormData] = useState<AddressFormData>({
    label: "home",
    street: initialData?.street || "",
    neighborhood: initialData?.neighborhood || "",
    city: initialData?.city || "Damascus",
    address_details: "",
    contact_phone: defaultPhone,
    is_default: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        street: initialData.street,
        neighborhood: initialData.neighborhood,
        city: initialData.city,
      }));
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.street.trim()) {
      newErrors.street = "اسم الشارع مطلوب";
    }

    if (!formData.address_details.trim()) {
      newErrors.address_details = "تفاصيل العنوان مطلوبة";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!initialData) {
      setErrors({ general: "لم يتم تحديد الموقع. يرجى تحديد الموقع أولاً." });
      return;
    }

    if (!validate()) {
      return;
    }

    // Ensure all required fields are present
    const submitData = {
      label: formData.label,
      street: formData.street.trim(),
      neighborhood: formData.neighborhood?.trim() || "",
      city: formData.city || "Damascus",
      address_details: formData.address_details.trim(),
      contact_phone: formData.contact_phone?.trim() || "",
      is_default: formData.is_default,
      lat: initialData.lat,
      lng: initialData.lng,
    };

    console.log("📝 Form submit data:", submitData);

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* General Error */}
      {errors.general && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg shadow-md">
          <p className="text-sm text-red-800 text-right font-bold">{errors.general}</p>
        </div>
      )}

      {/* Address Label */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-3 text-right">
          نوع العنوان <span className="text-red-500 text-base">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {LABEL_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, label: option.value }))
                }
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all font-semibold shadow-sm hover:shadow-md ${formData.label === option.value
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                  }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* City (Read-only) */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2 text-right">
          المدينة
        </label>
        <input
          type="text"
          value={formData.city}
          readOnly
          className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold cursor-not-allowed text-right"
        />
        <p className="mt-2 text-xs text-gray-600 text-right font-medium bg-gray-50 p-2 rounded border border-gray-200">
          ℹ️ المدينة ثابتة: دمشق
        </p>
      </div>

      {/* Street */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2 text-right">
          اسم الشارع <span className="text-red-500 text-base">*</span>
        </label>
        <input
          type="text"
          value={formData.street}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, street: e.target.value }))
          }
          className={`w-full text-gray-800 font-semibold px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-right shadow-sm transition-all ${errors.street
            ? "border-red-400 bg-red-50"
            : "border-gray-300 bg-white hover:border-blue-300"
            }`}
          placeholder="مثال: شارع الكلاسة"
        />
        {errors.street && (
          <p className="mt-2 text-sm text-red-700 text-right font-semibold bg-red-50 p-2 rounded border border-red-300">
            ⚠️ {errors.street}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-600 text-right font-medium bg-blue-50 p-2 rounded border border-blue-200">
          📍 تم ملؤه تلقائياً من GPS - يمكنك تعديله إذا لزم الأمر
        </p>
      </div>

      {/* Neighborhood */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2 text-right">
          المنطقة / الحي
        </label>
        <input
          type="text"
          value={formData.neighborhood}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, neighborhood: e.target.value }))
          }
          className="w-full text-gray-800 font-semibold px-4 py-3 border-2 border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-right shadow-sm hover:border-blue-300 transition-all"
          placeholder="مثال: المزة"
        />
        <p className="mt-2 text-xs text-gray-600 text-right font-medium bg-blue-50 p-2 rounded border border-blue-200">
          📍 تم ملؤه تلقائياً من GPS - يمكنك تعديله إذا لزم الأمر
        </p>
      </div>

      {/* Address Details */}
      <div>
        <label className="block text-sm text-gray-800 font-bold mb-2 text-right">
          تفاصيل العنوان <span className="text-red-500 text-base">*</span>
        </label>
        <textarea
          value={formData.address_details}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              address_details: e.target.value,
            }))
          }
          rows={4}
          className={`w-full text-gray-800 font-semibold px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-right shadow-sm transition-all resize-none ${errors.address_details
            ? "border-red-400 bg-red-50"
            : "border-gray-300 bg-white hover:border-blue-300"
            }`}
          placeholder="مثال: المبنى 2، الطابق الأول، بجانب الصيدلية"
        />
        {errors.address_details && (
          <p className="mt-2 text-sm text-red-700 text-right font-semibold bg-red-50 p-2 rounded border border-red-300">
            ⚠️ {errors.address_details}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-600 text-right font-medium bg-green-50 p-2 rounded border border-green-200">
          💡 تعليمات واضحة للسائق للوصول إلى موقعك
        </p>
      </div>

      {/* Contact Phone */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2 text-right">
          رقم الاتصال (اختياري)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Phone className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="tel"
            value={formData.contact_phone}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                contact_phone: e.target.value,
              }))
            }
            className="w-full text-gray-800 font-semibold pl-4 pr-10 py-3 border-2 border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-right shadow-sm hover:border-blue-300 transition-all"
            placeholder="+963 9XX XXX XXX"
          />
        </div>
        <p className="mt-2 text-xs text-gray-600 text-right font-medium bg-purple-50 p-2 rounded border border-purple-200">
          📞 رقم هاتف بديل للتواصل معك أثناء التوصيل
        </p>
      </div>

      {/* Set as Default */}
      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
        <input
          type="checkbox"
          id="is_default"
          checked={formData.is_default}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              is_default: e.target.checked,
            }))
          }
          className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-400 cursor-pointer"
        />
        <label htmlFor="is_default" className="text-sm text-gray-800 font-semibold text-right cursor-pointer flex-1">
          ⭐ تعيين كعنوان افتراضي
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 border-2 border-gray-300 bg-white rounded-lg text-gray-800 hover:bg-gray-50 hover:border-gray-400 transition-all font-bold shadow-sm hover:shadow-md"
          >
            إلغاء
          </button>
        )}
        <button
          type="submit"
          disabled={!initialData}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 transition-all font-bold shadow-md hover:shadow-lg"
        >
          حفظ العنوان
        </button>
      </div>
    </form>
  );
}