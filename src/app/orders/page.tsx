"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { Database } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getOrderStatusArabic } from "@/lib/translations";
import {
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import { OrderCardSkeleton } from "@/components/Skeleton";

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  order_items: (Database["public"]["Tables"]["order_items"]["Row"] & {
    products: Database["public"]["Tables"]["products"]["Row"];
  })[];
};

export default function OrdersPage() {
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // Use SWR to fetch and cache orders with auto-refresh every 5 seconds
  const { data, error, isLoading } = useSWR<{ orders: Order[] }>(
    "/api/orders",
    fetcher,
    {
      refreshInterval: 5000, // Auto-refresh every 5 seconds
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      keepPreviousData: true, // عرض البيانات القديمة أثناء التحديث
      dedupingInterval: 2000, // منع الطلبات المكررة خلال ثانيتين
    }
  );

  const orders = data?.orders || [];

  const handleCancelOrder = async (orderId: string) => {
    const toastId = toast.loading("جاري إلغاء الطلب...");
    try {
      setCancellingOrderId(orderId);
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "cancel" }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "فشل إلغاء الطلب", {
          id: toastId,
          description: "الرجاء المحاولة مرة أخرى لاحقاً",
          icon: <AlertCircle className="h-5 w-5" />,
        });
        return;
      }

      if (data.success) {
        // Revalidate the orders list
        mutate("/api/orders");
        toast.success("تم إلغاء الطلب بنجاح", {
          id: toastId,
          description: "تم إلغاء طلبك بنجاح",
          icon: <XCircle className="h-5 w-5" />,
        });
      } else {
        toast.error(data.error || "فشل إلغاء الطلب", {
          id: toastId,
          description: "الرجاء المحاولة مرة أخرى لاحقاً",
          icon: <AlertCircle className="h-5 w-5" />,
        });
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("فشل إلغاء الطلب", {
        id: toastId,
        description: "حدث خطأ غير متوقع",
        icon: <AlertCircle className="h-5 w-5" />,
      });
    } finally {
      setCancellingOrderId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "confirmed":
        return <Package className="h-5 w-5 text-blue-500" />;
      case "on_delivery":
        return <Truck className="h-5 w-5 text-orange-500" />;
      case "delivered":
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "on_delivery":
        return "bg-orange-100 text-orange-800";
      case "delivered":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <div className="h-8 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <OrderCardSkeleton key={i} />
            ))}
          </div>
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
                  فشل تحميل الطلبات. يرجى المحاولة مرة أخرى لاحقاً.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Mobile Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            طلباتي
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            تتبع طلباتك وحالة التوصيل
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Package className="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-gray-500" />
            <h3 className="mt-4 text-base sm:text-lg font-medium text-gray-900">
              لا توجد طلبات بعد
            </h3>
            <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-sm mx-auto">
              ابدأ التسوق لترى طلباتك هنا
            </p>
            <Link
              href="/products"
              className="mt-4 sm:mt-6 inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              تصفح المنتجات
            </Link>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Mobile Order Header */}
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                    {/* Order Number and Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <span className="text-base sm:text-lg font-semibold text-gray-900">
                        طلب #{order.id.slice(-8)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium w-fit ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusIcon(order.status)}
                        <span className="ml-1">
                          {getOrderStatusArabic(order.status)}
                        </span>
                      </span>
                    </div>

                    {/* Price and Date */}
                    <div className="flex flex-col sm:items-end gap-1">
                      <p className="text-lg sm:text-xl font-bold text-blue-600">
                        {formatCurrency(order.total_price)}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Order Items - Mobile Optimized */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      المنتجات:
                    </h4>
                    <div className="space-y-2">
                      {order.order_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-2"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-gray-900 font-medium truncate block">
                              {item.products.name}
                            </span>
                            <span className="text-gray-600 text-xs">
                              الكمية: {item.qty}
                            </span>
                          </div>
                          <span className="text-gray-900 font-semibold text-right ml-2">
                            {formatCurrency(item.price_at_order * item.qty)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Info - Mobile Optimized */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      عنوان التوصيل:
                    </h4>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {order.address_text}
                      </p>
                      {order.delivery_fee > 0 && (
                        <p className="text-sm text-blue-600 mt-2 font-medium">
                          رسوم التوصيل: {formatCurrency(order.delivery_fee)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order Actions - Mobile Optimized */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-200">
                    <Link
                      href={`/orders/${order.id}`}
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      عرض التفاصيل
                    </Link>
                    {order.status === "pending" && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancellingOrderId === order.id}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:text-red-300 disabled:cursor-not-allowed disabled:bg-red-25 transition-colors"
                      >
                        {cancellingOrderId === order.id ? (
                          <>
                            <LoadingSpinner size="small" />
                            <span className="mr-2">جاري الإلغاء...</span>
                          </>
                        ) : (
                          "إلغاء الطلب"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
