/**
 * Saved Addresses List Component
 * Displays user's saved addresses with selection
 */

'use client';

import { useState } from 'react';
import type { UserAddress } from '@/types/address';
import { MapPin, Home, Briefcase, Dumbbell, GraduationCap, MapPinned, Phone, Edit, Trash2, Check } from 'lucide-react';

interface SavedAddressesListProps {
  addresses: UserAddress[];
  selectedAddressId?: string;
  onSelect: (address: UserAddress) => void;
  onEdit?: (address: UserAddress) => void;
  onDelete?: (addressId: string) => void;
  isLoading?: boolean;
}

const LABEL_ICONS: Record<string, typeof Home> = {
  home: Home,
  work: Briefcase,
  gym: Dumbbell,
  school: GraduationCap,
  other: MapPinned,
};

export function SavedAddressesList({
  addresses,
  selectedAddressId,
  onSelect,
  onEdit,
  onDelete,
  isLoading = false,
}: SavedAddressesListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (addressId: string) => {
    if (!onDelete) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this address?'
    );

    if (!confirmed) return;

    setDeletingId(addressId);
    try {
      await onDelete(addressId);
    } finally {
      setDeletingId(null);
    }
  };

  if (addresses.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>No saved addresses yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.map((address) => {
        const Icon = LABEL_ICONS[address.label] || MapPinned;
        const isSelected = selectedAddressId === address.id;

        return (
          <div
            key={address.id}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => onSelect(address)}
          >
            <div className="flex items-start gap-3">
              {/* Icon & Label */}
              <div className={`p-2 rounded-lg ${
                isSelected ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Icon className={`w-5 h-5 ${
                  isSelected ? 'text-blue-600' : 'text-gray-600'
                }`} />
              </div>

              {/* Address Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 capitalize flex items-center gap-2">
                      {address.label}
                      {address.is_default && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          Default
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </h4>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(address);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        disabled={isLoading}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && !address.is_default && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(address.id);
                        }}
                        disabled={deletingId === address.id || isLoading}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Street & Neighborhood */}
                <p className="text-sm text-gray-700 mb-1">
                  {address.street}
                  {address.neighborhood && `, ${address.neighborhood}`}
                </p>

                {/* City */}
                <p className="text-sm text-gray-600 mb-2">{address.city}</p>

                {/* Address Details */}
                <p className="text-sm text-gray-600 mb-2">
                  {address.address_details}
                </p>

                {/* Alternative Phone */}
                {address.alternative_phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    {address.alternative_phone}
                  </div>
                )}

                {/* GPS Coordinates (for debugging) */}
                <p className="text-xs text-gray-400 mt-2">
                  GPS: {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
