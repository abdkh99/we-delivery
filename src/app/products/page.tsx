"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Link from "next/link";
import Image from "next/image";
import Navigation from "@/components/Navigation";
import { Database } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { getCategoryArabic } from "@/lib/translations";
import {
  Package,
  Search,
  SlidersHorizontal,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  LogIn,
  TrendingUp,
  XCircle,
  Heart,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  OutlinedInput,
  InputAdornment
} from "@mui/material";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import { RippleButton } from "@/components/ui/RippleButton";
import { ProductsGridSkeleton } from "@/components/Skeleton";
import FavoriteButton from "@/components/FavoriteButton";
import OffersBanner from "@/components/OffersBanner";
import ProductOfferBadge from "@/components/ProductOfferBadge";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface ProductVariant {
  id: string;
  master_product_id: string;
  variant_name: string;
  variant_sku: string;
  price: number;
  stock_estimate: number | null;
  image_url: string | null;
  description: string | null;
  display_order: number | null;
  is_active: boolean | null;
  usd_price?: number | null;
  last_synced_rate?: number | null;
  price_updated_at?: string | null;
}

interface ProductWithVariants extends Product {
  product_variants?: ProductVariant[];
}

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortOption, setSortOption] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [variantImages, setVariantImages] = useState<Record<string, string | null>>({});
  const [showFavorites, setShowFavorites] = useState(true);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // إغلاق الـ dropdown عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const openKeys = Object.keys(openDropdowns).filter(k => openDropdowns[k]);
      if (openKeys.length === 0) return;
      for (const key of openKeys) {
        if (dropdownRefs.current[key] && !dropdownRefs.current[key]!.contains(e.target as Node)) {
          setOpenDropdowns(prev => ({ ...prev, [key]: false }));
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdowns]);
  const { addItem } = useCart();
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const router = useRouter();

  // Fetch active offers
  const { data: offersData } = useSWR<{ offers: any[] }>(
    "/api/offers",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const activeOffers = useMemo(() => offersData?.offers ?? [], [offersData]);

  // Helper to calculate best offer for a product
  const calculateBestOffer = useCallback((product: Product, price: number) => {
    if (!activeOffers.length) return { finalPrice: price, bestOffer: null };

    const applicableOffers = activeOffers.filter((offer) => {
      if (!offer.is_active) return false;
      if (offer.valid_until && new Date(offer.valid_until) < new Date()) return false;

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
    let bestOffer = null;

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


  const { data, error, isLoading } = useSWR<{ products: ProductWithVariants[] }>(
    "/api/products",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      refreshInterval: 0,
      dedupingInterval: 60000,
      revalidateIfStale: false,
      keepPreviousData: true,
    }
  );

  const products = useMemo(() => data?.products ?? [], [data?.products]);

  // Pre-calculate prices and offers for all products
  const productOffersMap = useMemo(() => {
    const map = new Map();
    products.forEach(p => {
      const { finalPrice, bestOffer } = calculateBestOffer(p, p.price);
      map.set(p.id, { finalPrice, bestOffer });
    });
    return map;
  }, [products, calculateBestOffer]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((p) => p.category)
            .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
        )
      ),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const base = products.filter((product) => {
      const normalizedName = product.name?.toLowerCase() ?? "";
      const normalizedDescription = product.description?.toLowerCase() ?? "";
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        normalizedName.includes(query) || normalizedDescription.includes(query);
      const matchesCategory =
        !selectedCategory || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    const sorted = [...base];
    if (sortOption === "price_asc") {
      sorted.sort((a, b) => {
        const priceA = productOffersMap.get(a.id)?.finalPrice ?? a.price;
        const priceB = productOffersMap.get(b.id)?.finalPrice ?? b.price;
        return priceA - priceB;
      });
    } else if (sortOption === "price_desc") {
      sorted.sort((a, b) => {
        const priceA = productOffersMap.get(a.id)?.finalPrice ?? a.price;
        const priceB = productOffersMap.get(b.id)?.finalPrice ?? b.price;
        return priceB - priceA;
      });
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.created_at ?? "").getTime() -
          new Date(a.created_at ?? "").getTime()
      );
    }
    return sorted;
  }, [products, searchTerm, selectedCategory, sortOption, productOffersMap]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
          </div>
          <ProductsGridSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  فشل تحميل المنتجات. يرجى المحاولة مرة أخرى لاحقاً.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <Navigation />

      {/* Offers Banner */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pt-4">
        <OffersBanner />
      </div>

      {/* OFFERS SECTION - Horizontal Scroll */}
      {/* Show only if there are products with discounts */}
      {products.some(p => (productOffersMap.get(p.id)?.finalPrice ?? p.price) < p.price) && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pt-6 mb-2">
          <div className="relative bg-gradient-to-r from-red-50 to-pink-50 rounded-3xl p-4 sm:p-6 border border-red-100 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full blur-3xl opacity-50 -mr-16 -mt-16"></div>

            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <div className="bg-red-100 p-2 rounded-xl">
                  <Sparkles className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">عروض مميزة 🔥</h2>
                  <p className="text-xs text-gray-500">وفر أكثر مع عروضنا الحصرية</p>
                </div>
              </div>
            </div>

            {/* Horizontal Scroll Container */}
            <div className="relative -mx-2 sm:-mx-2 lg:mx-0">
              <div
                className="flex gap-3 overflow-x-auto pb-4 px-2 sm:px-2 lg:px-0 scrollbar-hide snap-x snap-mandatory"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {products
                  .filter(p => {
                    const finalPrice = productOffersMap.get(p.id)?.finalPrice ?? p.price;
                    return finalPrice < p.price;
                  })
                  .map((product) => {
                    const currentPrice = product.price;
                    const { finalPrice: discountedPrice } =
                      productOffersMap.get(product.id) || {
                        finalPrice: currentPrice,
                        bestOffer: null,
                      };
                    const hasDiscount = discountedPrice < currentPrice;

                    return (
                      <div key={`offer-${product.id}`} className="flex-shrink-0 w-36 sm:w-44 snap-start">
                        <Link
                          href={`/products/${product.id}`}
                          className=" bg-white rounded-2xl border border-red-100 shadow-sm transition-all duration-200 overflow-hidden group h-full flex flex-col"
                        >
                          <div className="relative aspect-square bg-gray-50 overflow-hidden">
                            {product.image_url ? (
                              <Image
                                src={product.image_url}
                                alt={product.name}
                                fill
                                quality={75}
                                loading="lazy"
                                sizes="(max-width: 640px) 144px, 176px"
                                className="object-cover transition-all duration-300"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Package className="h-10 w-10 text-gray-300" />
                              </div>
                            )}

                            {/* Offer Badge Top Right */}
                            {hasDiscount && (
                              <div className="absolute top-0 right-0 z-10">
                                <div className="bg-red-600 text-white font-bold p-1.5 min-w-[3rem] text-center shadow-md rounded-bl-xl rounded-tr-none">
                                  <div className="text-[10px] leading-tight">وفر</div>
                                  <div className="text-sm font-black leading-tight">
                                    {Math.round(((currentPrice - discountedPrice) / currentPrice) * 100)}%
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Quick Add Button Overlay */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!user) {
                                  toast.error("يرجى تسجيل الدخول");
                                  return;
                                }

                                // Add with DISCOUNTED price
                                setAddingToCart(product.id);
                                // إبقاء التجربة بسيطة لتجنب تعقيدات اختيار النكهة هنا
                                router.push(`/products/${product.id}`);
                              }}
                              className="absolute bottom-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transform translate-y-10 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-200"
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="p-3 flex items-start justify-between flex-1 flex-col">
                            <h3 className="font-semibold text-xs sm:text-sm text-gray-900 line-clamp-2 mb-2 w-full">
                              {product.name}
                            </h3>
                            <div className="mt-auto w-full">
                              <div className="flex flex-col items-start">
                                <span className="text-xs text-gray-400 line-through">
                                  {formatCurrency(currentPrice)}
                                </span>
                                <span className="text-base sm:text-lg font-black text-red-600">
                                  {formatCurrency(discountedPrice)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Favorites Section - Modern Horizontal Scroll */}
      {user && favorites.length > 0 && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pt-4">
          <div className="relative">
            {/* Header - Compact & Clean */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-red-500 to-pink-500 p-2 rounded-xl shadow-lg">
                  <Heart className="h-4 w-4 text-white fill-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    مفضلاتك
                  </h2>
                  <p className="text-xs text-gray-500">
                    {favorites.length} منتج
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFavorites(!showFavorites)}
                className="text-xs sm:text-sm text-pink-600 font-semibold hover:text-pink-700 transition-colors flex items-center gap-1"
              >
                {showFavorites ? 'إخفاء' : 'عرض الكل'}
                {showFavorites ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {/* Horizontal Scroll Container */}
            {showFavorites && (
              <div className="relative -mx-3 sm:-mx-4 lg:mx-0">
                <div
                  className="flex gap-3 overflow-x-auto pb-3 px-3 sm:px-4 lg:px-0 scrollbar-hide snap-x snap-mandatory"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {products
                    .filter(p => favorites.includes(p.id))
                    .map((product) => {
                      const productVariants = (product as ProductWithVariants).product_variants || [];
                      const selectedVariantId = selectedVariants[product.id];
                      const selectedVariant = productVariants.find((v) => v.id === selectedVariantId);
                      const currentPrice = selectedVariant?.price || product.price;
                      // Note: For variants, we might want to check for specific variant offers later.
                      // For now, using product level offers map as fallback or base.
                      // A better approach for favorites is to re-calculate per variant if needed, 
                      // or just show the base product offer.
                      const { bestOffer } =
                        productOffersMap.get(product.id) || {
                          finalPrice: product.price,
                          bestOffer: null,
                        };

                      // If variant is selected, we should strictly re-calculate offer for that variant price
                      let displayDiscountedPrice = currentPrice;

                      if (bestOffer) {
                        // Re-apply offer to the selected variant price
                        if (bestOffer.discount_type === "percentage") {
                          displayDiscountedPrice = Math.round(currentPrice * (1 - bestOffer.discount_value / 100));
                        } else {
                          displayDiscountedPrice = Math.max(0, currentPrice - bestOffer.discount_value);
                        }
                      }

                      const hasDiscount = displayDiscountedPrice < currentPrice;

                      return (
                        <div
                          key={product.id}
                          className="flex-shrink-0 w-32 sm:w-40 snap-start"
                        >
                          <Link
                            href={`/products/${product.id}`}
                            className="block bg-white rounded-2xl border border-gray-100 shadow-sm  hover:border-pink-200 transition-all duration-200 overflow-hidden group"
                          >
                            {/* Image */}
                            <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                              {product.image_url ? (
                                <Image
                                  src={product.image_url}
                                  alt={product.name}
                                  fill
                                  quality={75}
                                  loading="lazy"
                                  sizes="(max-width: 640px) 128px, 160px"
                                  className="object-cover transition-transform duration-300"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Package className="h-8 w-8 text-gray-300" />
                                </div>
                              )}

                              {/* Offer Badge - Top Right */}
                              <ProductOfferBadge
                                offer={bestOffer}
                                originalPrice={currentPrice}
                                finalPrice={displayDiscountedPrice}
                              />

                              {/* Heart indicator - Top Left */}
                              <div className="absolute top-1.5 left-1.5">
                                <Heart className="h-4 w-4 text-red-500 fill-red-500 drop-shadow" />
                              </div>
                            </div>

                            {/* Info */}
                            <div className="p-2">
                              <h3 className="font-semibold text-xs text-gray-900 line-clamp-1 mb-1">
                                {product.name}
                              </h3>
                              <div className="flex items-center gap-1">
                                {hasDiscount ? (
                                  <>
                                    <span className="text-xs font-bold text-red-600">
                                      {formatCurrency(displayDiscountedPrice)}
                                    </span>
                                    <span className="text-[10px] text-gray-400 line-through">
                                      {formatCurrency(currentPrice)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs font-bold text-blue-600">
                                    {formatCurrency(currentPrice)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>

                          {/* Quick Add Button */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              if (!productVariants.length) {
                                if ((product.stock_estimate || 0) > 0) {
                                  const { finalPrice } = calculateBestOffer(product, product.price);
                                  addItem(product, 1, undefined, undefined, finalPrice);
                                  toast.success(`تمت إضافة ${product.name} للسلة`);
                                }
                              } else {
                                router.push(`/products/${product.id}`);
                              }
                            }}
                            disabled={(product.stock_estimate || 0) === 0 && !productVariants.length}
                            className=" w-full mt-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold py-2 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 transition-all flex items-center justify-center gap-1 shadow-sm"
                          >
                            <ShoppingCart className="h-3 w-3 " />
                            <span>
                              {productVariants.length > 0 ? 'اختر' : ((product.stock_estimate || 0) > 0 ? 'أضف' : 'نفذ')}
                            </span>
                          </button>
                        </div>
                      );
                    })}

                  {/* View All Card */}
                  {favorites.length > 3 && (
                    <div className="flex-shrink-0 w-24 sm:w-28 snap-start flex items-center justify-center">
                      <Link
                        href="#all-products"
                        className="flex flex-col items-center justify-center p-4 text-center hover:scale-105 transition-transform"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center mb-2 shadow-inner">
                          <span className="text-lg font-bold text-pink-600">{favorites.length}</span>
                        </div>
                        <span className="text-xs font-medium text-gray-600">عرض الكل</span>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Scroll Indicator for Desktop */}
                <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
                <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 lg:py-10 space-y-6">
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <FormControl fullWidth size="small" variant="outlined">
                <InputLabel
                  id="search-input-label"
                  sx={{
                    color: 'text.secondary',
                    '&.Mui-focused': { color: 'primary.main' },
                    fontFamily: 'inherit',
                    left: 'auto',
                    right: 28,
                    transformOrigin: 'top right'
                  }}
                >
                  ابحث عن منتج أو فئة
                </InputLabel>
                <OutlinedInput
                  id="search-input"
                  label="ابحث عن منتج أو فئة"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  dir="rtl"
                  endAdornment={
                    <InputAdornment position="end">
                      <Search className="text-gray-400 h-5 w-5" />
                    </InputAdornment>
                  }
                  sx={{
                    borderRadius: '12px',
                    fontFamily: 'inherit',
                    backgroundColor: '#f9fafb',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#e5e7eb',
                      textAlign: 'right'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#d1d5db',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3b82f6',
                      borderWidth: '1px',
                    }
                  }}
                />
              </FormControl>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Category Filter */}
              <div className="min-w-[160px]">
                <FormControl fullWidth size="small" variant="outlined">
                  <InputLabel
                    id="category-select-label"
                    shrink={true}
                    sx={{
                      color: 'text.secondary',
                      '&.Mui-focused': { color: 'primary.main' },
                      fontFamily: 'inherit'
                    }}
                  >
                    الفئة
                  </InputLabel>
                  <Select
                    labelId="category-select-label"
                    id="category-select"
                    value={selectedCategory}
                    label="الفئة"
                    onChange={(e: SelectChangeEvent) => setSelectedCategory(e.target.value)}
                    displayEmpty
                    sx={{
                      borderRadius: '12px',
                      fontFamily: 'inherit',
                      backgroundColor: '#f9fafb', // gray-50
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#e5e7eb', // gray-200
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#d1d5db', // gray-300
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b82f6', // blue-500
                        borderWidth: '1px',
                      }
                    }}
                    MenuProps={{
                      disableScrollLock: true,
                      PaperProps: {
                        sx: {
                          borderRadius: '12px',
                          marginTop: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        }
                      }
                    }}

                  >
                    <MenuItem value="">
                      كل الفئات
                    </MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category} sx={{ fontFamily: 'inherit' }}>
                        {getCategoryArabic(category)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              {/* Sort Filter */}
              <div className="min-w-[160px]">
                <FormControl fullWidth size="small" variant="outlined">
                  <InputLabel
                    id="sort-select-label"
                    sx={{
                      color: 'text.secondary',
                      '&.Mui-focused': { color: 'primary.main' },
                      fontFamily: 'inherit'
                    }}
                  >
                    الترتيب
                  </InputLabel>
                  <Select
                    labelId="sort-select-label"
                    id="sort-select"
                    value={sortOption}
                    label="الترتيب"
                    onChange={(e: SelectChangeEvent) => setSortOption(e.target.value as typeof sortOption)}
                    sx={{
                      borderRadius: '12px',
                      fontFamily: 'inherit',
                      backgroundColor: '#f9fafb', // gray-50
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#e5e7eb', // gray-200
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#d1d5db', // gray-300
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b82f6', // blue-500
                        borderWidth: '1px',
                      }
                    }}
                    MenuProps={{
                      disableScrollLock: true,
                      PaperProps: {
                        sx: {
                          borderRadius: '12px',
                          marginTop: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        }
                      }
                    }}

                  >
                    <MenuItem value="newest" sx={{ fontFamily: 'inherit' }}>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        <span>الأحدث</span>
                      </div>
                    </MenuItem>
                    <MenuItem value="price_asc" sx={{ fontFamily: 'inherit' }}>الأقل سعراً</MenuItem>
                    <MenuItem value="price_desc" sx={{ fontFamily: 'inherit' }}>الأعلى سعراً</MenuItem>
                  </Select>
                </FormControl>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span className="px-4 py-2 bg-gray-100 rounded-full">
              {filteredProducts.length} منتج
            </span>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory("")}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full cursor-pointer"
              >
                إزالة الفلتر
              </button>
            )}
          </div>
        </section>

        {filteredProducts.length === 0 ? (
          <div className="text-center bg-white rounded-3xl border border-gray-100 shadow-sm p-10">
            <Package className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-xl font-semibold text-gray-900">
              لم يتم العثور على منتجات
            </h3>
            <p className="mt-2 text-gray-600">
              جرّب تعديل كلمات البحث أو إعادة تعيين الفلاتر.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => {
              const productVariants = (product as ProductWithVariants).product_variants || [];
              const hasVariants = productVariants.length > 0;
              const selectedVariantId = selectedVariants[product.id];
              const selectedVariant = hasVariants
                ? productVariants.find((v) => v.id === selectedVariantId)
                : null;

              const currentPrice = selectedVariant?.price || product.price;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-3xl border border-transparent shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
                >
                  <Link
                    href={`/products/${product.id}`}
                    className="block flex flex-col relative"
                  >
                    <div className="relative overflow-hidden aspect-square bg-gray-50">
                      {variantImages[product.id] || product.image_url ? (
                        <Image
                          src={variantImages[product.id] || product.image_url || ""}
                          alt={product.name}
                          fill
                          quality={75}
                          loading="lazy"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover transition-transform duration-700"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Package className="h-12 w-12 text-gray-300" />
                        </div>
                      )}

                      {/* Top Right: Offer Badge */}
                      {productOffersMap.get(product.id)?.bestOffer && (
                        <ProductOfferBadge
                          offer={productOffersMap.get(product.id)?.bestOffer}
                          originalPrice={currentPrice}
                          finalPrice={productOffersMap.get(product.id)?.finalPrice}
                        />
                      )}

                      {/* Top Left: Favorites & Dynamic Status */}
                      <div className="absolute top-0 left-0 z-20 flex flex-col items-start gap-2 p-0">
                        {/* Loading/Status Badge */}
                        {addingToCart === product.id && (
                          <div className="bg-blue-600 text-white font-bold p-2 text-center min-w-[3.5rem] shadow-md rounded-br-xl rounded-tl-xl animate-pulse">
                            <div className="flex flex-col items-center justify-center leading-tight">
                              <span className="text-xs border-b border-white/30 pb-0.5 w-full mb-0.5">جاري</span>
                              <span className="text-sm font-black">الإضافة</span>
                            </div>
                          </div>
                        )}

                        {/* Out of Stock Badge */}
                        {((hasVariants && selectedVariant && (selectedVariant.stock_estimate || 0) === 0) || (!hasVariants && (product.stock_estimate || 0) === 0)) && (
                          <div className="bg-gray-800 text-white font-bold p-2 text-center min-w-[3.5rem] shadow-md rounded-br-xl rounded-tl-xl">
                            <div className="flex flex-col items-center justify-center leading-tight">
                              <span className="text-xs border-b border-white/30 pb-0.5 w-full mb-0.5">الكمية</span>
                              <span className="text-sm font-black">نفذت</span>
                            </div>
                          </div>
                        )}

                        <div className="mt-2 ml-2">
                          <div className="bg-white/90 backdrop-blur rounded-full p-2 shadow-md hover:scale-110 transition-transform cursor-pointer">
                            <FavoriteButton productId={product.id} size={20} />
                          </div>
                        </div>
                      </div>

                      {/* Bottom Info Overlay - Badges only, no dark background */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-between items-end pointer-events-none">
                        <div className="text-gray-800 text-xs font-bold bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                          {getCategoryArabic(product.category)}
                        </div>
                        {hasVariants && (
                          <div className="text-blue-600 text-xs font-bold bg-blue-50/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-blue-100 shadow-sm flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                            <span>{productVariants.length} نكهات</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 p-4 flex flex-col">
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h3>

                      <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem] mb-3">
                        {product.description || ""}
                      </p>

                      <div className="mt-auto pt-3 border-t border-gray-100 flex items-end justify-between">
                        <div>
                          {(productOffersMap.get(product.id)?.finalPrice ?? currentPrice) < currentPrice ? (
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-400 line-through mb-[-4px]">
                                {formatCurrency(currentPrice)}
                              </span>
                              <span className="text-xl font-black text-red-600">
                                {formatCurrency(productOffersMap.get(product.id)?.finalPrice ?? currentPrice)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xl font-black text-gray-900">
                              {formatCurrency(currentPrice)}
                            </span>
                          )}
                        </div>

                        {/* Stock Status Text */}
                        <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
                          {(selectedVariant?.stock_estimate || product.stock_estimate || 0) > 0 ? (
                            <span className="text-green-600 flex items-center gap-0.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                              متوفر
                            </span>
                          ) : (
                            <span className="text-red-500 flex items-center gap-0.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                              نفذت الكمية
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="px-4 pb-4 bg-white mt-auto">
                    {hasVariants && (
                      <div className="mb-3">
                        <FormControl fullWidth size="small" variant="outlined">
                          <InputLabel
                            id={`variant-select-label-${product.id}`}
                            sx={{
                              color: 'text.secondary',
                              '&.Mui-focused': { color: 'primary.main' },
                              fontFamily: 'inherit'
                            }}
                          >
                            اختر النكهة
                          </InputLabel>
                          <Select
                            labelId={`variant-select-label-${product.id}`}
                            id={`variant-select-${product.id}`}
                            value={selectedVariants[product.id] || ''}
                            label="اختر النكهة"
                            onChange={(e: SelectChangeEvent) => {
                              const variantId = e.target.value;
                              const variant = productVariants.find(v => v.id === variantId);
                              if (variant) {
                                setSelectedVariants(prev => ({ ...prev, [product.id]: variantId }));
                                setVariantImages(prev => ({ ...prev, [product.id]: variant.image_url || null }));
                              }
                            }}
                            sx={{
                              borderRadius: '12px',
                              fontFamily: 'inherit',
                              backgroundColor: '#f9fafb', // gray-50
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#e5e7eb', // gray-200
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#d1d5db', // gray-300
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#3b82f6', // blue-500
                                borderWidth: '1px',
                              }
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  borderRadius: '12px',
                                  marginTop: '8px',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                }
                              }
                            }}
                          >
                            {productVariants.map((variant) => {
                              const isOutOfStock = (variant.stock_estimate || 0) === 0;
                              return (
                                <MenuItem
                                  key={variant.id}
                                  value={variant.id}
                                  disabled={isOutOfStock}
                                  sx={{
                                    fontFamily: 'inherit',
                                    justifyContent: 'space-between',
                                    padding: '10px 16px',
                                    '&.Mui-selected': {
                                      backgroundColor: '#eff6ff', // blue-50
                                      color: '#1d4ed8', // blue-700
                                      fontWeight: 600,
                                      '&:hover': {
                                        backgroundColor: '#dbeafe', // blue-100
                                      }
                                    }
                                  }}
                                >
                                  <span>{variant.variant_name}</span>
                                  <span className="text-xs font-semibold">
                                    {formatCurrency(variant.price)}
                                    {isOutOfStock && <span className="text-red-500 ml-1">(نفذت)</span>}
                                  </span>
                                </MenuItem>
                              );
                            })}
                          </Select>
                        </FormControl>
                      </div>
                    )}

                    <RippleButton
                      duration={1000}
                      onClick={async () => {
                        if (!user) {
                          toast.error("يجب تسجيل الدخول أولاً! 🔐", {
                            description: "سجل دخولك للمتابعة إلى سلة التسوق",
                            icon: <LogIn className="h-5 w-5" />,
                            action: {
                              label: "تسجيل الدخول",
                              onClick: () => router.push("/login"),
                            },
                            duration: 5000,
                          });
                          return;
                        }

                        setAddingToCart(product.id);
                        try {
                          if (hasVariants) {
                            if (!selectedVariantId) {
                              toast.error("من فضلك اختر النكهة", {
                                description: "يجب اختيار نكهة قبل الإضافة للسلة",
                                icon: <AlertCircle className="h-5 w-5" />,
                              });
                              setAddingToCart(null);
                              return;
                            }

                            const variant = productVariants.find(
                              (v) => v.id === selectedVariantId
                            );

                            if (!variant) {
                              toast.error("النكهة غير موجودة", {
                                icon: <AlertCircle className="h-5 w-5" />,
                              });
                              setAddingToCart(null);
                              return;
                            }

                            if ((variant.stock_estimate || 0) === 0) {
                              toast.error("النكهة غير متوفرة حالياً", {
                                description: "يرجى اختيار نكهة أخرى",
                                icon: <XCircle className="h-5 w-5" />,
                              });
                              setAddingToCart(null);
                              return;
                            }

                            addItem(
                              {
                                ...product,
                                id: variant.id,
                                name: `${product.name} - ${variant.variant_name}`,
                                price: variant.price,
                                stock_estimate: variant.stock_estimate || 0,
                                sku: variant.variant_sku,
                                image_url: variant.image_url || product.image_url,
                              },
                              1,
                              variant.id,
                              product.id,
                              calculateBestOffer(product, variant.price).finalPrice
                            );
                          } else {
                            if ((product.stock_estimate || 0) === 0) {
                              toast.error("المنتج غير متوفر حالياً", {
                                icon: <XCircle className="h-5 w-5" />,
                              });
                              setAddingToCart(null);
                              return;
                            }

                            addItem(
                              product,
                              1,
                              undefined,
                              undefined,
                              calculateBestOffer(product, product.price).finalPrice
                            );
                          }

                          toast.success("تم إضافة المنتج للسلة ✅", {
                            description: `تم إضافة ${product.name} إلى سلة التسوق`,
                            icon: <CheckCircle className="h-5 w-5" />,
                            position: "bottom-right",
                          });
                        } catch {
                          toast.error("فشل في إضافة المنتج ❌", {
                            description: "يرجى المحاولة مرة أخرى",
                            icon: <AlertCircle className="h-5 w-5" />,
                          });
                        } finally {
                          setAddingToCart(null);
                        }
                      }}
                      className={`w-full py-3 rounded-2xl transition-all flex items-center justify-center gap-2 font-semibold text-sm ${hasVariants && !selectedVariantId
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : hasVariants &&
                          selectedVariant &&
                          (selectedVariant.stock_estimate || 0) === 0
                          ? "bg-red-100 text-red-600 cursor-not-allowed"
                          : !hasVariants && (product.stock_estimate || 0) === 0
                            ? "bg-red-100 text-red-600 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg active:scale-[0.98]"
                        }`}
                      disabled={
                        addingToCart === product.id ||
                        (hasVariants && !selectedVariantId) ||
                        (hasVariants &&
                          selectedVariant &&
                          (selectedVariant.stock_estimate || 0) === 0) ||
                        (!hasVariants && (product.stock_estimate || 0) === 0)
                      }
                    >
                      {addingToCart === product.id ? (
                        <>
                          <LoadingSpinner size="small" color="white" />
                          <span>جاري الإضافة...</span>
                        </>
                      ) : hasVariants && !selectedVariantId ? (
                        <>
                          <AlertCircle className="h-4 w-4" />
                          اختر النكهة أولاً
                        </>
                      ) : hasVariants &&
                        selectedVariant &&
                        (selectedVariant.stock_estimate || 0) === 0 ? (
                        <>
                          <XCircle className="h-4 w-4" />
                          غير متوفر
                        </>
                      ) : !hasVariants && (product.stock_estimate || 0) === 0 ? (
                        <>
                          <XCircle className="h-4 w-4" />
                          غير متوفر
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          إضافة للسلة
                        </>
                      )}
                    </RippleButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
