"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  Truck,
  Calendar,
  RefreshCcw,
} from "lucide-react";

interface AdvancedStats {
  today: {
    date: string;
    orders: {
      total: number;
      byStatus: {
        pending: number;
        confirmed: number;
        on_delivery: number;
        delivered: number;
        cancelled: number;
      };
    };
    revenue: number;
    avgOrderValue: number;
    conversionRate: number;
    productsSold: Array<{
      name: string;
      sku: string;
      category: string;
      quantity: number;
      revenue: number;
    }>;
    totalItemsSold: number;
  };
  yesterday: {
    orders: number;
    revenue: number;
  };
  week: {
    orders: number;
    revenue: number;
  };
  month: {
    orders: number;
    revenue: number;
  };
  comparisons: {
    ordersVsYesterday: number;
    revenueVsYesterday: number;
  };
  topProducts: Array<{
    product_id: string;
    product_name: string;
    total_quantity: number;
    total_revenue: number;
  }>;
  deliveries: {
    byRegion: Record<string, number>;
    driverPerformance: Array<{
      driverId: string;
      region: string;
      active: boolean;
      totalDeliveries: number;
      completed: number;
      pending: number;
    }>;
  };
  drivers: {
    total: number;
    active: number;
  };
}

export default function AdvancedStatsComponent() {
  const [stats, setStats] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/advanced-stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching advanced stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // تحديث تلقائي كل 30 ثانية
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إحصائيات متقدمة</h2>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              آخر تحديث: {lastUpdated.toLocaleTimeString("ar-SY")}
            </p>
          )}
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {/* Today's Stats - Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders Today */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">طلبات اليوم</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.today.orders.total}
              </p>
              {stats.comparisons.ordersVsYesterday !== 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {stats.comparisons.ordersVsYesterday > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      stats.comparisons.ordersVsYesterday > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {Math.abs(stats.comparisons.ordersVsYesterday)}% vs الأمس
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إيرادات اليوم</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats.today.revenue)}
              </p>
              {stats.comparisons.revenueVsYesterday !== 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {stats.comparisons.revenueVsYesterday > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      stats.comparisons.revenueVsYesterday > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {Math.abs(stats.comparisons.revenueVsYesterday)}% vs الأمس
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Items Sold Today */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">منتجات مباعة</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.today.totalItemsSold}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.today.productsSold.length} منتج مختلف
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">متوسط قيمة الطلب</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats.today.avgOrderValue)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                معدل التحويل: {stats.today.conversionRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Orders by Status */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          حالة الطلبات اليوم
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(stats.today.orders.byStatus).map(
            ([status, count]) => (
              <div key={status} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {status === "pending"
                    ? "قيد الانتظار"
                    : status === "confirmed"
                    ? "مؤكد"
                    : status === "on_delivery"
                    ? "جاري التوصيل"
                    : status === "delivered"
                    ? "تم التسليم"
                    : "ملغي"}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Products Sold Today */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          المنتجات المباعة اليوم
        </h3>
        {stats.today.productsSold.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    المنتج
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    التصنيف
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    الكمية
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    الإيرادات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.today.productsSold.slice(0, 10).map((product, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {product.category}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {product.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatCurrency(product.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            لا توجد منتجات مباعة اليوم بعد
          </p>
        )}
      </div>

      {/* Time Period Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-sm text-gray-600 mb-2">إيرادات الأسبوع</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.week.revenue)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{stats.week.orders} طلب</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-sm text-gray-600 mb-2">إيرادات الشهر</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.month.revenue)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{stats.month.orders} طلب</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-sm text-gray-600 mb-2">السائقين</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.drivers.active} / {stats.drivers.total}
          </p>
          <p className="text-sm text-gray-500 mt-1">نشط / إجمالي</p>
        </div>
      </div>

      {/* Driver Performance */}
      {stats.deliveries.driverPerformance.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            أداء السائقين اليوم
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    المنطقة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    إجمالي التوصيلات
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    مكتمل
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                    قيد التنفيذ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.deliveries.driverPerformance.map((driver, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {driver.region}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          driver.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {driver.active ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {driver.totalDeliveries}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">
                      {driver.completed}
                    </td>
                    <td className="px-4 py-3 text-sm text-orange-600 font-medium">
                      {driver.pending}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
