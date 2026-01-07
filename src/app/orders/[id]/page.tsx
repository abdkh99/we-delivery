"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { Database } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getOrderStatusArabic, getCategoryArabic } from "@/lib/translations";
import {
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  ArrowLeft,
  MapPin,
  AlertCircle,
  Coins,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  order_items: (Database["public"]["Tables"]["order_items"]["Row"] & {
    products: Database["public"]["Tables"]["products"]["Row"];
    payment_method?: string;
  })[];
  points_used?: number;
  cash_amount?: number;
};

export default function OrderDetailsPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchOrder(params.id as string);
      
      // Auto-refresh every 5 seconds
      const interval = setInterval(() => {
        fetchOrder(params.id as string);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [params.id]);

  const fetchOrder = async (id: string) => {
    try {
      console.log("🔄 Client: Fetching order details...", id);
      const response = await fetch(`/api/orders/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.order) {
        console.log("✅ Client: Order updated", {
          id: data.order.id,
          status: data.order.status
        });
        setOrder(data.order);
      }
    } catch (error) {
      console.error("❌ Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-6 w-6 text-yellow-500" />;
      case "confirmed":
        return <Package className="h-6 w-6 text-blue-500" />;
      case "on_delivery":
        return <Truck className="h-6 w-6 text-orange-500" />;
      case "delivered":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Clock className="h-6 w-6 text-gray-500" />;
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
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Order not found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              The order you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link
              href="/orders"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/orders"
            className="inline-flex items-center text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Orders
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                {/* Order Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Order #{order.id.slice(-8)}
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Placed on {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusIcon(order.status)}
                      <span className="ml-2">
                        {getOrderStatusArabic(order.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    منتجات الطلب
                  </h2>
                  <div className="space-y-4">
                    {order.order_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          {item.products.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.products.image_url}
                              alt={item.products.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {item.products.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {getCategoryArabic(item.products.category)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Quantity: {item.qty}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {item.payment_method === 'points' ? (
                              <span className="flex items-center justify-end gap-1 text-blue-600">
                                <Coins className="h-4 w-4" />
                                {Math.ceil((item.price_at_order * item.qty) / 10)} pts
                              </span>
                            ) : (
                              formatCurrency(item.price_at_order * item.qty)
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.payment_method === 'points' ? (
                              <span className="text-blue-600">Paid with points</span>
                            ) : (
                              <span>{formatCurrency(item.price_at_order)} each</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Delivery Information
                  </h2>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">
                          Delivery Address
                        </p>
                        <p className="text-gray-600">{order.address_text}</p>
                        {order.notes && (
                          <div className="mt-2">
                            <p className="font-medium text-gray-900">Notes</p>
                            <p className="text-gray-600">{order.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border sticky top-8">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  ملخص الطلب
                </h2>

                <div className="space-y-3">
                  {order.points_used > 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900 flex items-center gap-1">
                          <Coins className="h-4 w-4" />
                          النقاط المستخدمة:
                        </span>
                        <span className="font-semibold text-blue-600">
                          {order.points_used} نقطة
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Don't show subtotal if mixed payment - shown per item */}

                  <div className="flex justify-between">
                    <span className="text-gray-800">رسوم التوصيل:</span>
                    <span className="font-bold text-blue-500">
                      {order.delivery_fee === 0
                        ? "مجانية"
                        : formatCurrency(order.delivery_fee)}
                    </span>
                  </div>

                  {order.cash_amount !== undefined && order.cash_amount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        المبلغ النقدي:
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(order.cash_amount)}
                      </span>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">
                        إجمالي الطلب:
                      </span>
                      <div className="text-right">
                        {order.points_used > 0 && order.cash_amount > 0 ? (
                          // Mixed payment
                          <div className="space-y-1">
                            <div className="text-lg font-semibold text-blue-600 flex items-center justify-end gap-1">
                              <Coins className="h-5 w-5" />
                              {order.points_used} pts
                            </div>
                            <div className="text-lg font-semibold text-green-600">
                              + {formatCurrency(order.cash_amount)}
                            </div>
                          </div>
                        ) : order.points_used > 0 ? (
                          // Points only
                          <div className="text-lg font-semibold text-blue-600 flex items-center justify-end gap-1">
                            <Coins className="h-5 w-5" />
                            {order.points_used} pts
                          </div>
                        ) : (
                          // Cash only
                          <span className="text-lg font-semibold text-green-600">
                            {formatCurrency(order.total_price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Timeline */}
                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    جدول زمني الطلب
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          تم إنشاء الطلب
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>

                    {order.status !== "pending" && (
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            تم تأكيد الطلب
                          </p>
                          <p className="text-xs text-gray-500">
                            Processing your order
                          </p>
                        </div>
                      </div>
                    )}

                    {order.status === "on_delivery" && (
                      <div className="flex items-center space-x-3">
                        <Truck className="h-4 w-4 text-orange-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            في الطريق
                          </p>
                          <p className="text-xs text-gray-500">
                            Your order is on the way
                          </p>
                        </div>
                      </div>
                    )}

                    {order.status === "delivered" && (
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            تم التوصيل
                          </p>
                          <p className="text-xs text-gray-500">
                            Order completed
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-8 space-y-3">
                  {order.status === "pending" && (
                    <button
                      onClick={async () => {
                        if (!order) return;
                        const toastId = toast.loading("Cancelling order...");
                        try {
                          setIsCancelling(true);
                          const res = await fetch(`/api/orders/${order.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "cancel" }),
                          });

                          const data = await res.json();

                          if (res.ok && data.success) {
                            // refresh order
                            await fetchOrder(order.id);
                            toast.success("Order cancelled successfully", {
                              id: toastId,
                              description: "Your order has been cancelled",
                              icon: <XCircle className="h-5 w-5" />,
                            });
                          } else {
                            toast.error(
                              data.error || "Failed to cancel order",
                              {
                                id: toastId,
                                description: "Please try again later",
                                icon: <AlertCircle className="h-5 w-5" />,
                              }
                            );
                          }
                        } catch (err) {
                          console.error("Cancel error:", err);
                          toast.error("Failed to cancel order", {
                            id: toastId,
                            description: "Please try again later",
                            icon: <AlertCircle className="h-5 w-5" />,
                          });
                        } finally {
                          setIsCancelling(false);
                        }
                      }}
                      disabled={isCancelling}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                      {isCancelling ? (
                        <>
                          <LoadingSpinner size="small" color="white" />
جاري الإلغاء...
                        </>
                      ) : (
"إلغاء الطلب"
                      )}
                    </button>
                  )}

                  <Link
                    href="/products"
                    className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center"
                  >
متابعة التسوق
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
