"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Flame,
  RefreshCcw,
  ArrowLeft,
  Users,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface QuickReportData {
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  activeDrivers: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  topProducts: Array<{
    name: string;
    category: string;
    total_quantity: number;
    total_revenue: number;
  }>;
  revenueByDay: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

export default function QuickReportPage() {
  const { user, profile } = useAuth();
  const [reportData, setReportData] = useState<QuickReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7"); // آخر 7 أيام

  useEffect(() => {
    if (profile?.role === "admin") {
      fetchReportData();
    }
  }, [profile, dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/quick-report?days=${dateRange}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch report");
      }

      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error("Error fetching report:", error);
      toast.error("فشل تحميل التقرير");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Metric,Value\n" +
      `Total Orders,${reportData.totalOrders}\n` +
      `Total Revenue,${reportData.totalRevenue}\n` +
      `Total Commission,${reportData.totalCommission}\n` +
      `Active Drivers,${reportData.activeDrivers}\n` +
      `Pending Orders,${reportData.pendingOrders}\n` +
      `Completed Orders,${reportData.completedOrders}\n` +
      `Cancelled Orders,${reportData.cancelledOrders}\n` +
      `Average Order Value,${reportData.averageOrderValue}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `quick_report_${dateRange}days.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("تم تصدير التقرير بنجاح");
  };

  if (!user || profile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              غير مصرح
            </h1>
            <p className="text-gray-600">
              يجب أن تكون مديراً للوصول إلى هذه الصفحة
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
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-200 rounded-lg w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-white rounded-lg transition"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Flame className="h-8 w-8 text-orange-600" />
                التقرير السريع
              </h1>
              <p className="text-gray-600 mt-1">
                نظرة شاملة على أداء المتجر
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="1">اليوم</option>
              <option value="7">آخر 7 أيام</option>
              <option value="30">آخر 30 يوم</option>
              <option value="90">آخر 90 يوم</option>
            </select>
            <button
              onClick={fetchReportData}
              disabled={loading}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <RefreshCcw
                className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Download className="h-4 w-4" />
              تصدير CSV
            </button>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  إجمالي الطلبات
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {reportData?.totalOrders || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingCart className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  إجمالي الإيرادات
                </p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {formatCurrency(reportData?.totalRevenue || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">العمولة</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {formatCurrency(reportData?.totalCommission || 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  متوسط قيمة الطلب
                </p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {formatCurrency(reportData?.averageOrderValue || 0)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Order Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">
              طلبات قيد الانتظار
            </p>
            <p className="text-2xl font-bold text-yellow-600">
              {reportData?.pendingOrders || 0}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">
              طلبات مكتملة
            </p>
            <p className="text-2xl font-bold text-green-600">
              {reportData?.completedOrders || 0}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm font-medium text-gray-600 mb-2">
              طلبات ملغية
            </p>
            <p className="text-2xl font-bold text-red-600">
              {reportData?.cancelledOrders || 0}
            </p>
          </div>
        </div>

        {/* Top Products */}
        {reportData?.topProducts && reportData.topProducts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                أفضل المنتجات مبيعاً
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {reportData.topProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {product.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">
                        {formatCurrency(product.total_revenue)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {product.total_quantity} وحدة
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Daily Revenue */}
        {reportData?.revenueByDay && reportData.revenueByDay.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                الإيرادات اليومية
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {reportData.revenueByDay.map((day, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <p className="font-medium text-gray-900">{day.date}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">الطلبات</p>
                        <p className="font-bold text-blue-600">{day.orders}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">الإيرادات</p>
                        <p className="font-bold text-green-600">
                          {formatCurrency(day.revenue)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}