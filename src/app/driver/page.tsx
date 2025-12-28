"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import { swrRealtimeConfig } from "@/lib/swr-config";
import { toast } from "sonner";
import {
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Phone,
  Navigation as NavigationIcon,
  Coins,
  Map,
} from "lucide-react";
import dynamic from "next/dynamic";
import { DeliveryCardSkeleton, StatCardSkeleton } from "@/components/Skeleton";

// Dynamic import for Leaflet components
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

type Delivery = Database["public"]["Tables"]["deliveries"]["Row"] & {
  orders: Database["public"]["Tables"]["orders"]["Row"] & {
    users: {
      id: string;
      name: string;
      phone: string;
    };
    order_items: (Database["public"]["Tables"]["order_items"]["Row"] & {
      products: Database["public"]["Tables"]["products"]["Row"];
    })[];
    points_used?: number;
    cash_amount?: number;
  };
};

export default function DriverDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // استخدام SWR مع تحديث تلقائي كل 5 ثواني
  const { data, error, isLoading, mutate } = useSWR<{ orders: Delivery[] }>(
    !authLoading && profile?.role === "driver" ? "/api/driver/orders" : null,
    fetcher,
    swrRealtimeConfig
  );

  const deliveries = data?.orders || [];

  useEffect(() => {
    if (!authLoading && profile?.role === "driver") {
      getCurrentLocation();
    }
  }, [profile, authLoading]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.log("Geolocation not supported by this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        console.log("Location obtained:", { lat: latitude, lng: longitude });
      },
      (error) => {
        let errorMessage = "Unable to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "تم رفض الوصول للموقع - يمكنك السماح بالوصول من إعدادات المتصفح";
            console.warn("ℹ️ Location access denied by user");
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "معلومات الموقع غير متوفرة";
            console.error("❌ Location information unavailable:", error);
            break;
          case error.TIMEOUT:
            errorMessage = "انتهت مهلة طلب الموقع";
            console.error("⏱️ Location request timed out:", error);
            break;
          default:
            errorMessage = "حدث خطأ غير معروف";
            console.error("❌ Unknown location error:", error);
            break;
        }
        // Only show error message, don't set loading state
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  };


  const updateDeliveryStatus = async (deliveryId: string, status: string) => {
    try {
      console.log("Updating delivery:", deliveryId, "to status:", status);

      if (status === "on_way") {
        const response = await fetch(`/api/driver/orders/${deliveryId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        });

        console.log("Update response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Update failed:", errorData);
          throw new Error(errorData.error || "Failed to update delivery status");
        }

        console.log("Delivery updated successfully");
        await mutate(); // تحديث البيانات من SWR
        return;
      }

      const response = await fetch(`/api/driver/orders/${deliveryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          notes: notes || undefined,
        }),
      });

      console.log("Update response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Update failed:", errorData);
        throw new Error(errorData.error || "Failed to update delivery status");
      }

      console.log("Delivery updated successfully");
      await mutate(); // تحديث البيانات من SWR
      setShowModal(false);
      setNotes("");
    } catch (error) {
      console.error("Error updating delivery status:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "assigned":
        return <Package className="h-5 w-5 text-blue-500" />;
      case "on_way":
        return <Truck className="h-5 w-5 text-orange-500" />;
      case "delivered":
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-gray-600" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-blue-100 text-blue-800";
      case "on_way":
        return "bg-orange-100 text-orange-800";
      case "delivered":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const openModal = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setShowModal(true);
  };

  const openMap = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setShowMap(true);
  };


  // عرض loading أثناء تحميل البيانات
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || profile?.role !== "driver") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Driver Access Required
            </h1>
            <p className="text-gray-600">
              You need driver privileges to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <div className="h-8 bg-gray-200 rounded w-40 mb-2 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-56 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <DeliveryCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    totalDeliveries: deliveries.length,
    pendingDeliveries: deliveries.filter((d) => d.status === "assigned").length,
    completedDeliveries: deliveries.filter((d) => d.status === "delivered")
      .length,
    inProgressDeliveries: deliveries.filter((d) => d.status === "on_way")
      .length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-3xl p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 text-white text-sm font-semibold">
                <Truck className="h-4 w-4" />
                لوحة السائق المهنية
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-3">
                أهلاً {profile?.name || "بالسائق"}, إليك مهامك اليومية جاهزة
              </h1>
              <p className="text-sm sm:text-base text-blue-50 mt-2">
                تابع الطلبات النشطة، حدث حالتك، واحصل على تعليمات دقيقة للموقع.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={getCurrentLocation}
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-4 py-2 rounded-2xl font-semibold transition"
              >
                <NavigationIcon className="h-4 w-4" />
                تحديث موقعي
              </button>
              <button
                onClick={() => setShowMap(true)}
                className="inline-flex items-center gap-2 bg-white text-blue-700 px-4 py-2 rounded-2xl font-semibold shadow-sm"
              >
                <Map className="h-4 w-4" />
                عرض الخريطة
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  إجمالي التوصيلات
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {stats.totalDeliveries}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  في الانتظار
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {stats.pendingDeliveries}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  جاري التوصيل
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {stats.inProgressDeliveries}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  مكتمل
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {stats.completedDeliveries}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Deliveries List - Mobile Optimized */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              مهام التوصيل
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {deliveries.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <Truck className="mx-auto h-16 w-16 sm:h-20 sm:w-20 text-gray-500" />
                <h3 className="mt-4 text-base sm:text-lg font-medium text-gray-900">
                  لا توجد مهام توصيل مخصصة
                </h3>
                <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-sm mx-auto">
                  لم يتم تخصيص أي مهام توصيل لك بعد
                </p>
              </div>
            ) : (
              deliveries.map((delivery) => (
                <div key={delivery.id} className="p-4 sm:p-6">
                  {/* Mobile Delivery Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <span className="text-base sm:text-lg font-semibold text-gray-900">
                        طلب #{delivery.orders.id.slice(-8)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium w-fit ${getStatusColor(
                          delivery.status
                        )}`}
                      >
                        {getStatusIcon(delivery.status)}
                        <span className="ml-1">
                          {delivery.status.replace("_", " ").toUpperCase()}
                        </span>
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(delivery.orders.total_price)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatDate(delivery.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          العميل: {delivery.orders?.users?.name || "غير محدد"}
                        </p>
                        {delivery.orders?.users?.phone && (
                          <p className="text-sm text-gray-600">
                            {delivery.orders.users.phone}
                          </p>
                        )}
                      </div>
                      {delivery.orders?.users?.phone && (
                        <a
                          href={`tel:${delivery.orders.users.phone}`}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          اتصال
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      عنوان التوصيل:
                    </h4>
                    <div className="bg-blue-50 rounded-lg p-3 flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-700 leading-relaxed flex-1">
                        {delivery.orders.address_text}
                      </p>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${delivery.orders.lat},${delivery.orders.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
                        title="فتح في Google Maps"
                      >
                        <NavigationIcon className="h-3.5 w-3.5 mr-1.5" />
                        خرائط جوجل
                      </a>
                    </div>
                  </div>

                  {/* Order Items - Enhanced */}
                  {delivery.orders.order_items &&
                    delivery.orders.order_items.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <Package className="h-4 w-4 mr-2" />
                          المنتجات ({delivery.orders.order_items.length}):
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                          {delivery.orders.order_items.map((item: any) => {
                            const flavor = item.product_flavors;
                            const variant = item.product_variants;
                            
                            return (
                              <div
                                key={item.id}
                                className="bg-white rounded-lg p-3 border border-gray-200"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 mb-1">
                                      {item.products?.name || "منتج"}
                                    </p>
                                    {flavor && (
                                      <p className="text-xs text-blue-600 font-medium mb-1">
                                        🍕 النكهة: {flavor.name_ar || flavor.name}
                                      </p>
                                    )}
                                    {variant && (
                                      <p className="text-xs text-purple-600 font-medium mb-1">
                                        🎨 الصنف: {variant.variant_name}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                                      <span>الكمية: <strong className="text-gray-900">{item.qty}</strong></span>
                                      <span>•</span>
                                      <span>السعر: <strong className="text-gray-900">{formatCurrency(item.price_at_order)}</strong></span>
                                    </div>
                                  </div>
                                  <div className="text-right ml-3">
                                    <p className="text-base font-bold text-blue-600">
                                      {formatCurrency(item.price_at_order * item.qty)}
                                    </p>
                                    {item.payment_method === "points" && (
                                      <p className="text-xs text-orange-600 mt-1">
                                        💎 نقاط
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* Payment Info */}
                  {delivery.orders.points_used &&
                    delivery.orders.points_used > 0 && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600 flex items-center">
                          <Coins className="h-4 w-4 mr-2" />
                          <span>
                            تم استخدام {delivery.orders.points_used} نقطة
                            {delivery.orders.cash_amount &&
                              delivery.orders.cash_amount > 0 &&
                              ` + ${formatCurrency(
                                delivery.orders.cash_amount
                              )} نقداً`}
                          </span>
                        </p>
                      </div>
                    )}

                  {/* Action Buttons - Mobile Optimized */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {/* Navigate Button */}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${delivery.orders.lat},${delivery.orders.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <NavigationIcon className="h-4 w-4 mr-2" />
                      التنقل
                    </a>

                    {/* View Map Button */}
                    <button
                      onClick={() => openMap(delivery)}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      <Map className="h-4 w-4 mr-2" />
                      عرض الخريطة
                    </button>

                    {/* Status Action Buttons */}
                    {delivery.status === "assigned" && (
                      <button
                        onClick={() =>
                          updateDeliveryStatus(delivery.id, "on_way")
                        }
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        بدء التوصيل
                      </button>
                    )}
                    {delivery.status === "on_way" && (
                      <button
                        onClick={() => openModal(delivery)}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        إكمال التوصيل
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Map Modal */}
      {showMap && selectedDelivery && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Delivery Location - Order #
                  {selectedDelivery.orders.id.slice(-8)}
                </h3>
                <button
                  onClick={() => setShowMap(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Customer:
                    </p>
                    <p className="text-gray-900">
                      {selectedDelivery.orders.users.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Phone:</p>
                    <p className="text-gray-900">
                      {selectedDelivery.orders.users.phone}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-700">
                      Address:
                    </p>
                    <p className="text-gray-900">
                      {selectedDelivery.orders.address_text}
                    </p>
                  </div>
                </div>
              </div>

              {/* الخريطة */}
              <div className="h-96 w-full border border-gray-300 rounded-lg overflow-hidden">
                <MapContainer
                  center={[
                    selectedDelivery.orders.lat,
                    selectedDelivery.orders.lng,
                  ]}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* موقع العميل */}
                  <Marker
                    position={[
                      selectedDelivery.orders.lat,
                      selectedDelivery.orders.lng,
                    ]}
                  >
                    <Popup>
                      <div className="text-center">
                        <p className="font-semibold">Customer Location</p>
                        <p className="text-sm text-gray-600">
                          {selectedDelivery.orders.users.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {selectedDelivery.orders.address_text}
                        </p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* موقع السائق الحالي */}
                  {currentLocation && (
                    <Marker
                      position={[currentLocation.lat, currentLocation.lng]}
                    >
                      <Popup>
                        <div className="text-center">
                          <p className="font-semibold">Your Location</p>
                          <p className="text-sm text-gray-600">
                            Current position
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>

              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setShowMap(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDelivery.orders.lat},${selectedDelivery.orders.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <NavigationIcon className="h-4 w-4 mr-2" />
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Completion Modal - Simplified */}
      {showModal && selectedDelivery && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                تأكيد التسليم
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                هل تم تسليم الطلب للعميل بنجاح؟
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="أضف أي ملاحظات حول التسليم..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setNotes("");
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    updateDeliveryStatus(selectedDelivery.id, "delivered");
                    setNotes("");
                    setShowModal(false);
                  }}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center justify-center"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  تأكيد التسليم
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

