"use client";
import { useMemo } from "react";

interface ProductOfferBadgeProps {
    offer: any | null; // Using any for offer to be flexible or strictly define if available
    originalPrice: number;
    finalPrice?: number;
    className?: string;
}
export default function ProductOfferBadge({
    offer,
    originalPrice,
    finalPrice,
    className = "",
}: ProductOfferBadgeProps) {
    if (!offer || !offer.is_active) {
        return null;
    }

    // Double check validity dates
    const now = new Date();
    if (offer.valid_from && new Date(offer.valid_from) > now) return null;
    if (offer.valid_until && new Date(offer.valid_until) < now) return null;

    const discountValue = offer.discount_value;
    const discountType = offer.discount_type;

    // Calculate percentage for display if it's fixed amount
    let percentage = 0;
    if (discountType === "percentage") {
        percentage = discountValue;
    } else {
        // Fixed amount
        if (originalPrice > 0) {
            percentage = Math.round((discountValue / originalPrice) * 100);
        }
    }

    return (
        <div className={`absolute top-0 right-0 z-10 ${className}`}>
            <div className="bg-red-600 text-white font-bold p-1.5 min-w-[3rem] text-center shadow-md rounded-bl-xl rounded-tr-none">
                <div className="text-[10px] leading-tight">وفر</div>
                <div className="text-sm font-black leading-tight">
                    {Math.round(percentage)}%
                </div>
            </div>
        </div>
    );
}
