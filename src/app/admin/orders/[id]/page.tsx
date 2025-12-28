/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/types/database";
import { formatCurrency, formatDate, formatOrderStatus, calculatePlatformCommission } from "@/lib/utils";
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Edit,
  Save,
  X,
  Map as MapIcon,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

// Dynamic import للخريطة
const OrderMapView = dynamic(() => import("@/components/OrderMapView"), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>,
});

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  users: Pick<Database["public"]["Tables"]["users"]["Row"], "name" | "phone">;
  order_items: (Database["public"]["Tables"]["order_items"]["Row"] & {
    products: Database["public"]["Tables"]["products"]["Row"];
  })[];
  deliveries: Database["public"]["Tables"]["deliveries"]["Row"][];
  platform_commission?: number;
  points_used?: number;
  cash_amount?: number;
};

type Driver = Database["public"]["Tables"]["drivers"]["Row"] & {
  users: Pick<Database["public"]["Tables"]["users"]["Row"], "name" | "phone">;
};

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = use(params);
  const { user, profile } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Only redirect if we have loaded profile and it's not admin
    if (profile && profile.role !== "admin") {
      router.push("/");
      return;
    }

    // Only fetch if user is authenticated and profile is loaded
    if (user && profile?.role === "admin") {
      fetchOrderDetails();
      fetchDrivers();

      // Auto-refresh every 5 seconds
      const interval = setInterval(() => {
        fetchOrderDetails();
      }, 5000);

      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, router, id]);

  const fetchOrderDetails = async () => {
    try {
      console.log("🔄 Admin: Fetching order details...", id);
      const response = await fetch(`/api/admin/orders/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      console.log("✅ Admin: Order details updated", {
        id: data.order.id,
        status: data.order.status,
        deliveries: data.order.deliveries?.length || 0,
      });
      setOrder(data.order);
      setNotes(data.order.notes || "");
    } catch (err: any) {
      console.error("❌ Error fetching order details:", err);
      setError(err.message || "Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await fetch("/api/admin/drivers");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.drivers) {
        setDrivers(data.drivers);
      }
    } catch (err) {
      console.error("Error fetching drivers:", err);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          notes: notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "Failed to update order");
      }

      const data = await response.json();

      console.log("Admin status update response:", data);

      if (data.error) {
        console.error("Server error:", data);
        throw new Error(data.details || data.error);
      }

      if (!data.order) {
        console.error("No order in response:", data);
        throw new Error("Order update failed - no data returned");
      }

      console.log("✅ Order updated successfully:", data.order);
      setOrder(data.order);
      setEditingNotes(false);
      toast.success("تم تحديث حالة الطلب بنجاح", {
        description: `الحالة الجديدة: ${formatOrderStatus(data.order.status)}`,
        duration: 3000,
      });
    } catch (err: unknown) {
      console.error("❌ Error updating order:", err);
      toast.error("فشل تحديث الطلب", {
        description: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
        duration: 4000,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDriver || !order) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/orders/${id}/assign-driver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          driver_id: selectedDriver,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign driver");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Refresh order details
      fetchOrderDetails();
      setSelectedDriver("");
      toast.success("تم تعيين السائق بنجاح", {
        description: "سيتم إشعار السائق بالطلب",
        duration: 3000,
      });
    } catch (err: unknown) {
      console.error("Error assigning driver:", err);
      toast.error("فشل تعيين السائق", {
        description: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
        duration: 4000,
      });
    } finally {
      setUpdating(false);
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
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
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
          <div className="text-center text-gray-600">
            Loading order details...
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline">
              {" "}
              {error || "Order not found"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const assignedDriver =
    order.deliveries && order.deliveries.length > 0
      ? drivers.find((d) => d.id === order.deliveries[0].driver_id)
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Order #{order.id.slice(-8)}
              </h1>
              <p className="text-lg text-gray-600 mt-1">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  order.status
                )}`}
              >
                {getStatusIcon(order.status)}
                <span className="ml-2">{formatOrderStatus(order.status)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Customer Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">
                    {order.users.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">
                    {order.users.phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                عنوان التوصيل
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{order.address_text}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-mono">
                        {order.lat.toFixed(6)}, {order.lng.toFixed(6)}
                      </span>
                    </p>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${order.lat},${order.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <MapIcon className="h-4 w-4" />
                    فتح في خرائط جوجل
                  </a>
                </div>
                
                {/* الخريطة */}
                <div>
                  <OrderMapView
                    lat={order.lat}
                    lng={order.lng}
                    address={order.address_text}
                  />
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Order Items
              </h2>
              <div className="space-y-4">
                {order.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0"
                  >
                    <div className="flex items-center space-x-4">
                      <Image
                        loading="lazy"
                        src={
                          item.products.image_url || "/placeholder-image.jpg"
                        }
                        alt={item.products.name}
                        className="h-12 w-12 object-cover rounded-md"
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.products.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(item.price_at_order)} each
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {item.qty} × {formatCurrency(item.price_at_order)}
                      </p>
                      <p className="text-sm text-gray-600">
                        = {formatCurrency(item.price_at_order * item.qty)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Management */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                ملخص الطلب
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>المجموع الفرعي:</span>
                  <span>
                    {formatCurrency(order.total_price - order.delivery_fee)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>رسوم التوصيل:</span>
                  <span className={order.delivery_fee === 0 ? "text-green-600 font-medium" : ""}>
                    {order.delivery_fee === 0 ? "مجاني 🎉" : formatCurrency(order.delivery_fee)}
                  </span>
                </div>
                {(order.platform_commission || calculatePlatformCommission(order.total_price - order.delivery_fee)) > 0 && (
                  <div className="flex justify-between text-sm bg-green-50 px-2 py-1 rounded">
                    <span className="text-green-700">عمولة المنصة:</span>
                    <span className="text-green-700 font-medium">
                      {formatCurrency(order.platform_commission || calculatePlatformCommission(order.total_price - order.delivery_fee))}
                    </span>
                  </div>
                )}
                {order.points_used && order.points_used > 0 && (
                  <div className="flex justify-between text-sm bg-blue-50 px-2 py-1 rounded">
                    <span className="text-blue-700">نقاط مستخدمة:</span>
                    <span className="text-blue-700 font-medium">
                      {order.points_used} نقطة
                    </span>
                  </div>
                )}
                {order.cash_amount && order.cash_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>المبلغ النقدي:</span>
                    <span className="font-medium">
                      {formatCurrency(order.cash_amount)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>الإجمالي:</span>
                    <span className="text-blue-600">
                      {formatCurrency(order.total_price)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Management */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Update Status
              </h2>
              <div className="space-y-3">
                {[
                  "pending",
                  "confirmed",
                  "on_delivery",
                  "delivered",
                  "cancelled",
                ].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusUpdate(status)}
                    disabled={updating || order.status === status}
                    className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                      order.status === status
                        ? "bg-green-100 border-green-300 text-green-800"
                        : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {getStatusIcon(status)}
                    <span className="ml-2">{formatOrderStatus(status)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Information */}
            {order.deliveries && order.deliveries.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Truck className="h-5 w-5 mr-2" />
                  Delivery Information
                </h2>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {order.deliveries[0].status.replace("_", " ")}
                    </p>
                  </div>

                  {order.deliveries[0].started_at && (
                    <div>
                      <p className="text-sm text-gray-600">Started At</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(order.deliveries[0].started_at)}
                      </p>
                    </div>
                  )}

                  {order.deliveries[0].delivered_at && (
                    <div>
                      <p className="text-sm text-gray-600">Delivered At</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(order.deliveries[0].delivered_at)}
                      </p>
                    </div>
                  )}

                  {order.deliveries[0].notes && (
                    <div>
                      <p className="text-sm text-gray-600">Delivery Notes</p>
                      <p className="font-medium text-gray-900">
                        {order.deliveries[0].notes}
                      </p>
                    </div>
                  )}

                  {order.deliveries[0].proof_image_url && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        Proof of Delivery
                      </p>
                      {order.deliveries[0].proof_image_url === "uploaded" ? (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            ⚠️ Driver marked delivery as complete but image
                            upload is pending.
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            Note: Image upload feature is under development.
                          </p>
                        </div>
                      ) : (
                        <Image
                          loading="lazy"
                          src={order.deliveries[0].proof_image_url}
                          alt="Proof of delivery"
                          className="w-full max-w-md rounded-lg border"
                        />
                      )}
                    </div>
                  )}

                  {/* Quick Actions for Admin */}
                  {order.deliveries[0].status === "delivered" &&
                    order.status !== "delivered" && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-gray-600 mb-2">
                          Admin Actions
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusUpdate("delivered")}
                            disabled={updating}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {updating
                              ? "Verifying..."
                              : "Verify & Mark as Delivered"}
                          </button>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Driver Assignment */}
            {order.status !== "cancelled" && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Driver Assignment
                </h2>

                {assignedDriver ? (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Assigned to:</strong> {assignedDriver.users.name}
                    </p>
                    <p className="text-sm text-blue-600">
                      Phone: {assignedDriver.users.phone}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={selectedDriver}
                      onChange={(e) => setSelectedDriver(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select a driver</option>
                      {drivers
                        .filter((d) => d.active)
                        .map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.users.name} - {driver.users.phone}
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={handleAssignDriver}
                      disabled={!selectedDriver || updating}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updating ? "Assigning..." : "Assign Driver"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
                {!editingNotes && (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
              </div>

              {editingNotes ? (
                <div className="space-y-3">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Add notes about this order..."
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        handleStatusUpdate(order.status);
                        setEditingNotes(false);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingNotes(false);
                        setNotes(order.notes || "");
                      }}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 flex items-center"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700">
                  {order.notes || "No notes added yet."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
