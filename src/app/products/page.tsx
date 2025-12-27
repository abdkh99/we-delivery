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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [variantImages, setVariantImages] = useState<Record<string, string | null>>({});
  // ✅ تتبع stock للنكهة المختارة
  const [variantStocks, setVariantStocks] = useState<Record<string, number>>({});
  
  const { addItem } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const { data, error, isLoading } = useSWR<{ products: ProductWithVariants[] }>(
    "/api/products",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      refreshInterval: 0,
      dedupingInterval: 2000,
      revalidateIfStale: true,
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

  // 🔧 دالة مساعدة لحساب حالة المخزون والزر
  const getProductStockStatus = (product: ProductWithVariants) => {
    const hasVariants = product.product_variants && product.product_variants.length > 0;
    const selectedVariantId = selectedVariants[product.id];
    
    // للمنتجات بدون نكهات
    if (!hasVariants) {
      const stock = product.stock_estimate ?? 0;
      return {
        currentStock: stock,
        isOutOfStock: stock === 0,
        isVariantSelected: false,
        hasVariants: false,
      };
    }
    
    // للمنتجات بنكهات - لم يتم اختيار نكهة
    if (!selectedVariantId) {
      return {
        currentStock: 0,
        isOutOfStock: false,
        isVariantSelected: false,
        hasVariants: true,
      };
    }
    
    // للمنتجات بنكهات - تم اختيار نكهة
    const stock = variantStocks[product.id] ?? 0;
    return {
      currentStock: stock,
      isOutOfStock: stock === 0,
      isVariantSelected: true,
      hasVariants: true,
    };
  };

  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="mb-4 sm:mb-6 lg:mb-8 space-y-3">
            <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-48 animate-shimmer bg-[length:200%_100%]" />
            <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-64 animate-shimmer bg-[length:200%_100%] animate-delay-100" />
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
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
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
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                : "space-y-4"
            }
          >
            {filteredProducts.map((product) => {
              const productWithVariants = product as ProductWithVariants;
              const hasVariants = productWithVariants.product_variants && productWithVariants.product_variants.length > 0;
              
              // ✅ استخدام الدالة المساعدة لحساب حالة المخزون
              const stockStatus = getProductStockStatus(productWithVariants);

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-3xl border border-transparent hover:border-blue-200 shadow-sm hover:shadow-lg transition-all duration-300 flex ${
                    viewMode === "grid" ? "flex-col" : "flex-row gap-4"
                  }`}
                >
                  <Link
                    href={`/products/${product.id}`}
                    className={`block ${viewMode === "grid" ? "flex flex-col" : "flex flex-row gap-6"}`}
                  >
                    <div
                      className={`relative overflow-hidden rounded-2xl ${
                        viewMode === "grid" ? "aspect-square" : "w-40 h-40"
                      } bg-gradient-to-br from-gray-50 to-gray-100`}
                    >
                      {variantImages[product.id] || product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            variantImages[product.id] || product.image_url || ""
                          }
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
                            <span>
                              {productWithVariants.product_variants!.length} نكهات
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={`flex-1 ${viewMode === "grid" ? "mt-4 px-3 sm:px-4 pb-4" : ""}`}>
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg line-clamp-2">
                        {product.name}
                      </h3>

                      <p className="text-sm text-gray-600 mt-2 line-clamp-2 min-h-[40px]">
                        {product.description || "منتج طازج من موردينا المحليين."}
                      </p>

                      <div className="flex items-center justify-between mt-4">
                        <div>
                          <p className="text-xs text-gray-500">السعر الحالي</p>
                          <p className="text-xl font-bold text-blue-600">
                            {formatCurrency(product.price)}
                          </p>
                        </div>

                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            product.stock_estimate > 0
                              ? "bg-green-50 text-green-600"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {product.stock_estimate > 0
                            ? `متوفر (${product.stock_estimate})`
                            : "غير متوفر حالياً"}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="px-3 sm:px-4 pb-4 flex flex-col gap-2 mt-auto w-full">
                    {hasVariants ? (
                      <select
                        value={selectedVariants[product.id] || ""}
                        onChange={(e) => {
                          const variantId = e.target.value;
                          setSelectedVariants((prev) => ({
                            ...prev,
                            [product.id]: variantId,
                          }));
                          
                          if (variantId) {
                            const selectedVariant = productWithVariants.product_variants!.find((v) => v.id === variantId);
                            if (selectedVariant) {
                              // ✅ تحديث الصورة والمخزون
                              setVariantImages((prev) => ({
                                ...prev,
                                [product.id]: selectedVariant.image_url || null,
                              }));
                              setVariantStocks((prev) => ({
                                ...prev,
                                [product.id]: selectedVariant.stock_estimate || 0,
                              }));
                            }
                          } else {
                            // ✅ إعادة تعيين عند إزالة الاختيار
                            setVariantImages((prev) => ({
                              ...prev,
                              [product.id]: null,
                            }));
                            setVariantStocks((prev) => ({
                              ...prev,
                              [product.id]: 0,
                            }));
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-2xl text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
                      >
                        <option value="">🎨 اختر النكهة</option>
                        {productWithVariants.product_variants!.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.variant_name} - {formatCurrency(variant.price)}
                            {(variant.stock_estimate || 0) === 0 ? " (غير متوفر)" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Link
                        href={`/products/${product.id}`}
                        className="w-full bg-gray-100 text-gray-800 py-3 px-4 rounded-2xl hover:bg-gray-200 transition-colors text-center font-medium text-sm"
                      >
                        عرض التفاصيل
                      </Link>
                    )}

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

                        // ✅ التحقق من النكهة قبل الإضافة
                        if (hasVariants) {
                          const selectedVariantId = selectedVariants[product.id];
                          if (!selectedVariantId) {
                            toast.error("من فضلك اختر النكهة ⚠️", {
                              description: "يجب اختيار نكهة قبل الإضافة للسلة",
                              icon: <AlertCircle className="h-5 w-5" />,
                            });
                            return;
                          }

                          const selectedVariant = productWithVariants.product_variants!.find(
                            (v) => v.id === selectedVariantId
                          );

                          // ✅ التحقق من المخزون
                          if (!selectedVariant || (selectedVariant.stock_estimate || 0) === 0) {
                            toast.error("النكهة المختارة غير متوفرة ❌", {
                              description: "الرجاء اختيار نكهة أخرى متوفرة",
                              icon: <XCircle className="h-5 w-5" />,
                            });
                            return;
                          }
                        } else {
                          // ✅ التحقق من المخزون للمنتجات بدون نكهات
                          if ((product.stock_estimate || 0) === 0) {
                            toast.error("المنتج غير متوفر ❌", {
                              description: "هذا المنتج غير متوفر حالياً",
                              icon: <XCircle className="h-5 w-5" />,
                            });
                            return;
                          }
                        }

                        setAddingToCart(product.id);
                        try {
                          if (hasVariants) {
                            const selectedVariantId = selectedVariants[product.id];
                            const selectedVariant = productWithVariants.product_variants!.find(
                              (v) => v.id === selectedVariantId
                            );
                            
                            if (selectedVariant) {
                              addItem(
                                {
                                  ...product,
                                  id: selectedVariant.id,
                                  name: `${product.name} - ${selectedVariant.variant_name}`,
                                  price: selectedVariant.price,
                                  stock_estimate: selectedVariant.stock_estimate || 0,
                                  sku: selectedVariant.variant_sku,
                                  image_url: selectedVariant.image_url || product.image_url,
                                },
                                1,
                                selectedVariant.id
                              );
                            }
                          } else {
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
                      disabled={
                        addingToCart === product.id ||
                        (stockStatus.hasVariants
                          ? !stockStatus.isVariantSelected || stockStatus.isOutOfStock
                          : stockStatus.isOutOfStock)
                      }
                      className={`w-full py-3 rounded-2xl transition-all flex items-center justify-center gap-2 font-semibold text-sm ${
                        addingToCart === product.id ||
                        (stockStatus.hasVariants
                          ? !stockStatus.isVariantSelected || stockStatus.isOutOfStock
                          : stockStatus.isOutOfStock)
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed opacity-60"
                          : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                      }`}
                      title={
                        stockStatus.hasVariants && !stockStatus.isVariantSelected
                          ? "الرجاء اختيار النكهة أولاً"
                          : stockStatus.isOutOfStock
                          ? stockStatus.hasVariants
                            ? "النكهة المختارة غير متوفرة حالياً"
                            : "غير متوفر حالياً"
                          : "إضافة إلى السلة"
                      }
                    >
                      {addingToCart === product.id ? (
                        <>
                          <LoadingSpinner size="small" color="white" />
                          <span>جاري الإضافة...</span>
                        </>
                      ) : stockStatus.hasVariants && !stockStatus.isVariantSelected ? (
                        <>
                          <AlertCircle className="h-4 w-4" />
                          <span>اختر النكهة أولاً</span>
                        </>
                      ) : stockStatus.isOutOfStock ? (
                        <>
                          <XCircle className="h-4 w-4" />
                          <span>غير متوفر</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          <span>إضافة للسلة</span>
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
