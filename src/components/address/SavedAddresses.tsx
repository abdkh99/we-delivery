/**
 * Saved Addresses List Component
 * 
 * Displays user's saved addresses
 * Allows selection for checkout
 */

'use client';

import { useState } from 'react';
import { Home, Briefcase, Dumbbell, GraduationCap, MapPin, Star, Edit2, Trash2 } from 'lucide-react';
import { DeliveryAddress, AddressLabel } from '@/types/address';

interface SavedAddressesProps {
  addresses: DeliveryAddress[];
  selectedAddressId?: string;
  onSelect: (address: DeliveryAddress) => void;
  onEdit?: (address: DeliveryAddress) => void;
  onDelete?: (addressId: string) => void;
  showActions?: boolean;
}

const LABEL_ICONS: Record<AddressLabel, React.ComponentType<any>> = {
  home: Home,
  work: Briefcase,
  gym: Dumbbell,
  school: GraduationCap,
  other: MapPin,
};

const LABEL_NAMES: Record<AddressLabel, string> = {
  home: 'المنزل',
  work: 'العمل',
  gym: 'النادي الرياضي',
  school: 'المدرسة/الجامعة',
  other: 'أخرى',
};

export function SavedAddresses({
  addresses,
  selectedAddressId,
  onSelect,
  onEdit,
  onDelete,
  showActions = false,
}: SavedAddressesProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (addressId: string) => {
    if (!onDelete) return;
    
    if (window.confirm('هل أنت متأكد من حذف هذا العنوان؟')) {
      setDeletingId(addressId);
      try {
        await onDelete(addressId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  if (addresses.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">لا توجد عناوين محفوظة</p>
        <p className="text-sm text-gray-400 mt-2">أضف عنوان جديد للبدء</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {addresses.map((address) => {
        const Icon = LABEL_ICONS[address.label];
        const isSelected = selectedAddressId === address.id;

        return (
          <div
            key={address.id}
            onClick={() => onSelect(address)}
            className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`p-3 rounded-lg ${
                isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900">
                    {LABEL_NAMES[address.label]}
                  </h3>
                  {address.isDefault && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      <Star className="w-3 h-3" />
                      افتراضي
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-2">
                  {address.street}
                  {address.neighborhood && `, ${address.neighborhood}`}
                </p>

                <p className="text-xs text-gray-500">
                  {address.addressDetails}
                </p>

                {address.contactPhone && (
                  <p className="text-xs text-gray-400 mt-2">
                    📞 {address.contactPhone}
                  </p>
                )}
              </div>

              {/* Actions */}
              {showActions && (
                <div className="flex items-center gap-2">
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(address);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(address.id);
                      }}
                      disabled={deletingId === address.id}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}