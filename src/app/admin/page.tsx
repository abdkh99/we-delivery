"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import CommissionSettings from "@/components/CommissionSettings";
import DriverManagementComponent from "@/components/DriverManagementComponent";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/types/database";
import {
  formatCurrency,
  formatDate,
  formatOrderStatus,
  calculatePlatformCommission,
  extractRegion,
} from "@/lib/utils";
import {
  Package,
  ShoppingCart,
  DollarSign,
  Clock,
  Truck,
  Plus,
  Edit,
  Trash2,
  RefreshCcw,
  Sparkles,
  Filter,
  Flame,
  FileText,
  MapPin,
  CheckCircle,
  XCircle,
  Phone,
  UserPlus,
  Settings,
  Percent,
  TrendingUp,
  Zap,
  Bell,
} from "lucide-react";
import { AdminDashboardSkeleton } from "@/components/AdminSkeleton";
import { toast } from "sonner";

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  users: {
    id: string;
    name: string;
    phone: string;
  };
  order_items: (Database["public"]["Tables"]["order_items"]["Row"] & {
    products: Database["public"]["Tables"]["products"]["Row"];
  })[];
  deliveries: (Database["public"]["Tables"]["deliveries"]["Row"] & {
    drivers: Database["public"]["Tables"]["drivers"]["Row"] & {
      users: {
        name: string;
        phone: string;
      };
    };
  })[];
  platform_commission?: number;
};

type Product = Database["public"]["Tables"]["products"]["Row"];

type Driver = Database["public"]["Tables"]["drivers"]["Row"] & {
  users: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
};

export default function AdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isSyncingPrices, setIsSyncingPrices] = useState(false);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [driverReports, setDriverReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // جلب سعر الصرف الحالي
  const fetchCurrentRate = async () => {
    try {
      const response = await fetch("/api/admin/update-exchange-rate", {
        method: "GET",
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentRate(data.rate);
      }
    } catch (error) {
      console.error("Failed to fetch rate:", error);
    }
  };

  // جلب تقارير السائقين
  const fetchDriverReports = async () => {
    try {
      setReportsLoading(true);
      const response = await fetch("/api/admin/driver-reports");
      if (response.ok) {
        const data = await response.json();
        setDriverReports(data.reports || []);
      }
    } catch (error) {
      console.error("Failed to fetch driver reports:", error);
      toast.error("فشل تحميل التقارير");
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile?.role === "admin") {
      fetchData();
      fetchCurrentRate();

      // تحديث تلقائي كل 5 ثواني
      const interval = setInterval(() => {
        fetchData();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [profile, authLoading]);

  useEffect(() => {
    if (activeTab === "reports" && profile?.role === "admin") {
      fetchDriverReports();
    }
  }, [activeTab, profile]);

  const fetchData = async () => {
    try {
      console.log("🔄 Admin: Fetching data...");
      const response = await fetch("/api/admin/dashboard-data");

      if (!response.ok) {
        throw new Error(`Dashboard API error: ${response.status}`);
      }

      const data = await response.json();

      console.log("✅ Admin: Data updated", {
        orders: data.orders?.length,
        products: data.products?.length,
        drivers: data.drivers?.length,
      });

      if (data.orders) setOrders(data.orders);
      if (data.products) setProducts(data.products);
      if (data.drivers) setDrivers(data.drivers);
    } catch (error) {
      console.error("❌ Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await fetchData();
        toast.success("تم تحديث حالة الطلب بنجاح");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("فشل تحديث حالة الطلب");
    }
  };

  const assignDriver = async (orderId: string, driverId: string) => {
    try {
      const response = await fetch(
        `/api/admin/orders/${orderId}/assign-driver`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ driver_id: driverId }),
        }
      );

      if (response.ok) {
        await fetchData();
        toast.success("تم تعيين السائق بنجاح");
      }
    } catch (error) {
      console.error("Error assigning driver:", error);
      toast.error("فشل تعيين السائق");
    }
  };

  // تحديث سعر الصرف فقط
  const handleUpdateExchangeRate = async () => {
    try {
      setIsUpdatingRate(true);

      const rateResponse = await fetch("/api/admin/update-exchange-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!rateResponse.ok) {
        const errorData = await rateResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "فشل تحديث سعر الصرف");
      }

      const rateResult = await rateResponse.json();
      setCurrentRate(rateResult.rate);

      toast.success("تم تحديث سعر الصرف بنجاح ✅", {
        description: `سعر الدولار الآن: ${formatCurrency(
          rateResult.rate || 0
        )} ليرة`,
      });
    } catch (error: any) {
      console.error("Error updating rate:", error);
      toast.error("فشل تحديث سعر الصرف", {
        description: error.message || "تأكد من اتصالك بالإنترنت",
      });
    } finally {
      setIsUpdatingRate(false);
    }
  };

  const handlePricingSync = async () => {
    try {
      setIsSyncingPrices(true);

      // أولاً: تحديث سعر الصرف من API
      const rateResponse = await fetch("/api/admin/update-exchange-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!rateResponse.ok) {
        throw new Error("فشل تحديث سعر الصرف");
      }

      const rateResult = await rateResponse.json();
      setCurrentRate(rateResult.rate);
      console.log("✅ Exchange rate updated:", rateResult);

      // ثانياً: تحديث أسعار المنتجات
      const syncResponse = await fetch("/api/admin/sync-product-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!syncResponse.ok) {
        throw new Error("فشل تحديث أسعار المنتجات");
      }

      const syncResult = await syncResponse.json();
      toast.success("تم تحديث الأسعار بنجاح ✅", {
        description: `تم تحديث ${
          syncResult.updatedCount ?? 0
        } منتجاً. سعر الصرف: ${formatCurrency(rateResult.rate || 0)}`,
      });
      await fetchData();
    } catch (error: any) {
      console.error("Error syncing prices:", error);
      toast.error("فشل تحديث الأسعار", {
        description: error.message || "تأكد من اتصالك ثم أعد المحاولة",
      });
    } finally {
      setIsSyncingPrices(false);
    }
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

  if (loading && !orders.length && !products.length) {
    return (
      <>
        <Navigation />
        <AdminDashboardSkeleton />
      </>
    );
  }

  if (!user || profile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Admin Access Required
            </h1>
            <p className="text-gray-600">
              You need admin privileges to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    totalRevenue: orders.reduce(
      (sum, order) => sum + (Number(order.total_price ?? 0) || 0),
      0
    ),
    totalCommission: orders
      .filter((o) => o.status === "delivered")
      .reduce((sum, order) => {
        const commission =
          order.platform_commission ||
          calculatePlatformCommission(
            Number(order.total_price ?? 0) -
              (Number(order.delivery_fee ?? 0) || 0)
          );
        return sum + commission;
      }, 0),
    activeDrivers: drivers.filter((d) => d.active).length,
  };

  // فلترة الطلبات حسب الحالة والمنطقة
  const regionizedOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  const filteredOrders =
    regionFilter === "all"
      ? regionizedOrders
      : regionizedOrders.filter(
          (order) => extractRegion(order.address_text ?? "") === regionFilter
        );

  const regions = Array.from(
    new Set(
      orders
        .map((o) => extractRegion(o.address_text ?? ""))
        .filter((region) => region && region !== "")
    )
  );

  // فلترة السائقين حسب المنطقة
  const getDriversForRegion = (region: string) => {
    const activeDrivers = drivers.filter((driver) => driver.active);

    if (region === "all" || region === "غير محدد") {
      return activeDrivers;
    }

    const regionDrivers = activeDrivers.filter(
      (driver) => driver.region && driver.region === region
    );

    return regionDrivers.length > 0 ? regionDrivers : activeDrivers;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
        {/* Enhanced Header with Gradient */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-3xl p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-semibold">
                <Sparkles className="h-4 w-4" />
                لوحة الإدارة المتقدمة
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-3">
                أهلاً {profile?.name || "مدير"}، إدارة جميع عمليات المتجر في
                مكان واحد
              </h1>
              <p className="text-sm sm:text-base text-blue-50 mt-2">
                تابع الطلبات، حدّث الأسعار، وفعّل السائقين الفاعلين في الوقت
                الحقيقي.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  إجمالي الطلبات
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {stats.totalOrders}
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
                  طلبات في الانتظار
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {stats.pendingOrders}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  إجمالي الإيرادات
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  إجمالي العمولة
                </p>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-green-600">
                  {formatCurrency(stats.totalCommission)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "إضافة منتج",
              href: "/admin/products/new",
              icon: Plus,
              color: "bg-blue-50 text-blue-700 border-blue-100",
            },
            {
              label: "إدارة السائقين",
              href: "/admin",
              icon: Truck,
              color: "bg-purple-50 text-purple-700 border-purple-100",
            },
            {
              label: "تقرير سريع",
              href: "/admin/quick-report",
              icon: Flame,
              color: "bg-amber-50 text-amber-700 border-amber-100",
            },
            {
              label: "إدارة سعر الصرف",
              href: "/admin/currency",
              icon: DollarSign,
              color: "bg-green-50 text-green-700 border-green-100",
            },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${action.color} hover:shadow-md transition`}
            >
              <action.icon className="h-5 w-5" />
              <span className="font-semibold">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* Main Content Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex overflow-x-auto">
              {[
                { id: "orders", name: "الطلبات", icon: ShoppingCart },
                { id: "products", name: "المنتجات", icon: Package },
                { id: "drivers", name: "السائقين", icon: Truck },
                { id: "reports", name: "التقارير", icon: FileText },
                { id: "settings", name: "الإعدادات", icon: Settings },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 py-3 sm:py-4 px-3 sm:px-6 border-b-2 font-medium text-xs sm:text-sm transition-all ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
                  }`}
                >
                  <tab.icon className="h-4 w-4 sm:h-5 sm:w-5 inline mr-1 sm:mr-2" />
                  <span className="whitespace-nowrap">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {/* Orders Tab */}
            {activeTab === "orders" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    الطلبات الأخيرة ({filteredOrders.length})
                  </h2>

                  {/* Filters */}
                  <div className="flex gap-3 flex-wrap">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="text-sm border-2 border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 font-medium hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer"
                    >
                      <option value="all">🔍 جميع الحالات</option>
                      <option value="pending">⏳ قيد الانتظار</option>
                      <option value="confirmed">✅ مؤكد</option>
                      <option value="on_delivery">🚚 جاري التوصيل</option>
                      <option value="delivered">📦 تم التوصيل</option>
                      <option value="cancelled">❌ ملغي</option>
                    </select>

                    {regions.length > 0 && (
                      <select
                        value={regionFilter}
                        onChange={(e) => setRegionFilter(e.target.value)}
                        className="text-sm border-2 border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 font-medium hover:border-purple-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all cursor-pointer"
                      >
                        <option value="all">📍 جميع المناطق</option>
                        {regions.map((region) => (
                          <option key={region} value={region}>
                            {region}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Mobile Orders List */}
                <div className="space-y-3 sm:hidden">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            طلب #{String(order.id).slice(-8)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatDate(order.created_at ?? new Date())}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : order.status === "confirmed"
                              ? "bg-blue-100 text-blue-800"
                              : order.status === "on_delivery"
                              ? "bg-orange-100 text-orange-800"
                              : order.status === "delivered"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {formatOrderStatus(order.status)}
                        </span>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">العميل:</span>
                          <span className="text-gray-900">
                            {order.users?.name ?? "-"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">الهاتف:</span>
                          <span className="text-gray-900">
                            {order.users?.phone ?? "-"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">المجموع:</span>
                          <span className="text-gray-900 font-medium">
                            {formatCurrency(Number(order.total_price ?? 0))}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          عرض التفاصيل
                        </Link>
                        {order.status === "pending" && (
                          <>
                            <button
                              type="button"
                              className="flex-1 inline-flex items-center justify-center bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md"
                              onClick={() =>
                                updateOrderStatus(order.id, "confirmed")
                              }
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              تأكيد
                            </button>
                            {drivers.length > 0 && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    assignDriver(order.id, e.target.value);
                                  }
                                }}
                                className="flex-1 text-sm border-2 border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 font-medium hover:border-purple-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all duration-200 cursor-pointer"
                              >
                                <option value="">🚗 اختر السائق</option>
                                {getDriversForRegion(
                                  extractRegion(order.address_text ?? "")
                                ).map((driver) => (
                                  <option key={driver.id} value={driver.id}>
                                    {driver.users?.name ?? "سائق"}{" "}
                                    {driver.vehicle_info
                                      ? `- ${driver.vehicle_info}`
                                      : ""}
                                  </option>
                                ))}
                              </select>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                          الطلب
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                          العميل
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                          الحالة
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                          المجموع
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                          الإجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                #{String(order.id).slice(-8)}
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatDate(order.created_at ?? new Date())}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {order.users?.name ?? "-"}
                            </div>
                            <div className="text-sm text-gray-600">
                              {order.users?.phone ?? "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                order.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : order.status === "confirmed"
                                  ? "bg-blue-100 text-blue-800"
                                  : order.status === "on_delivery"
                                  ? "bg-orange-100 text-orange-800"
                                  : order.status === "delivered"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {formatOrderStatus(order.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(Number(order.total_price ?? 0))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/admin/orders/${order.id}`}
                                className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                              >
                                <FileText className="h-4 w-4" />
                                عرض
                              </Link>
                              {order.status === "pending" && (
                                <>
                                  <button
                                    onClick={() =>
                                      updateOrderStatus(order.id, "confirmed")
                                    }
                                    className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-200 transition-colors"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    تأكيد
                                  </button>
                                  {drivers.length > 0 && (
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          assignDriver(order.id, e.target.value);
                                        }
                                      }}
                                      className="text-sm border-2 border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-900 font-medium hover:border-purple-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all cursor-pointer"
                                    >
                                      <option value="">🚗 اختر السائق</option>
                                      {getDriversForRegion(
                                        extractRegion(order.address_text ?? "")
                                      ).map((driver) => (
                                        <option key={driver.id} value={driver.id}>
                                          {driver.users?.name ?? "سائق"}{" "}
                                          {driver.vehicle_info
                                            ? `- ${driver.vehicle_info}`
                                            : ""}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === "products" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    المنتجات ({products.length})
                  </h2>
                  <Link
                    href="/admin/products/new"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة منتج
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          المنتج
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          السعر
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          المخزون
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الإجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.category}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(product.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.stock_estimate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-4 w-4 inline" />
                            </Link>
                            <button className="text-red-600 hover:text-red-900">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Drivers Tab */}
            {activeTab === "drivers" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    السائقين ({drivers.length})
                  </h2>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
                    <UserPlus className="h-4 w-4 mr-2" />
                    إضافة سائق
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          السائق
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          المركبة
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          المنطقة
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الحالة
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الإجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {drivers.map((driver) => (
                        <tr key={driver.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {driver.users.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {driver.users.phone}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {driver.vehicle_info}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              {driver.region || "غير محدد"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                driver.active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {driver.active ? "نشط" : "غير نشط"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Edit className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === "reports" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    تقارير السائقين
                  </h2>
                  <button
                    onClick={fetchDriverReports}
                    disabled={reportsLoading}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <RefreshCcw
                      className={`h-4 w-4 ${
                        reportsLoading ? "animate-spin" : ""
                      }`}
                    />
                    تحديث
                  </button>
                </div>

                {reportsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : driverReports.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            السائق
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            عدد التوصيلات
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            المكتملة
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            الإجمالي
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {driverReports.map((report: any) => (
                          <tr key={report.driver_id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {report.driver_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {report.total_deliveries}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {report.completed_deliveries}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(report.total_amount || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    لا توجد تقارير متاحة
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab - Enhanced */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="border-b-2 border-gray-200 pb-4">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                    إعدادات النظام
                  </h2>
                  <p className="text-gray-600 mt-2">إدارة جميع إعدادات المنصة والعمليات</p>
                </div>

                {/* Quick Settings Cards */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Exchange Rate Card */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-600 rounded-xl">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">سعر الصرف</h3>
                          <p className="text-sm text-gray-600">إدارة سعر الدولار</p>
                        </div>
                      </div>
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    
                    {currentRate && (
                      <div className="bg-white rounded-xl p-4 border-2 border-green-200 mb-4">
                        <p className="text-sm text-gray-600 mb-1">السعر الحالي</p>
                        <p className="text-3xl font-black text-green-700">
                          {formatCurrency(currentRate)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">لكل 1 دولار</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateExchangeRate}
                        disabled={isUpdatingRate}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
                      >
                        {isUpdatingRate ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            جاري التحديث...
                          </>
                        ) : (
                          <>
                            <RefreshCcw className="h-4 w-4" />
                            تحديث السعر
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Price Sync Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-xl">
                          <Zap className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">مزامنة الأسعار</h3>
                          <p className="text-sm text-gray-600">تحديث أسعار المنتجات</p>
                        </div>
                      </div>
                      <Sparkles className="h-5 w-5 text-blue-600" />
                    </div>
                    
                    <div className="bg-white rounded-xl p-4 border-2 border-blue-200 mb-4">
                      <p className="text-sm text-gray-600 mb-2">
                        📦 عدد المنتجات: <span className="font-bold text-gray-900">{products.length}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        سيتم تحديث جميع المنتجات المسعرة بالدولار
                      </p>
                    </div>

                    <button
                      onClick={handlePricingSync}
                      disabled={isSyncingPrices}
                      className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
                    >
                      {isSyncingPrices ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          جاري المزامنة...
                        </>
                      ) : (
                        <>
                          <RefreshCcw className="h-4 w-4" />
                          مزامنة الأسعار
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Commission Settings Section */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 shadow-md">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
                      <Percent className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">إعدادات العمولة</h3>
                      <p className="text-sm text-gray-600">تحديد نسب العمولة للمنصة والسائقين</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-xl p-1 border-2 border-purple-100">
                    <CommissionSettings />
                  </div>
                </div>

                {/* Additional Settings Cards */}
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Notifications */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Bell className="h-5 w-5 text-yellow-600" />
                      </div>
                      <h4 className="font-bold text-gray-900">الإشعارات</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">إدارة إشعارات النظام</p>
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      إعدادات الإشعارات →
                    </button>
                  </div>

                  {/* Delivery Settings */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Truck className="h-5 w-5 text-orange-600" />
                      </div>
                      <h4 className="font-bold text-gray-900">التوصيل</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">إعدادات رسوم التوصيل</p>
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      إعدادات التوصيل →
                    </button>
                  </div>

                  {/* System Settings */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Settings className="h-5 w-5 text-gray-600" />
                      </div>
                      <h4 className="font-bold text-gray-900">عام</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">إعدادات النظام العامة</p>
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      الإعدادات العامة →
                    </button>
                  </div>
                </div>

                {/* Info Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-5 flex items-start gap-4">
                  <Sparkles className="h-6 w-6 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-lg mb-1">💡 نصيحة</h4>
                    <p className="text-blue-50 text-sm">
                      تأكد من تحديث سعر الصرف يومياً للحصول على أسعار دقيقة. يتم التحديث التلقائي كل يوم عند الساعة 12 صباحاً.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}