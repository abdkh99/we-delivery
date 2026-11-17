"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Save,
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  History,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CurrencyRate {
  id: string;
  rate: number;
  provider: string;
  fetched_at: string;
  is_manual: boolean;
  updated_by?: string;
}

export default function CurrencyManagementPage() {
  const { user, profile } = useAuth();
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [newRate, setNewRate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<CurrencyRate[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchCurrentRate();
    fetchHistory();
  }, []);

  const fetchCurrentRate = async () => {
    try {
      const response = await fetch("/api/admin/exchange-rate");
      if (response.ok) {
        const data = await response.json();
        setCurrentRate(data.rate);
      }
    } catch (error) {
      console.error("Failed to fetch rate:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/admin/currency/history");
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const handleSaveRate = async () => {
    if (!newRate || isNaN(Number(newRate))) {
      toast.error("يرجى إدخال سعر صحيح");
      return;
    }

    const rateValue = Number(newRate);
    if (rateValue <= 0) {
      toast.error("السعر يجب أن يكون أكبر من 0");
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch("/api/admin/exchange-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate: rateValue }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "فشل حفظ السعر");
      }

      const result = await response.json();

      setCurrentRate(result.rate);
      setNewRate("");

      toast.success("تم تحديث السعر بنجاح! ✅", {
        description: `السعر الجديد: ${formatCurrency(result.rate)}\nتم تحديث ${result.updatedProductsCount || 0} منتج`,
      });

      // تحديث السجل
      fetchHistory();
    } catch (error: any) {
      console.error("Error saving rate:", error);
      toast.error("فشل حفظ السعر", {
        description: error.message || "حاول مرة أخرى",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || profile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              غير مصرح
            </h1>
            <p className="text-gray-600">يجب أن تكون مديراً للوصول إلى هذه الصفحة</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-200 rounded-lg w-1/3"></div>
            <div className="bg-white rounded-xl p-6 space-y-4">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-16 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
              <h1 className="text-3xl font-bold text-gray-900">
                إدارة سعر الصرف
              </h1>
              <p className="text-gray-600 mt-1">
                تحديث سعر الدولار الأمريكي مقابل الليرة السورية
              </p>
            </div>
          </div>
        </div>

        {/* Current Rate Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <DollarSign className="h-8 w-8" />
            </div>
            <div>
              <p className="text-blue-100 text-sm font-medium">سعر الصرف الحالي</p>
              <p className="text-4xl font-black">
                {currentRate ? formatCurrency(currentRate) : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-blue-100 text-sm">
            <Clock className="h-4 w-4" />
            <span>آخر تحديث منذ لحظات</span>
          </div>
        </div>

        {/* Update Rate Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              تحديث سعر الصرف
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                السعر الجديد (ليرة سورية مقابل دولار واحد)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  placeholder="مثال: 15000"
                  className="w-full px-4 py-4 pr-12 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  disabled={isSaving}
                />
                <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>

            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">ملاحظة مهمة:</p>
                  <p>
                    عند حفظ السعر الجديد، سيتم تحديث أسعار <strong>جميع المنتجات</strong> تلقائياً
                    بناءً على سعر الدولار المحفوظ لكل منتج.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveRate}
              disabled={isSaving || !newRate}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              {isSaving ? (
                <>
                  <RefreshCcw className="h-5 w-5 animate-spin" />
                  <span>جاري التحديث...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>حفظ السعر الجديد</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* History Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <History className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                سجل التحديثات
              </h2>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              {showHistory ? "إخفاء" : "عرض"}
            </button>
          </div>

          {showHistory && (
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-8">لا توجد سجلات</p>
              ) : (
                history.slice(0, 10).map((rate) => (
                  <div
                    key={rate.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">
                          {formatCurrency(rate.rate)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(rate.fetched_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${rate.is_manual
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                        }`}>
                        {rate.is_manual ? "يدوي" : "تلقائي"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
            <div className="space-y-2 text-sm text-amber-900">
              <p className="font-semibold">معلومات مهمة:</p>
              <ul className="list-disc list-inside space-y-1 mr-4">
                <li>يمكن تحديث سعر الصرف من هذه الصفحة فقط</li>
                <li>سيتم تقريب السعر إلى أقرب 500 ليرة</li>
                <li>سيتم تحديث جميع المنتجات المسعرة بالدولار تلقائياً</li>
                <li>يتم حفظ سجل كامل لجميع التحديثات</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
