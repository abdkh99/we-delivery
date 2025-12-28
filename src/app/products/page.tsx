"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Link from "next/link";
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
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ProductsGridSkeleton } from "@/components/Skeleton";

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
  const { addItem } = useCart();
  const { user } = useAuth();
  const router = useRouter();

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
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortOption === "price_desc") {
      sorted.sort((a, b) => b.price - a.price);
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.created_at ?? "").getTime() -
          new Date(a.created_at ?? "").getTime()
      );
    }
    return sorted;
  }, [products, searchTerm, selectedCategory, sortOption]);

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

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 lg:py-10 space-y-6">
        {/* Filters */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="ابحث عن منتج أو فئة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white pl-12 pr-4 py-3 rounded-2xl text-gray-900 placeholder:text-gray-500 transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white pl-4 pr-12 py-3 rounded-2xl text-sm text-gray-900"
                >
                  <option value="">كل الفئات</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {getCategoryArabic(category)}
                    </option>
                  ))}
                </select>
                <SlidersHorizontal className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
                  className="appearance-none bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white pl-4 pr-12 py-3 rounded-2xl text-sm text-gray-900"
                >
                  <option value="newest">الأحدث</option>
                  <option value="price_asc">الأقل سعراً</option>
                  <option value="price_desc">الأعلى سعراً</option>
                </select>
                <TrendingUp className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
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
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full"
              >
                إزالة الفلتر
              </button>
            )}
          </div>
        </section>

        {/* Product Listing */}
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

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-3xl border border-transparent hover:border-blue-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col"
                >
                  <Link
                    href={`/products/${product.id}`}
                    className="block flex flex-col"
                  >
                    <div className="relative overflow-hidden rounded-2xl aspect-square bg-gradient-to-br from-gray-50 to-gray-100">
                      {variantImages[product.id] || product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={variantImages[product.id] || product.image_url || ""}
                          alt={product.name}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Package className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
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
                            <span>{productVariants.length} نكهات</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 mt-4 px-3 sm:px-4 pb-4">
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg line-clamp-2">
                        {product.name}
                      </h3>

                      <p className="text-sm text-gray-600 mt-2 line-clamp-2 min-h-[40px]">
                        {product.description || "منتج طازج من موردينا المحليين."}
                      </p>

                      <div className="flex items-center justify-between mt-4">
                        <div>
                          <p className="text-xs text-gray-500">السعر</p>
                          <p className="text-xl font-bold text-blue-600">
                            {formatCurrency(selectedVariant?.price || product.price)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="px-3 sm:px-4 pb-4 flex flex-col gap-3 mt-auto w-full">
                    {/* RADIO BUTTONS FOR VARIANTS */}
                    {hasVariants && (
                      <div className="bg-gray-50 rounded-2xl p-3 space-y-2">
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          🎨 اختر النكهة:
                        </p>
                        <div className="space-y-2">
                          {productVariants.map((variant) => {
                            const isOutOfStock = (variant.stock_estimate || 0) === 0;
                            const isSelected = selectedVariantId === variant.id;

                            return (
                              <label
                                key={variant.id}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                                  isOutOfStock
                                    ? "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed"
                                    : isSelected
                                    ? "bg-blue-50 border-blue-500"
                                    : "bg-white border-gray-200 hover:border-blue-300"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`variant-${product.id}`}
                                  value={variant.id}
                                  checked={isSelected}
                                  disabled={isOutOfStock}
                                  onChange={(e) => {
                                    if (!isOutOfStock) {
                                      setSelectedVariants((prev) => ({
                                        ...prev,
                                        [product.id]: e.target.value,
                                      }));
                                      setVariantImages((prev) => ({
                                        ...prev,
                                        [product.id]: variant.image_url,
                                      }));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:cursor-not-allowed"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span
                                      className={`font-medium text-sm ${
                                        isOutOfStock
                                          ? "text-gray-400"
                                          : "text-gray-900"
                                      }`}
                                    >
                                      {variant.variant_name}
                                    </span>
                                    {isOutOfStock ? (
                                      <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                                        <XCircle className="w-3 h-3" />
                                        غير متوفر
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                                        <CheckCircle className="w-3 h-3" />
                                        متوفر ({variant.stock_estimate})
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {formatCurrency(variant.price)}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ADD TO CART BUTTON */}
                    <button
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
                              toast.error("من فضلك اختر النكهة ", {
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

                            // CRITICAL: Check variant stock
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
                              variant.id
                            );
                          } else {
                            // Product without variants
                            if ((product.stock_estimate || 0) === 0) {
                              toast.error("المنتج غير متوفر حالياً", {
                                icon: <XCircle className="h-5 w-5" />,
                              });
                              setAddingToCart(null);
                              return;
                            }

                            addItem(product, 1);
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
                      className={`w-full py-3 rounded-2xl transition-all flex items-center justify-center gap-2 font-semibold text-sm ${
                        hasVariants && !selectedVariantId
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : hasVariants &&
                            selectedVariant &&
                            (selectedVariant.stock_estimate || 0) === 0
                          ? "bg-red-100 text-red-600 cursor-not-allowed"
                          : !hasVariants && (product.stock_estimate || 0) === 0
                          ? "bg-red-100 text-red-600 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
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
                    </button>
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
