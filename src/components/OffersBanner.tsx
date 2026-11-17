"use client";

import { useState, useEffect } from "react";
import { Alert, AlertTitle, Box, Chip, Typography } from "@mui/material";
import { LocalOffer as MuiLocalOffer, Close } from "@mui/icons-material";
import { formatCurrency } from "@/lib/utils";

interface Offer {
  id: string;
  title: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  start_date: string;
  end_date: string;
  applicable_to: "all" | "category" | "product";
  category_filter?: string;
  product_ids?: string[];
}

interface OffersBannerProps {
  productId?: string;
  productCategory?: string;
  onClose?: () => void;
}

export default function OffersBanner({
  productId,
  productCategory,
  onClose,
}: OffersBannerProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await fetch("/api/offers");
      if (response.ok) {
        const { offers: fetchedOffers } = await response.json();
        
        // Filter offers based on applicability
        const applicableOffers = fetchedOffers.filter((offer: Offer) => {
          if (offer.applicable_to === "all") return true;
          if (offer.applicable_to === "category" && productCategory) {
            return offer.category_filter === productCategory;
          }
          if (offer.applicable_to === "product" && productId) {
            return offer.product_ids?.includes(productId);
          }
          return false;
        });

        setOffers(applicableOffers);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || offers.length === 0) {
    return null;
  }

  const formatDiscount = (offer: Offer) => {
    if (offer.discount_type === "percentage") {
      return `${offer.discount_value}% OFF`;
    } else {
      return `${formatCurrency(offer.discount_value)} OFF`;
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      {offers.map((offer) => (
        <Alert
          key={offer.id}
          severity="info"
          icon={<MuiLocalOffer />}
          action={
            onClose && (
              <Close
                onClick={onClose}
                sx={{ cursor: "pointer" }}
                fontSize="small"
              />
            )
          }
          sx={{
            mb: 1,
            bgcolor: "primary.light",
            color: "primary.contrastText",
            "& .MuiAlert-icon": {
              color: "primary.main",
            },
          }}
        >
          <AlertTitle sx={{ fontWeight: "bold", mb: 0.5 }}>
            {offer.title}
          </AlertTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label={formatDiscount(offer)}
              color="primary"
              size="small"
              sx={{ fontWeight: "bold" }}
            />
            {offer.description && (
              <Typography variant="body2" component="span">
                {offer.description}
              </Typography>
            )}
          </Box>
        </Alert>
      ))}
    </Box>
  );
}

// Helper function to calculate discounted price
export function calculateDiscountedPrice(
  originalPrice: number,
  offers: Offer[]
): { finalPrice: number; discount: number; appliedOffer?: Offer } {
  if (!offers || offers.length === 0) {
    return { finalPrice: originalPrice, discount: 0 };
  }

  // Apply the best offer (highest discount)
  let bestDiscount = 0;
  let bestOffer: Offer | undefined;

  for (const offer of offers) {
    let discount = 0;
    if (offer.discount_type === "percentage") {
      discount = (originalPrice * offer.discount_value) / 100;
    } else {
      discount = offer.discount_value;
    }

    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestOffer = offer;
    }
  }

  const finalPrice = Math.max(0, originalPrice - bestDiscount);
  return {
    finalPrice: Math.round(finalPrice),
    discount: Math.round(bestDiscount),
    appliedOffer: bestOffer,
  };
}
