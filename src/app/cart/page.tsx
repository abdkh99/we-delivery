"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { mutate } from "swr";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Navigation from "@/components/Navigation";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatCurrency,
  calculateDeliveryFee,
  calculatePlatformCommission,
} from "@/lib/utils";
import { getCategoryArabic } from "@/lib/translations";
import {
  Package,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CheckCircle,
  AlertCircle,
  Coins,
  DollarSign,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CartSkeleton } from "@/components/CartSkeleton";

const AddressStepDynamic = dynamic(() => import("@/components/AddressStep"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
  ),
});

export default function CartPage() {
  const { user } = useAuth();
  const {
    items,
    updateQuantity,
    removeItem,
    getTotalPrice,
    clearCart,
    updateItemPaymentMethod,
    getPointsNeeded,
    getCashNeeded,
  } = useCart();

  const router = useRouter();
  const [selectedAddress, setSelectedAddress] = useState<{
    id?: string;
    lat: number;
    lng: number;
    street: string;
    neighborhood: string;
    city: string;
    address_details: string;
    contact_phone?: string;
    label: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [loadingPoints, setLoadingPoints] = useState(true);

  const totalPrice = getTotalPrice();
  const deliveryFee = calculateDeliveryFee(1, totalPrice);
  const platformCommission = calculatePlatformCommission(totalPrice);

  const pointsNeeded = getPointsNeeded();
  const cashNeeded = getCashNeeded() + deliveryFee + platformCommission;

  useEffect(() => {
    const fetchUserPoints = async () => {
      if (!user) {
        setLoadingPoints(false);
        return;
      }

      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          console.log("✅ User points loaded:", data.points);
          setUserPoints(data.points || 0);
        } else {
          console.error("❌ Failed to fetch points:", response.status);
        }
      } catch (error) {
        console.error("❌ Error fetching user points:", error);
      } finally {
        setLoadingPoints(false);
      }
    };

    fetchUserPoints();
  }, [user]);

  const handleCheckout = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (items.length === 0) {
      toast.error("Cart is empty", {
        description: "Add some items to your cart first",
        icon: <AlertCircle className="h-5 w-5" />,
      });
      return;
    }

    if (!selectedAddress) {
      toast.error("عنوان التوصيل مطلوب", {
        description: "يرجى اختيار عنوان التوصيل أو إضافة عنوان جديد",
        icon: <AlertCircle className="h-5 w-5" />,
      });
      return;
    }

    if (!selectedAddress.lat || !selectedAddress.lng) {
      toast.error("الموقع غير محدد", {
        description: "يرجى تحديد موقعك على الخريطة",
        icon: <AlertCircle className="h-5 w-5" />,
      });
      return;
    }

    if (pointsNeeded > userPoints) {
      toast.error("نقاط غير كافية", {
        description: `تحتاج ${pointsNeeded} نقطة لكن لديك ${userPoints} فقط`,
        icon: <AlertCircle className="h-5 w-5" />,
      });
      return;
    }

    // ==========================================
    // 🔥 FIX: Removed frontend validation - let backend handle it
    // ==========================================
    setIsProcessing(true);

    console.log("🚀 Starting Checkout...");

    // Build full address string
    const fullAddress = [
      selectedAddress.street,
      selectedAddress.neighborhood,
      selectedAddress.city,
      selectedAddress.address_details,
    ]
      .filter(Boolean)
      .join(", ");

    const checkoutData = {
      items: items.map((item) => {
        // 🔥 FIX: Enhanced product ID resolution
        // For variants: use masterProductId if available
        // If masterProductId is missing but we have variantId, we'll let the backend handle it
        // For regular products: use product.id
        let productId = item.product.id;
        let masterProductId = item.masterProductId;
        
        // If this item has a variant but no masterProductId, try to infer it
        // Note: This is a fallback - ideally masterProductId should always be set when adding to cart
        if (item.variantId && !masterProductId) {
          // If product.id looks like it might be a variant ID (UUID format), 
          // we'll let the backend handle the lookup
          console.warn(`⚠️ Item missing masterProductId:`, {
            productId: item.product.id,
            variantId: item.variantId,
            productName: item.product.name,
          });
        }
        
        // If we have masterProductId, use it as the product ID
        if (masterProductId) {
          productId = masterProductId;
        }

        return {
          product: {
            id: productId,
            price: item.product.price,
            stock_estimate: item.product.stock_estimate,
            name: item.product.name, // Add name for better error messages
          },
          quantity: item.quantity,
          paymentMethod: item.paymentMethod,
          variantId: item.variantId || null,
          // 🔥 FIX: Always send masterProductId (even if null) for API to use in lookups
          masterProductId: masterProductId || null,
        };
      }),
      deliveryAddress: fullAddress,
      deliveryLat: Number(selectedAddress.lat),
      deliveryLng: Number(selectedAddress.lng),
      notes: selectedAddress.address_details || "",
    };

    console.log("📦 Checkout Data:", JSON.stringify(checkoutData, null, 2));

    const toastId = toast.loading("جاري معالجة طلبك...");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(checkoutData),
      });

      const data = await response.json();

      console.log("📥 API Response:", {
        status: response.status,
        ok: response.ok,
        data: data,
      });

      if (!response.ok) {
        console.error("❌ Checkout Failed:", data);

        toast.error("فشل إتمام الطلب", {
          id: toastId,
          description:
            data.error || data.message || data.details || "حاول مرة أخرى",
          icon: <AlertCircle className="h-5 w-5" />,
          duration: 5000,
        });
        return;
      }

      if (data.success && data.order) {
        console.log("✅ Order created successfully:", data.order.id);
        mutate("/api/products"); // ✅ Update stock cache
        clearCart();

        toast.success("تم تقديم الطلب بنجاح!", {
          id: toastId,
          description: `رقم الطلب: ${data.order.id.substring(0, 8)}...`,
          icon: <CheckCircle className="h-5 w-5" />,
          duration: 2000,
        });

        setTimeout(() => {
          router.push(`/orders/${data.order.id}`);
        }, 1000);
      } else {
        console.error("❌ Unexpected response:", data);
        toast.error("فشل إتمام الطلب", {
          id: toastId,
          description: "استجابة غير متوقعة من الخادم",
          icon: <AlertCircle className="h-5 w-5" />,
        });
      }
    } catch (error) {
      console.error("❌ Checkout exception:", error);
      toast.error("خطأ في الاتصال", {
        id: toastId,
        description: "تحقق من اتصالك بالإنترنت وحاول مرة أخرى",
        icon: <AlertCircle className="h-5 w-5" />,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Show skeleton while loading points
  if (loadingPoints && user) {
    return <CartSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="text-center py-8 sm:py-12">
            <ShoppingBag className="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-gray-500" />
            <h3 className="mt-4 text-base sm:text-lg font-medium text-gray-900">
              سلة التسوق فارغة
            </h3>
            <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-sm mx-auto">
              ابدأ بإضافة بعض المنتجات إلى سلة التسوق
            </p>
            <Link
              href="/products"
              className="mt-4 sm:mt-6 inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              تصفح المنتجات
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            سلة التسوق
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            راجع طلبك قبل الإتمام
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Products Section */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  <span>المنتجات في السلة ({items.length})</span>
                </h2>
              </div>

              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const itemTotal = item.product.price * item.quantity;
                  const itemPoints = Math.ceil(itemTotal / 10);
                  const canAffordWithPoints =
                    user && userPoints >= itemPoints && !loadingPoints;

                  return (
                    <div
                      key={`${item.product.id}-${item.variantId || "default"}`}
                      className="p-3 sm:p-6 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex gap-3 sm:gap-4">
                        {/* Product Image - Mobile Optimized */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                          {item.product.image_url ? (
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0 flex flex-col">
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm sm:text-base font-bold text-gray-900 line-clamp-2 leading-tight">
                                {item.product.name}
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {getCategoryArabic(item.product.category)}
                              </p>
                              <p className="text-lg sm:text-xl font-bold text-blue-600 mt-1">
                                {formatCurrency(item.product.price)}
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                removeItem(item.product.id, item.variantId)
                              }
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                              aria-label="حذف المنتج"
                            >
                              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          </div>

                          {/* Quantity Control - Mobile Optimized */}
                          <div className="flex items-center justify-between mt-2 gap-3">
                            <span className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap">
                              الكمية:
                            </span>
                            <div className="flex items-center gap-1 bg-gray-100 rounded-xl px-2 py-1.5 border border-gray-200">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.product.id,
                                    item.quantity - 1,
                                    item.variantId
                                  )
                                }
                                className="p-1.5 hover:bg-white rounded-lg transition-colors active:scale-95"
                                aria-label="تقليل الكمية"
                              >
                                <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </button>
                              <span className="w-8 text-center font-bold text-gray-900 text-sm sm:text-base">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.product.id,
                                    item.quantity + 1,
                                    item.variantId
                                  )
                                }
                                disabled={
                                  item.quantity >= item.product.stock_estimate
                                }
                                className="p-1.5 hover:bg-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                                aria-label="زيادة الكمية"
                              >
                                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Payment Method - Mobile Optimized */}
                          <div className="mt-3 space-y-2">
                            <span className="text-xs sm:text-sm font-medium text-gray-600 block">
                              طريقة الدفع:
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() =>
                                  updateItemPaymentMethod(
                                    item.product.id,
                                    "cash",
                                    item.variantId
                                  )
                                }
                                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all text-xs sm:text-sm font-semibold ${
                                  item.paymentMethod === "cash"
                                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                                    : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50"
                                } active:scale-95`}
                              >
                                <DollarSign className="h-4 w-4" />
                                <span>نقداً</span>
                              </button>
                              <button
                                onClick={() =>
                                  updateItemPaymentMethod(
                                    item.product.id,
                                    "points",
                                    item.variantId
                                  )
                                }
                                disabled={!canAffordWithPoints}
                                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all text-xs sm:text-sm font-semibold ${
                                  item.paymentMethod === "points"
                                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                                    : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50"
                                } disabled:opacity-40 disabled:cursor-not-allowed active:scale-95`}
                                title={
                                  !user
                                    ? "سجل الدخول لاستخدام النقاط"
                                    : userPoints < itemPoints
                                    ? `تحتاج ${
                                        itemPoints - userPoints
                                      } نقطة إضافية`
                                    : `ادفع بـ ${itemPoints} نقطة`
                                }
                              >
                                <Coins className="h-4 w-4" />
                                <span className="truncate">
                                  {loadingPoints
                                    ? "..."
                                    : `${itemPoints} نقطة`}
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Total - Mobile Optimized */}
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                            <span className="text-xs sm:text-sm font-semibold text-gray-700">
                              المجموع:
                            </span>
                            <div className="text-right">
                              <span className="text-base sm:text-lg font-bold text-blue-600">
                                {item.paymentMethod === "points" ? (
                                  <span className="text-blue-600">
                                    {itemPoints} نقطة
                                  </span>
                                ) : (
                                  formatCurrency(itemTotal)
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
                <button
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700 text-sm font-medium inline-flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  مسح السلة
                </button>
              </div>
            </div>
          </div>

          {/* Summary Section - Mobile Optimized */}
          <div className="lg:col-span-1 space-y-3 sm:space-4 md:space-y-6">
            {/* Order Summary Card */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 sticky top-2 sm:top-4 md:top-8 z-10">
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-green-600 flex-shrink-0" />
                  <span>ملخص الطلب</span>
                </h2>
              </div>

              <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-5">
                {user && (
                  <div className="p-2.5 sm:p-3 bg-blue-50 rounded-lg flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                        النقاط المتاحة:
                      </span>
                    </div>
                    <span className="text-sm sm:text-base md:text-lg font-bold text-blue-600 whitespace-nowrap">
                      {loadingPoints ? "..." : userPoints.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Address Selection Section - Mobile Optimized */}
                <div className="space-y-2 sm:space-y-3">
                  <label className="block text-xs sm:text-sm md:text-base font-bold text-gray-900 mb-2 sm:mb-3 text-right px-1">
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0" />
                      <span>عنوان التوصيل</span>
                      <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 border-2 border-dashed border-gray-200">
                    <AddressStepDynamic
                      onAddressSelected={setSelectedAddress}
                      selectedAddressId={selectedAddress?.id}
                      className="w-full"
                    />
                  </div>
                  {selectedAddress && (
                    <div className="mt-2 sm:mt-3 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg sm:rounded-xl shadow-sm">
                      <p className="text-xs sm:text-sm md:text-base text-green-800 flex items-center gap-1.5 sm:gap-2 text-right mb-1.5 sm:mb-2 font-bold">
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        <span>✓ العنوان المحدد</span>
                      </p>
                      <div className="text-right space-y-1">
                        <p className="text-xs sm:text-sm font-semibold text-green-900 line-clamp-1">
                          {selectedAddress.street}
                        </p>
                        {selectedAddress.neighborhood && (
                          <p className="text-[10px] sm:text-xs text-green-700 line-clamp-1">
                            {selectedAddress.neighborhood}
                          </p>
                        )}
                        {selectedAddress.address_details && (
                          <p className="text-[10px] sm:text-xs text-green-600 mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-green-200 line-clamp-2">
                            {selectedAddress.address_details}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-gray-200">
                  {pointsNeeded > 0 && (
                    <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                      <span className="text-gray-700 flex items-center gap-1 min-w-0">
                        <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                        <span className="truncate">الدفع بالنقاط:</span>
                      </span>
                      <span className="font-semibold text-blue-600 whitespace-nowrap">
                        {pointsNeeded} نقطة
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                    <span className="text-gray-700 truncate">الدفع النقدي:</span>
                    <span className="text-gray-700 whitespace-nowrap">
                      {formatCurrency(getCashNeeded())}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                    <span className="text-gray-700 truncate">رسوم التوصيل:</span>
                    <span className="text-gray-700 whitespace-nowrap">
                      {deliveryFee === 0
                        ? "مجاني 🎉"
                        : formatCurrency(deliveryFee)}
                    </span>
                  </div>

                  {platformCommission > 0 && (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mt-1 sm:mt-2">
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs sm:text-sm font-semibold text-yellow-900 truncate">
                            💰 رسوم المنصة
                          </span>
                          <span className="text-[10px] sm:text-xs text-yellow-700">
                            (تمويل تطوير الخدمة)
                          </span>
                        </div>
                        <span className="text-sm sm:text-base md:text-lg font-bold text-yellow-900 whitespace-nowrap">
                          {formatCurrency(platformCommission)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm sm:text-base md:text-lg font-semibold pt-2 sm:pt-3 border-t border-gray-200 gap-2">
                    <span className="text-gray-900 truncate">إجمالي النقد:</span>
                    <span className="text-blue-600 whitespace-nowrap">
                      {formatCurrency(cashNeeded)}
                    </span>
                  </div>

                  {pointsNeeded > userPoints && (
                    <div className="mt-2 sm:mt-3 p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs sm:text-sm text-red-700 flex items-center gap-1.5 sm:gap-2">
                        <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="leading-relaxed">
                          نقاط غير كافية! تحتاج {pointsNeeded - userPoints} نقطة
                          إضافية.
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={
                    !user ||
                    !selectedAddress ||
                    !selectedAddress.lat ||
                    !selectedAddress.lng ||
                    isProcessing ||
                    pointsNeeded > userPoints
                  }
                  className="w-full bg-blue-600 text-white py-2.5 sm:py-3 md:py-4 px-3 sm:px-4 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base shadow-lg disabled:shadow-none"
                >
                  {isProcessing ? (
                    <>
                      جاري المعالجة...
                      <LoadingSpinner size="small" color="blue" />
                    </>
                  ) : !user ? (
                    "سجل الدخول للمتابعة"
                  ) : !selectedAddress ? (
                    "اختر عنوان التوصيل"
                  ) : pointsNeeded > userPoints ? (
                    "نقاط غير كافية"
                  ) : (
                    "إتمام الطلب"
                  )}
                </button>

                {!user && (
                  <p className="text-xs sm:text-sm text-gray-600 text-center">
                    <Link
                      href="/signup"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      إنشاء حساب
                    </Link>{" "}
                    أو{" "}
                    <Link
                      href="/login"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      تسجيل الدخول
                    </Link>{" "}
                    للمتابعة
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
