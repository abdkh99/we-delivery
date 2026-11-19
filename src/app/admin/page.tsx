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
      primary: { main: "#2d6a8f" },
      secondary: { main: "#2f7a3b" },
      success: { main: "#2f7a3b" },
      warning: { main: "#8a7413" },
      error: { main: "#a13a3a" },
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
      <div className="min-h-screen adm">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7fb9dc]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !orders.length && !products.length) {
    return (
      <div className="min-h-screen adm">
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
      <div className="min-h-screen adm">
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
      <div className="min-h-screen adm">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#7fb9dc]"></div>
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
      <div className="min-h-screen adm">
        <Navigation />

        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
          {/* Enhanced Header with Gradient */}
          <div className="adm-card adm-tint-blue p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 text-[#1f4e6b] text-sm font-semibold">
                  <Sparkles className="h-4 w-4" />
                  لوحة الإدارة المتقدمة
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mt-3 text-[#1f2430]">
                  أهلاً {profile?.name || "مدير"}، إدارة جميع عمليات المتجر في
                  مكان واحد
                </h1>
                <p className="text-sm sm:text-base text-[#4b5563] mt-2">
                  تابع الطلبات، حدّث الأسعار، وفعّل السائقين الفاعلين في الوقت
                  الحقيقي.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <div className="adm-card p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="p-2 rounded-xl ml-3 bg-[#dcedf8] text-[#2d6a8f]">
                  <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm font-medium text-[#6b7280]">
                    إجمالي الطلبات
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#1f2430]">
                    {stats.totalOrders}
                  </p>
                </div>
              </div>
            </div>

            <div className="adm-card p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="p-2 rounded-xl ml-3 bg-[#fbf6cf] text-[#8a7413]">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm font-medium text-[#6b7280]">
                    طلبات في الانتظار
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#1f2430]">
                    {stats.pendingOrders}
                  </p>
                </div>
              </div>
            </div>

            <div className="adm-card p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="p-2 rounded-xl ml-3 bg-[#e0f3e2] text-[#2f7a3b]">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm font-medium text-[#6b7280]">
                    إجمالي الإيرادات
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[#1f2430]">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="adm-card p-3 sm:p-4 lg:p-6">
              <div className="flex items-center">
                <div className="p-2 rounded-xl ml-3 bg-[#f9d5d5] text-[#a13a3a]">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm font-medium text-[#6b7280]">
                    إجمالي العمولة
                  </p>
                  <p className="text-base sm:text-lg lg:text-xl font-bold text-[#1f2430]">
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
                  "adm-btn-blue",
              },
              {
                label: "إدارة العروض",
                href: "/admin/offers",
                icon: Sparkles,
                color:
                  "adm-btn-red",
              },
              {
                label: "إدارة السائقين",
                href: "/admin",
                icon: Truck,
                color:
                  "adm-btn-green",
              },
              {
                label: "تقرير سريع",
                href: "/admin/quick-report",
                icon: Flame,
                color:
                  "adm-btn-yellow",
              },
              {
                label: "إدارة سعر الصرف",
                href: "/admin/currency",
                icon: DollarSign,
                color:
                  "adm-btn-blue",
              },
            ].map((action) => (
              <ButtonBase
                key={action.label}
                component={Link}
                href={action.href}
                focusRipple
                className={`adm-btn flex items-center gap-3 px-4 py-3 ${action.color}`}
                sx={{
                  direction: "rtl",
                  px: 2,
                  py: 2,
                  borderRadius: "16px",
                  width: "100%",
                  justifyContent: "flex-start",
                  textAlign: "right",
                }}
              >
                <action.icon className="h-5 w-5" />
                <span className="font-semibold">{action.label}</span>
              </ButtonBase>
            ))}
          </div>


          {/* Main Content Tabs */}
          <div className="adm-card overflow-hidden">
            <div className="border-b border-[#e7e5df] bg-[#faf9f5]">
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
                          borderColor: "#7fb9dc",
                          color: "#1f4e6b",
                          backgroundColor: "#dcedf8",
                        }
                        : {
                          borderColor: "transparent",
                          color: "#6b7280",

                          "&:hover": {
                            color: "#1f2430",
                            borderColor: "#d4d1c7",
                            backgroundColor: "#f1efe7",
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

            <div className="p-4 sm:p-6 bg-[#faf9f5]">
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
                        <InputLabel id="status-filter-label" sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem', '&.Mui-focused': { color: '#2d6a8f' } }}>الحالة</InputLabel>
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
                            boxShadow: 'none',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db', borderWidth: 2 },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#7fb9dc' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563eb' },
                          }}
                          MenuProps={{ disableScrollLock: true, PaperProps: { sx: { borderRadius: '0.75rem', mt: 0.5, boxShadow: '0 4px 14px rgba(31,36,48,0.08)' } } }}
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
                          <InputLabel id="region-filter-label" sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem', '&.Mui-focused': { color: '#2d6a8f' } }}>المنطقة</InputLabel>
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
                              boxShadow: 'none',
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db', borderWidth: 2 },
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#7fb9dc' },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7c3aed' },
                            }}
                            MenuProps={{ disableScrollLock: true, PaperProps: { sx: { borderRadius: '0.75rem', mt: 0.5, boxShadow: '0 4px 14px rgba(31,36,48,0.08)' } } }}
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
                        className="adm-card adm-hover p-4"
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
                              ? "bg-[#fbf6cf] text-[#6f5d0c] ring-[#ecdf86]"
                              : order.status === "confirmed"
                                ? "bg-[#dcedf8] text-[#1f4e6b] ring-[#a9d3ea]"
                                : order.status === "on_delivery"
                                  ? "bg-[#fde6d2] text-[#8a4e17] ring-[#f3c9a0]"
                                  : order.status === "delivered"
                                    ? "bg-[#e0f3e2] text-[#265f30] ring-[#b7e2bb]"
                                    : "bg-[#f9d5d5] text-[#7f2c2c] ring-[#eeb0b0]"
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
                            <span className="text-[#265f30] font-bold">
                              {formatCurrency(Number(order.total_price ?? 0))}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="adm-btn adm-btn-blue flex-1 justify-center text-center py-2 px-3 text-sm"
                          >
                            عرض التفاصيل
                          </Link>
                          {order.status === "pending" && (
                            <>
                              <button
                                type="button"
                                className="adm-btn adm-btn-green flex-1 justify-center py-2 px-3 text-sm"
                                onClick={() =>
                                  updateOrderStatus(order.id, "confirmed")
                                }
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                تأكيد
                              </button>
                              {drivers.length > 0 && (
                                <FormControl size="small" sx={{ flex: 1, minWidth: 140 }}>
                                  <InputLabel id={`mobile-driver-label-${order.id}`} sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem', '&.Mui-focused': { color: '#2d6a8f' } }}>السائق</InputLabel>
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
                                      boxShadow: 'none',
                                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db', borderWidth: 2 },
                                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#7fb9dc' },
                                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7c3aed' },
                                    }}
                                    MenuProps={{ disableScrollLock: true, PaperProps: { sx: { borderRadius: '0.75rem', mt: 0.5, boxShadow: '0 4px 14px rgba(31,36,48,0.08)' } } }}
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
                          <tr key={order.id} className="hover:bg-[#faf9f5] transition-colors">
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
                                  ? "bg-[#fbf6cf] text-[#6f5d0c] ring-[#ecdf86]"
                                  : order.status === "confirmed"
                                    ? "bg-[#dcedf8] text-[#1f4e6b] ring-[#a9d3ea]"
                                    : order.status === "on_delivery"
                                      ? "bg-[#fde6d2] text-[#8a4e17] ring-[#f3c9a0]"
                                      : order.status === "delivered"
                                        ? "bg-[#e0f3e2] text-[#265f30] ring-[#b7e2bb]"
                                        : "bg-[#f9d5d5] text-[#7f2c2c] ring-[#eeb0b0]"
                                  }`}
                              >
                                {formatOrderStatus(order.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#265f30] font-semibold">
                              {formatCurrency(Number(order.total_price ?? 0))}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link
                                  href={`/admin/orders/${order.id}`}
                                  className="adm-btn adm-btn-blue gap-1 px-3 py-1.5 text-sm"
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
                                      className="adm-btn adm-btn-green gap-1 px-3 py-1.5 text-sm"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      تأكيد
                                    </button>
                                    {drivers.length > 0 && (
                                      <FormControl size="small" sx={{ minWidth: 160 }}>
                                        <InputLabel id={`desktop-driver-label-${order.id}`} sx={{ fontFamily: 'inherit', fontWeight: 'bold', fontSize: '0.875rem', '&.Mui-focused': { color: '#2d6a8f' } }}>السائق</InputLabel>
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
                                            boxShadow: 'none',
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db', borderWidth: 2 },
                                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#7fb9dc' },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7c3aed' },
                                          }}
                                          MenuProps={{ disableScrollLock: true, PaperProps: { sx: { borderRadius: '0.75rem', mt: 0.5, boxShadow: '0 4px 14px rgba(31,36,48,0.08)' } } }}
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
                      className="adm-btn adm-btn-blue px-4 py-2"
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
                          <tr key={product.id} className="hover:bg-[#faf9f5] transition-colors">
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#265f30] font-semibold">
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
                      className="adm-btn adm-btn-blue gap-2 px-4 py-2 disabled:opacity-50"
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
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7fb9dc]"></div>
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
                            <tr key={report.driver?.id} className="hover:bg-[#faf9f5] transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                {report.driver?.name || "غير محدد"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                {report.stats?.total || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                {report.stats?.completed || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-[#265f30] font-semibold">
                                {formatCurrency(report.revenue || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-600 font-medium adm-card">
                      لا توجد تقارير متاحة
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab - Enhanced */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="border-b border-[#e7e5df] pb-4">
                    <h2 className="text-2xl font-bold text-[#1f2430] flex items-center gap-3">
                      <div className="p-2 bg-[#dcedf8] text-[#2d6a8f] rounded-xl">
                        <Settings className="h-6 w-6" />
                      </div>
                      إعدادات النظام
                    </h2>
                    <p className="text-[#6b7280] mt-2">إدارة جميع إعدادات المنصة والعمليات</p>
                  </div>
                  {/* Commission Settings Section */}
                  <div className="adm-card adm-tint-yellow p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-white/70 text-[#6f5d0c] rounded-xl">
                        <Percent className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[#1f2430]">إعدادات العمولة</h3>
                        <p className="text-sm text-[#6b7280]">تحديد نسب العمولة للمنصة والسائقين</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-1 border border-[#e7e5df]">
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