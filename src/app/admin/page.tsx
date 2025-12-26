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
      fetchCurrentRate(); // جلب سعر الصرف عند تحميل الصفحة

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
      // استخدام API موحد بدلاً من 3 طلبات منفصلة
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
        await fetchData(); // Refresh data
      }
    } catch (error) {
      console.error("Error updating order status:", error);
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
        await fetchData(); // Refresh data
      }
    } catch (error) {
      console.error("Error assigning driver:", error);
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
    // be defensive: total_price might be null/undefined
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

  // فلترة الطلبات حسب الحالة
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

  // فلترة السائقين حسب المنطقة باستخدام حقل region
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
              {/* زر تحديث سعر الصرف */}
              <div className="bg-white/10 rounded-2xl p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-blue-100 mb-1">سعر الدولار</p>
                    <p className="text-2xl font-bold">
                      {currentRate ? formatCurrency(currentRate) : "—"}
                    </p>
                  </div>
                  <button
                    onClick={handleUpdateExchangeRate}
                    disabled={isUpdatingRate}
                    className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-semibold transition disabled:opacity-50"
                    title="تحديث سعر الصرف من API"
                  >
                    <RefreshCcw
                      className={`h-4 w-4 ${
                        isUpdatingRate ? "animate-spin" : ""
                      }`}
                    />
                    {isUpdatingRate ? "جاري..." : "تحديث"}
                  </button>
                </div>
              </div>

              {/* زر تحديث جميع الأسعار */}
              <button
                onClick={handlePricingSync}
                disabled={isSyncingPrices}
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-5 py-3 rounded-2xl font-semibold transition disabled:opacity-50"
              >
                <RefreshCcw
                  className={`h-4 w-4 ${isSyncingPrices ? "animate-spin" : ""}`}
                />
                {isSyncingPrices
                  ? "جاري تحديث الأسعار..."
                  : "تحديث جميع الأسعار"}
              </button>
            </div>
          </div>
        </div>

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

        {/* 🔥 الأزرار السريعة - تم إصلاح رابط التقرير السريع */}
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
              href: "/admin/quick-report", // 🆕 تم الإصلاح!
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

        {/* باقي المحتوى (تم حذفه لتوفير المساحة ولكنه موجود في الملف الأصلي) */}
      </div>
    </div>
  );
}