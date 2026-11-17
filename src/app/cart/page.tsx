"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { mutate } from "swr";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import Navigation from "@/components/Navigation";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, calculatePlatformCommission } from "@/lib/utils";
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
} from "lucide-react";
import { toast } from "sonner";
import { CartSkeleton } from "@/components/CartSkeleton";

const AddressStepDynamic = dynamic(() => import("@/components/AddressStep"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-gray-100 h-64 rounded-lg"></div>
  ),
});

type CommissionSetting = {
  min_order_amount: number;
  max_order_amount: number | null;
  commission_percentage: number;
};

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
    getDeliveryFee,
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

  // 🔹 إعدادات العمولة الديناميكية من لوحة التحكم
  const [commissionSettings, setCommissionSettings] = useState<
    CommissionSetting[] | null
  >(null);

  const totalPrice = getTotalPrice();
  const deliveryFee = getDeliveryFee();

  // نحاول أولاً استخدام إعدادات العمولة من القاعدة، وإذا لم تتوفر نرجع للحساب القديم
  const platformCommission = (() => {
    if (!commissionSettings || commissionSettings.length === 0) {
      return calculatePlatformCommission(totalPrice);
    }

    // نفس منطق الـ checkout backend تقريباً
    for (const setting of commissionSettings) {
      const min = Number(setting.min_order_amount) || 0;
      const max =
        setting.max_order_amount === null
          ? Infinity
          : Number(setting.max_order_amount);

      if (totalPrice >= min && totalPrice < max) {
        const rate = Number(setting.commission_percentage) / 100;
        return Math.round(totalPrice * rate);
      }
    }

    // في حال لم تطابق أي شريحة، نرجع للحساب الافتراضي
    return calculatePlatformCommission(totalPrice);
  })();

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

  // جلب إعدادات العمولة العامة (لإظهارها في السلة كما في الـ checkout)
  useEffect(() => {
    const fetchCommissionSettings = async () => {
      try {
        const response = await fetch("/api/settings/commission");
        if (!response.ok) return;

        const data = await response.json();
        setCommissionSettings(data.settings || []);
      } catch (error) {
        console.error("Failed to fetch commission settings for cart:", error);
      }
    };

    fetchCommissionSettings();
  }, []);

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
        const masterProductId = item.masterProductId;

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
      <div className="min-h-screen bg-[#f0f3f4]">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <ShoppingBag className="mx-auto h-20 w-20 text-gray-300" />
          <h3 className="mt-4 text-xl font-bold text-[#0f1419]">
            سلة التسوق فارغة
          </h3>
          <p className="mt-2 text-gray-500">
            ابدأ بإضافة بعض المنتجات إلى سلة التسوق
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center px-6 py-3 rounded-full text-white bg-[#1c9cf0] hover:opacity-90 transition-opacity font-bold"
          >
            تصفح المنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f3f4] text-[#0f1419]">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">سلة التسوق</h1>
          <p className="text-gray-500">راجع طلبك قبل الإتمام</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Products Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 bg-white">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-[#1c9cf0]" />
                  <span>المنتجات ({items.length})</span>
                </h2>
              </div>

              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const effectivePrice = item.price || item.product.price;
                  const itemTotal = effectivePrice * item.quantity;
                  const itemPoints = Math.ceil(itemTotal / 10);
                  const canAffordWithPoints =
                    user && userPoints >= itemPoints && !loadingPoints;

                  const hasDiscount = effectivePrice < item.product.price;

                  return (
                    <div
                      key={`${item.product.id}-${item.variantId || "default"}`}
                      className="p-6 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                          {item.product.image_url ? (
                            <Image
                              src={item.product.image_url}
                              alt={item.product.name}
                              width={96}
                              height={96}
                              className="w-full h-full object-cover"
                              sizes="96px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base line-clamp-2">
                                {item.product.name}
                              </h3>
                              <p className="text-sm text-gray-500 mt-0.5">
                                {getCategoryArabic(item.product.category)}
                              </p>

                              <div className="mt-2 flex items-center gap-2">
                                <p className="text-lg font-bold text-[#1c9cf0]">
                                  {formatCurrency(effectivePrice)}
                                </p>
                                {hasDiscount && (
                                  <p className="text-sm text-gray-400 line-through">
                                    {formatCurrency(item.product.price)}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() =>
                                removeItem(item.product.id, item.variantId)
                              }
                              className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                              aria-label="حذف المنتج"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>

                          {/* Quantity & Payment */}
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                            {/* Quantity Control */}
                            <div className="flex items-center bg-[#f0f3f4] rounded-full p-1 border border-gray-200">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.product.id,
                                    item.quantity - 1,
                                    item.variantId,
                                  )
                                }
                                className="p-1.5 hover:bg-white rounded-full transition-colors"
                                aria-label="تقليل الكمية"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-10 text-center font-bold">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.product.id,
                                    item.quantity + 1,
                                    item.variantId,
                                  )
                                }
                                disabled={
                                  item.quantity >= item.product.stock_estimate
                                }
                                className="p-1.5 hover:bg-white rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="زيادة الكمية"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Payment Method Tabs */}
                            <div className="flex bg-[#f0f3f4] p-1 rounded-full border border-gray-200">
                              <button
                                onClick={() =>
                                  updateItemPaymentMethod(
                                    item.product.id,
                                    "cash",
                                    item.variantId,
                                  )
                                }
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                  item.paymentMethod === "cash"
                                    ? "bg-white shadow-sm text-[#1c9cf0]"
                                    : "text-gray-500"
                                }`}
                              >
                                كاش
                              </button>
                              <button
                                onClick={() =>
                                  updateItemPaymentMethod(
                                    item.product.id,
                                    "points",
                                    item.variantId,
                                  )
                                }
                                disabled={!canAffordWithPoints}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                  item.paymentMethod === "points"
                                    ? "bg-white shadow-sm text-purple-600"
                                    : "text-gray-500"
                                } disabled:opacity-30 disabled:cursor-not-allowed`}
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
                                نقاط
                              </button>
                            </div>

                            {/* Item Total */}
                            <div className="text-lg font-bold text-[#1c9cf0]">
                              {item.paymentMethod === "points" ? (
                                <span className="text-purple-600">
                                  {itemPoints} نقطة
                                </span>
                              ) : (
                                formatCurrency(itemTotal)
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-gray-50/50 border-t border-gray-100">
                <button
                  onClick={clearCart}
                  className="text-sm font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  مسح السلة
                </button>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm sticky top-8">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold">ملخص الطلب</h2>
              </div>

              <div className="p-6 space-y-4">
                {user && (
                  <div className="p-3 bg-[#f0f3f4] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-[#1c9cf0]" />
                      <span className="text-sm font-bold">نقاطك المتاحة</span>
                    </div>
                    <span className="font-bold text-[#1c9cf0]">
                      {userPoints}
                    </span>
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">إجمالي المنتجات</span>
                    <span className="font-bold">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">رسوم التوصيل</span>
                    <span className="font-bold">
                      {formatCurrency(deliveryFee)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">رسوم الخدمة</span>
                    <span className="font-bold">
                      {formatCurrency(platformCommission)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-bold">المطلوب دفعه</span>
                    <div className="text-right">
                      <div className="text-xl font-black text-[#1c9cf0]">
                        {formatCurrency(cashNeeded)}
                      </div>
                      {pointsNeeded > 0 && (
                        <div className="text-xs text-purple-600 font-bold">
                          + {pointsNeeded} نقطة
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-bold mb-2">
                      عنوان التوصيل
                    </label>
                    <AddressStepDynamic
                      onAddressSelected={setSelectedAddress}
                    />
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing || items.length === 0}
                    className="w-full py-4 bg-[#1c9cf0] text-white rounded-full font-bold text-lg shadow-md hover:shadow-lg hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isProcessing ? "جاري المعالجة..." : "تأكيد الطلب"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
