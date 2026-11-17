"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import CommissionSettings from "@/components/CommissionSettings";
import DeliveryFeeSettings from "@/components/DeliveryFeeSettings";
import NotificationSettings from "@/components/NotificationSettings";
import GeneralSettings from "@/components/GeneralSettings";
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
import { CircularProgress, Box, FormControl, InputLabel, Select as MuiSelect, MenuItem as MuiMenuItem, ButtonBase, Button } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import ConfirmationModal from "@/components/ConfirmationModal";
import { toast } from "sonner";

// MUI Theme for elegant styling
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { arEG } from "@mui/material/locale";

const adminTheme = createTheme(
  {
    direction: "rtl",
    palette: {
      primary: { main: "#4f46e5" },
      secondary: { main: "#7c3aed" },
      success: { main: "#059669" },
      warning: { main: "#d97706" },
      error: { main: "#dc2626" },
    },
    typography: {
      fontFamily: '"Tajawal", "Roboto", sans-serif',
    },
    shape: { borderRadius: 12 },
  },
  arEG
);

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

  // Delete Product State
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete Product Handler
  const handleDeleteProduct = async () => {
    if (!deleteProductId) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/products/${deleteProductId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("تم حذف المنتج بنجاح");
        await fetchData(); // Refresh data
        setDeleteProductId(null);
      } else {
        const data = await response.json();
        toast.error(data.error || "فشل حذف المنتج");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("حدث خطأ أثناء حذف المنتج");
    } finally {
      setIsDeleting(false);
    }
  };

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
        description: `تم تحديث ${syncResult.updatedCount ?? 0
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
            <CircularProgress size={60} />
          </Box>
        </div>
      </div>
    );
  }

  if (!user || profile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Admin Access Required
            </h1>
            <p className="text-gray-700">
              You need admin privileges to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
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
    <ThemeProvider theme={adminTheme}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <Navigation />

        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
          {/* Enhanced Header with Gradient */}
          <div className=" to-indigo-700 text-black rounded-3xl p-6 sm:p-8 shadow-2xl border border-blue-400/20">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 backdrop-blur-sm text-black text-sm font-bold shadow-lg border border-white/30">
                  <Sparkles className="h-4 w-4" />
                  لوحة الإدارة المتقدمة
                </div>
                <h1 className="text-2xl sm:text-3xl font-black mt-3 drop-shadow-lg">
                  أهلاً {profile?.name || "مدير"}، إدارة جميع عمليات المتجر في
                  مكان واحد
                </h1>
                <p className="text-sm sm:text-base text-black mt-2 font-medium">
                  تابع الطلبات، حدّث الأسعار، وفعّل السائقين الفاعلين في الوقت
                  الحقيقي.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <div className="bg-white rounded-xl shadow-xl border-2 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-600 rounded-lg shadow-lg ml-3">
                  <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm font-bold text-gray-600">
                    إجمالي الطلبات
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-black text-gray-900">
                    {stats.totalOrders}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xl border-2 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="p-2 bg-amber-600 rounded-lg shadow-lg ml-3">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm font-bold text-gray-600">
                    طلبات في الانتظار
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-black text-gray-900">
                    {stats.pendingOrders}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xl border-2 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-600 rounded-lg shadow-lg ml-3">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm font-bold text-gray-600">
                    إجمالي الإيرادات
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-black text-gray-900">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xl border-2 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-600 rounded-lg shadow-lg ml-3">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm font-bold text-gray-600">
                    إجمالي العمولة
                  </p>
                  <p className="text-base sm:text-lg lg:text-xl font-black text-green-600">
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
                color:
                  "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-400/30 shadow-xl shadow-blue-500/20",
              },
              {
                label: "إدارة العروض",
                href: "/admin/offers",
                icon: Sparkles,
                color:
                  "bg-gradient-to-br from-pink-600 to-pink-700 text-white border-pink-400/30 shadow-xl shadow-pink-500/20",
              },
              {
                label: "إدارة السائقين",
                href: "/admin",
                icon: Truck,
                color:
                  "bg-gradient-to-br from-purple-600 to-purple-700 text-white border-purple-400/30 shadow-xl shadow-purple-500/20",
              },
              {
                label: "تقرير سريع",
                href: "/admin/quick-report",
                icon: Flame,
                color:
                  "bg-gradient-to-br from-orange-600 to-orange-700 text-white border-orange-400/30 shadow-xl shadow-orange-500/20",
              },
              {
                label: "إدارة سعر الصرف",
                href: "/admin/currency",
                icon: DollarSign,
                color:
                  "bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-emerald-400/30 shadow-xl shadow-emerald-500/20",
              },
            ].map((action) => (
              <ButtonBase
                key={action.label}
                component={Link}
                href={action.href}
                focusRipple
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-sm ${action.color} transition-all duration-200`}
                sx={{
                  direction: "rtl",
                  px: 2,
                  py: 2,
                  borderRadius: "16px",
                  width: "100%",
                  justifyContent: "flex-start",
                  textAlign: "right",
                  position: "relative",
                  overflow: "hidden",

                  "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    background: "rgba(255,255,255,0)",
                    transition: "all .25s ease",
                  },

                  "&:hover::before": {
                    background: "rgba(0, 0, 0, 0.08)",
                  },
                }}
              >
                <action.icon className="h-5 w-5" />
                <span className="font-bold">{action.label}</span>
              </ButtonBase>
            ))}
          </div>


          {/* Main Content Tabs */}
          <div className="bg-white rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden">
            <div className="border-b-2 border-gray-200 bg-gray-50">
              <nav className="-mb-px flex overflow-x-auto">
                {[
                  { id: "orders", name: "الطلبات", icon: ShoppingCart },
                  { id: "products", name: "المنتجات", icon: Package },
                  { id: "drivers", name: "السائقين", icon: Truck },
                  { id: "reports", name: "التقارير", icon: FileText },
                  { id: "settings", name: "الإعدادات", icon: Settings },
                ].map((tab) => (
                  <Button
                    sx={{
                      flexShrink: 0,
                      py: { xs: "12px", sm: "16px" },
                      px: { xs: "12px", sm: "24px" },
                      borderBottom: "2px solid",
                      fontWeight: "bold",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      transition: "all .2s ease",

                      ...(activeTab === tab.id
                        ? {
                          borderColor: "#2563eb", // blue-600
                          color: "#1d4ed8", // blue-700
                          backgroundColor: "#eff6ff", // blue-50
                        }
                        : {
                          borderColor: "transparent",
                          color: "#4b5563", // gray-600

                          "&:hover": {
                            color: "#111827", // gray-900
                            borderColor: "#9ca3af", // gray-400
                            backgroundColor: "#f3f4f6", // gray-100
                          },
                        }),
                    }}

                    variant="text"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}>
                    <tab.icon className="h-4 w-4 sm:h-5 sm:w-5 inline mr-1 sm:mr-2" />
                    <span className="whitespace-nowrap">{tab.name}</span>
                  </Button>
                ))}
              </nav>
            </div>

            <div className="p-4 sm:p-6 bg-gray-50">
              {/* Orders Tab */}
              {activeTab === "orders" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      الطلبات الأخيرة ({filteredOrders.length})
                    </h2>

                    {/* Filters */}
                    <div className="flex gap-3 flex-wrap">
                      <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel id="status-filter-label" sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem', '&.Mui-focused': { color: '#2563eb' } }}>الحالة</InputLabel>
                        <MuiSelect
                          labelId="status-filter-label"
                          value={statusFilter}
                          label="الحالة"
                          onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}
                          sx={{
                            borderRadius: '0.75rem',
                            fontFamily: 'inherit',
                            fontWeight: 'bold',
                            fontSize: '0.875rem',
                            backgroundColor: 'white',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db', borderWidth: 2 },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
                          }}
                          MenuProps={{ disableScrollLock: true, PaperProps: { sx: { borderRadius: '0.75rem', mt: 0.5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)' } } }}
                        >
                          <MuiMenuItem value="all" sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem' }}> جميع الحالات</MuiMenuItem>
                          <MuiMenuItem value="pending" sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem' }}>⏳ قيد الانتظار</MuiMenuItem>
                          <MuiMenuItem value="confirmed" sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem' }}>✅ مؤكد</MuiMenuItem>
                          <MuiMenuItem value="on_delivery" sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem' }}>🚚 جاري التوصيل</MuiMenuItem>
                          <MuiMenuItem value="delivered" sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem' }}>📦 تم التوصيل</MuiMenuItem>
                          <MuiMenuItem value="cancelled" sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem' }}>❌ ملغي</MuiMenuItem>
                        </MuiSelect>
                      </FormControl>

                      {regions.length > 0 && (
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                          <InputLabel id="region-filter-label" sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem', '&.Mui-focused': { color: '#7c3aed' } }}>المنطقة</InputLabel>
                          <MuiSelect
                            labelId="region-filter-label"
                            value={regionFilter}
                            label="المنطقة"
                            onChange={(e: SelectChangeEvent) => setRegionFilter(e.target.value)}
                            sx={{
                              borderRadius: '0.75rem',
                              fontFamily: 'inherit',
                              fontWeight: 'bold',
                              fontSize: '0.875rem',
                              backgroundColor: 'white',
                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db', borderWidth: 2 },
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#a855f7' },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7c3aed' },
                            }}
                            MenuProps={{ disableScrollLock: true, PaperProps: { sx: { borderRadius: '0.75rem', mt: 0.5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)' } } }}
                          >
                            <MuiMenuItem value="all" sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem' }}>📍 جميع المناطق</MuiMenuItem>
                            {regions.map((region) => (
                              <MuiMenuItem key={region} value={region} sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem' }}>
                                {region}
                              </MuiMenuItem>
                            ))}
                          </MuiSelect>
                        </FormControl>
                      )}
                    </div>
                  </div>

                  {/* Mobile Orders List */}
                  <div className="space-y-3 sm:hidden">
                    {filteredOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white rounded-lg p-4 border-2 border-gray-200 shadow-lg hover:shadow-xl hover:border-blue-300 transition-all"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              طلب #{String(order.id).slice(-8)}
                            </div>
                            <div className="text-xs text-gray-600 font-medium">
                              {formatDate(order.created_at ?? new Date())}
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset ${order.status === "pending"
                              ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                              : order.status === "confirmed"
                                ? "bg-blue-50 text-blue-700 ring-blue-600/20"
                                : order.status === "on_delivery"
                                  ? "bg-orange-50 text-orange-700 ring-orange-600/20"
                                  : order.status === "delivered"
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                                    : "bg-red-50 text-red-700 ring-red-600/20"
                              }`}
                          >
                            {formatOrderStatus(order.status)}
                          </span>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 font-medium">العميل:</span>
                            <span className="text-gray-900 font-bold">
                              {order.users?.name ?? "-"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 font-medium">الهاتف:</span>
                            <span className="text-gray-900 font-bold">
                              {order.users?.phone ?? "-"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 font-medium">المجموع:</span>
                            <span className="text-emerald-700 font-black">
                              {formatCurrency(Number(order.total_price ?? 0))}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-md"
                          >
                            عرض التفاصيل
                          </Link>
                          {order.status === "pending" && (
                            <>
                              <button
                                type="button"
                                className="flex-1 inline-flex items-center justify-center bg-emerald-600 text-white py-2 px-3 rounded-lg text-sm font-bold hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 transition-all duration-200 shadow-md"
                                onClick={() =>
                                  updateOrderStatus(order.id, "confirmed")
                                }
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                تأكيد
                              </button>
                              {drivers.length > 0 && (
                                <FormControl size="small" sx={{ flex: 1, minWidth: 140 }}>
                                  <InputLabel id={`mobile-driver-label-${order.id}`} sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem', '&.Mui-focused': { color: '#7c3aed' } }}>السائق</InputLabel>
                                  <MuiSelect
                                    labelId={`mobile-driver-label-${order.id}`}
                                    value=""
                                    label="السائق"
                                    onChange={(e: SelectChangeEvent) => {
                                      if (e.target.value) {
                                        assignDriver(order.id, e.target.value);
                                      }
                                    }}
                                    sx={{
                                      borderRadius: '0.5rem',
                                      fontFamily: 'inherit',
                                      fontWeight: 'bold',
                                      fontSize: '0.875rem',
                                      backgroundColor: 'white',
                                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db', borderWidth: 2 },
                                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#a855f7' },
                                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7c3aed' },
                                    }}
                                    MenuProps={{ disableScrollLock: true, PaperProps: { sx: { borderRadius: '0.75rem', mt: 0.5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)' } } }}
                                  >
                                    {getDriversForRegion(
                                      extractRegion(order.address_text ?? "")
                                    ).map((driver) => (
                                      <MuiMenuItem key={driver.id} value={driver.id} sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem' }}>
                                        {driver.users?.name ?? "سائق"}{" "}
                                        {driver.vehicle_info
                                          ? `- ${driver.vehicle_info}`
                                          : ""}
                                      </MuiMenuItem>
                                    ))}
                                  </MuiSelect>
                                </FormControl>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            الطلب
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            العميل
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            الحالة
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            المجموع
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            الإجراءات
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-bold text-gray-900">
                                  #{String(order.id).slice(-8)}
                                </div>
                                <div className="text-sm text-gray-600 font-medium">
                                  {formatDate(order.created_at ?? new Date())}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 font-semibold">
                                {order.users?.name ?? "-"}
                              </div>
                              <div className="text-sm text-gray-600 font-medium">
                                {order.users?.phone ?? "-"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${order.status === "pending"
                                  ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                                  : order.status === "confirmed"
                                    ? "bg-blue-50 text-blue-700 ring-blue-600/20"
                                    : order.status === "on_delivery"
                                      ? "bg-orange-50 text-orange-700 ring-orange-600/20"
                                      : order.status === "delivered"
                                        ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                                        : "bg-red-50 text-red-700 ring-red-600/20"
                                  }`}
                              >
                                {formatOrderStatus(order.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-bold">
                              {formatCurrency(Number(order.total_price ?? 0))}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link
                                  href={`/admin/orders/${order.id}`}
                                  className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-md"
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
                                      className="inline-flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      تأكيد
                                    </button>
                                    {drivers.length > 0 && (
                                      <FormControl size="small" sx={{ minWidth: 160 }}>
                                        <InputLabel id={`desktop-driver-label-${order.id}`} sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem', '&.Mui-focused': { color: '#7c3aed' } }}>السائق</InputLabel>
                                        <MuiSelect
                                          labelId={`desktop-driver-label-${order.id}`}
                                          value=""
                                          label="السائق"
                                          onChange={(e: SelectChangeEvent) => {
                                            if (e.target.value) {
                                              assignDriver(order.id, e.target.value);
                                            }
                                          }}
                                          sx={{
                                            borderRadius: '0.5rem',
                                            fontFamily: 'inherit',
                                            fontWeight: 'bold',
                                            fontSize: '0.875rem',
                                            backgroundColor: 'white',
                                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db', borderWidth: 2 },
                                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#a855f7' },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7c3aed' },
                                          }}
                                          MenuProps={{ disableScrollLock: true, PaperProps: { sx: { borderRadius: '0.75rem', mt: 0.5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)' } } }}
                                        >
                                          {getDriversForRegion(
                                            extractRegion(order.address_text ?? "")
                                          ).map((driver) => (
                                            <MuiMenuItem key={driver.id} value={driver.id} sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem' }}>
                                              {driver.users?.name ?? "سائق"}{" "}
                                              {driver.vehicle_info
                                                ? `- ${driver.vehicle_info}`
                                                : ""}
                                            </MuiMenuItem>
                                          ))}
                                        </MuiSelect>
                                      </FormControl>
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
                    <h2 className="text-lg font-bold text-gray-900">
                      المنتجات ({products.length})
                    </h2>
                    <Link
                      href="/admin/products/new"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center font-bold shadow-lg"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      إضافة منتج
                    </Link>
                  </div>
                  <div className="overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            المنتج
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            SKU
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            السعر
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            المخزون
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            الإجراءات
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">
                                {product.name}
                              </div>
                              <div className="text-sm text-gray-600 font-medium">
                                {product.category}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                              {product.sku || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-bold">
                              {formatCurrency(product.price)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                              {product.stock_estimate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <Link
                                href={`/admin/products/${product.id}`}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit className="h-4 w-4 inline" />
                              </Link>
                              <button
                                onClick={() => setDeleteProductId(product.id)}
                                className="text-red-600 hover:text-red-800"
                              >
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
              {activeTab === "drivers" && <DriverManagementComponent />}

              {/* Reports Tab */}
              {activeTab === "reports" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">
                      تقارير السائقين
                    </h2>
                    <button
                      onClick={fetchDriverReports}
                      disabled={reportsLoading}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold shadow-lg"
                    >
                      <RefreshCcw
                        className={`h-4 w-4 ${reportsLoading ? "animate-spin" : ""
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
                    <div className="overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                              السائق
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                              عدد التوصيلات
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                              المكتملة
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">
                              الإجمالي
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {driverReports.map((report: any) => (
                            <tr key={report.driver?.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                {report.driver?.name || "غير محدد"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                {report.stats?.total || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                {report.stats?.completed || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-bold">
                                {formatCurrency(report.revenue || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-600 font-medium bg-white rounded-lg shadow-lg border-2 border-gray-200">
                      لا توجد تقارير متاحة
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab - Enhanced */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="border-b-2 border-gray-300 pb-4">
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                        <Settings className="h-6 w-6 text-white" />
                      </div>
                      إعدادات النظام
                    </h2>
                    <p className="text-gray-700 mt-2 font-medium">إدارة جميع إعدادات المنصة والعمليات</p>
                  </div>
                  {/* Commission Settings Section */}
                  <div className="bg-gradient-to-br from-purple-50 via-purple-100 to-pink-100 border-2 border-purple-300 rounded-2xl p-6 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-xl">
                        <Percent className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900">إعدادات العمولة</h3>
                        <p className="text-sm text-purple-800 font-bold">تحديد نسب العمولة للمنصة والسائقين</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-1 border-2 border-purple-300 shadow-xl">
                      <CommissionSettings />
                    </div>
                  </div>

                  {/* Settings Components Grid */}
                  <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Notification Settings */}
                    <NotificationSettings />

                    {/* Delivery Fee Settings */}
                    <DeliveryFeeSettings />
                  </div>

                  {/* General Settings - Full Width */}
                  <GeneralSettings />
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!deleteProductId}
          onClose={() => setDeleteProductId(null)}
          onConfirm={handleDeleteProduct}
          title="حذف المنتج"
          description="هل أنت متأكد من رغبتك في حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء."
          confirmText="حذف المنتج"
          cancelText="إلغاء"
          variant="danger"
          isLoading={isDeleting}
        />
      </div>
    </ThemeProvider >
  );
}