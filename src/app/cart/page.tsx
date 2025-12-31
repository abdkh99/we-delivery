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
} from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";

const MapLocationPicker = dynamic(
  () => import("@/components/MapLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>
    ),
  }
);

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
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
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

    if (!deliveryAddress.trim()) {
      toast.error("عنوان التوصيل مطلوب", {
        description: "يرجى إدخال عنوان التوصيل أو تحديد موقع على الخريطة",
        icon: <AlertCircle className="h-5 w-5" />,
      });
      return;
    }

    if (!deliveryLat || !deliveryLng) {
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

    console.log("🚀 Starting Checkout...");

    const checkoutData = {
      items: items.map((item) => ({
        product: {
          id: item.masterProductId || item.product.id, // ✅ Use masterProductId if available
          price: item.product.price,
          stock_estimate: item.product.stock_estimate,
        },
        quantity: item.quantity,
        paymentMethod: item.paymentMethod,
        variantId: item.variantId || null,
      })),
      deliveryAddress: deliveryAddress.trim(),
      deliveryLat: Number(deliveryLat),
      deliveryLng: Number(deliveryLng),
      notes: "",
    };

    console.log("📦 Checkout Data:", JSON.stringify(checkoutData, null, 2));

    const toastId = toast.loading("جاري معالجة طلبك...");
    setIsProcessing(true);

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
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  المنتجات في السلة ({items.length})
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
                      className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
                          {item.product.image_url ? (
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-gray-500" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                                {item.product.name}
                              </h3>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {getCategoryArabic(item.product.category)}
                              </p>
                              <p className="text-base sm:text-lg font-semibold text-blue-600 mt-1">
                                {formatCurrency(item.product.price)}
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                removeItem(item.product.id, item.variantId)
                              }
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">
                                الكمية:
                              </span>
                              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      item.product.id,
                                      item.quantity - 1,
                                      item.variantId
                                    )
                                  }
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="w-8 text-center font-medium text-gray-900">
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
                                  className="p-1 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <span className="text-sm font-medium text-gray-700">
                                طريقة الدفع:
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    updateItemPaymentMethod(
                                      item.product.id,
                                      "cash",
                                      item.variantId
                                    )
                                  }
                                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                                    item.paymentMethod === "cash"
                                      ? "border-blue-600 bg-blue-50 text-blue-700"
                                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                                  }`}
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
                                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                                    item.paymentMethod === "points"
                                      ? "border-blue-600 bg-blue-50 text-blue-700"
                                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                                  } disabled:opacity-40 disabled:cursor-not-allowed`}
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
                                  <span>
                                    {loadingPoints
                                      ? "..."
                                      : `${itemPoints} نقطة`}
                                  </span>
                                </button>
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                              <span className="text-sm font-medium text-gray-700">
                                المجموع:
                              </span>
                              <div className="text-right">
                                <span className="text-base sm:text-lg font-semibold text-gray-900">
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

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-4 sm:top-8">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  ملخص الطلب
                </h2>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {user && (
                  <div className="p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">
                        النقاط المتاحة:
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-blue-600">
                      {loadingPoints ? "..." : userPoints.toLocaleString()}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    عنوان التوصيل
                  </label>
                  <MapLocationPicker
                    value={deliveryAddress}
                    onChange={(address, lat, lng) => {
                      setDeliveryAddress(address);
                      setDeliveryLat(lat);
                      setDeliveryLng(lng);
                    }}
                    placeholder="أدخل عنوان التوصيل..."
                    className="w-full"
                  />
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-200">
                  {pointsNeeded > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 flex items-center gap-1">
                        <Coins className="h-4 w-4 text-blue-600" />
                        الدفع بالنقاط:
                      </span>
                      <span className="font-semibold text-blue-600">
                        {pointsNeeded} نقطة
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">الدفع النقدي:</span>
                    <span className="text-gray-700">
                      {formatCurrency(getCashNeeded())}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">رسوم التوصيل:</span>
                    <span className="text-gray-700">
                      {deliveryFee === 0
                        ? "مجاني 🎉"
                        : formatCurrency(deliveryFee)}
                    </span>
                  </div>

                  {platformCommission > 0 && (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 px-4 py-3 rounded-lg mt-2">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-yellow-900">
                            💰 رسوم المنصة
                          </span>
                          <span className="text-xs text-yellow-700">
                            (تمويل تطوير الخدمة)
                          </span>
                        </div>
                        <span className="text-lg font-bold text-yellow-900">
                          {formatCurrency(platformCommission)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-base sm:text-lg font-semibold pt-2 border-t border-gray-200">
                    <span className="text-gray-900">إجمالي النقد:</span>
                    <span className="text-blue-600">
                      {formatCurrency(cashNeeded)}
                    </span>
                  </div>

                  {pointsNeeded > userPoints && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>
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
                    !deliveryAddress ||
                    !deliveryLat ||
                    !deliveryLng ||
                    isProcessing ||
                    pointsNeeded > userPoints
                  }
                  className="w-full bg-blue-600 text-white py-3 sm:py-4 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {isProcessing ? (
                    <>
                      جاري المعالجة...
                      <LoadingSpinner size="small" color="blue" />
                    </>
                  ) : !user ? (
                    "سجل الدخول للمتابعة"
                  ) : !deliveryAddress || !deliveryLat || !deliveryLng ? (
                    "اختر موقع التوصيل"
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
