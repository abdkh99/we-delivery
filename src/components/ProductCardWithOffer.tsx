"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Package, CheckCircle, XCircle, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getCategoryArabic } from "@/lib/translations";
import FavoriteButton from "./FavoriteButton";
import ProductOfferBadge from "./ProductOfferBadge";

interface ProductCardWithOfferProps {
  product: any;
  selectedVariant: any;
  hasVariants: boolean;
  variantImages: Record<string, string | null>;
  onAddToCart: (productId: string, variantId?: string) => void;
  addingToCart: string | null;
  user: any;
}

export default function ProductCardWithOffer({
  product,
  selectedVariant,
  hasVariants,
  variantImages,
  onAddToCart,
  addingToCart,
  user,
}: ProductCardWithOfferProps) {
  const currentPrice = selectedVariant?.price || product.price;
  const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);

  return (
    <div className="bg-white rounded-3xl border border-transparent hover:border-blue-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
      <Link href={`/products/${product.id}`} className="block flex flex-col">
        <div className="relative overflow-hidden rounded-2xl aspect-square bg-gradient-to-br from-gray-50 to-gray-100">
          {variantImages[product.id] || product.image_url ? (
            <Image
              src={variantImages[product.id] || product.image_url || ""}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="h-12 w-12 text-gray-400" />
            </div>
          )}

          {/* Offer Badge */}
          <ProductOfferBadge
            productId={product.id}
            productCategory={product.category}
            originalPrice={currentPrice}
            onPriceCalculated={(finalPrice) => {
              setDiscountedPrice(finalPrice);
            }}
          />

          <div className="absolute top-3 right-3 flex gap-2">
            <div className="bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-blue-600">
              {getCategoryArabic(product.category)}
            </div>
            {hasVariants && (
              <div className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1 shadow-sm">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
                <span>{product.product_variants?.length || 0} نكهات</span>
              </div>
            )}
          </div>
          <div className="absolute top-3 left-3 z-10">
            <div className="bg-white/90 backdrop-blur rounded-full p-2 shadow-md">
              <FavoriteButton productId={product.id} size={20} />
            </div>
          </div>
        </div>

        <div className="flex-1 mt-4 px-3 sm:px-4 pb-4">
          <h3 className="font-bold text-gray-900 text-base sm:text-lg line-clamp-2">
            {product.name}
          </h3>

          <p className="text-sm text-gray-600 mt-2 line-clamp-2 min-h-[40px]">
            {product.description || ""}
          </p>

          <div className="flex items-center justify-between mt-4">
            <div>
              <p className="text-xs text-gray-500">السعر</p>
              {discountedPrice && discountedPrice < currentPrice ? (
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(discountedPrice)}
                  </p>
                  <p className="text-sm text-gray-400 line-through">
                    {formatCurrency(currentPrice)}
                  </p>
                </div>
              ) : (
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(currentPrice)}
                </p>
              )}
            </div>

            {hasVariants && selectedVariant ? (
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 ${
                  (selectedVariant.stock_estimate || 0) > 0
                    ? "bg-green-50 text-green-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {(selectedVariant.stock_estimate || 0) > 0 ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    متوفر ({selectedVariant.stock_estimate})
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3" />
                    غير متوفر
                  </>
                )}
              </span>
            ) : !hasVariants ? (
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  (product.stock_estimate || 0) > 0
                    ? "bg-green-50 text-green-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {(product.stock_estimate || 0) > 0
                  ? `متوفر (${product.stock_estimate})`
                  : "غير متوفر"}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      {user && (
        <div className="px-3 sm:px-4 pb-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              onAddToCart(product.id, selectedVariant?.id);
            }}
            disabled={
              addingToCart === product.id ||
              (hasVariants && !selectedVariant) ||
              (hasVariants && selectedVariant && (selectedVariant.stock_estimate || 0) === 0) ||
              (!hasVariants && (product.stock_estimate || 0) === 0)
            }
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {addingToCart === product.id ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                جاري الإضافة...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                أضف للسلة
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
