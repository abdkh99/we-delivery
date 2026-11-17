
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useMemo, useCallback } from "react";
import { Database } from "@/types/database";
type Product = Database["public"]["Tables"]["products"]["Row"];
export interface Offer {
    id: string;
    title: string;
    description?: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    applicable_to: "all" | "category" | "product";
    category_filter?: string;
    product_ids?: string[];
    valid_until?: string;
}
export function useOffers() {
    const { data: offersData, error, isLoading } = useSWR<{ offers: Offer[] }>(
        "/api/offers",
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );
    const activeOffers = useMemo(() => offersData?.offers ?? [], [offersData]);
    const calculateBestOffer = useCallback((product: Product, price: number) => {
        if (!activeOffers.length) return { finalPrice: price, bestOffer: null };
        const applicableOffers = activeOffers.filter((offer) => {
            if (!offer.is_active) return false;
            if (offer.valid_until && new Date(offer.valid_until) < new Date()) return false;
            // Handle end_date if valid_until is not present or checks both
            if (offer.end_date && new Date(offer.end_date) < new Date()) return false;
            if (offer.applicable_to === "all") return true;
            if (offer.applicable_to === "category") {
                return offer.category_filter === product.category;
            }
            if (offer.applicable_to === "product") {
                return offer.product_ids?.includes(product.id);
            }
            return false;
        });
        if (applicableOffers.length === 0) return { finalPrice: price, bestOffer: null };
        let bestDiscount = 0;
        let bestOffer: Offer | null = null;
        for (const offer of applicableOffers) {
            let discount = 0;
            if (offer.discount_type === "percentage") {
                discount = (price * offer.discount_value) / 100;
            } else {
                discount = offer.discount_value;
            }
            if (discount > bestDiscount) {
                bestDiscount = discount;
                bestOffer = offer;
            }
        }
        const finalPrice = Math.max(0, Math.round(price - bestDiscount));
        return { finalPrice, bestOffer };
    }, [activeOffers]);
    return {
        offers: activeOffers,
        isLoading,
        error,
        calculateBestOffer
    };
}