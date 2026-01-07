"use client";

import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Award,
  Calendar,
  Edit,
  Package,
  Settings,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Auto-retry profile fetch if user exists but profile doesn't
  useEffect(() => {
    if (!loading && user && !profile && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount((c) => c + 1);
        refreshProfile();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, user, profile, retryCount, refreshProfile]);

  // Show loading for max 3 seconds
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (loading && !showTimeout) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      </div>
    );
  }

  // If still loading after 3 seconds, show error
  if (loading && showTimeout) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <div className="text-red-600 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              خطأ في التحميل
            </h2>
            <p className="text-gray-600 mb-4">
              عذراً، حدث خطأ في تحميل معلوماتك. يرجى المحاولة مرة أخرى.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading if we have user but no profile yet (still fetching/retrying)
  if (!loading && user && !profile && retryCount < 3) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري تحميل الملف الشخصي...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        {/* Mobile Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 rounded-full p-3 sm:p-4">
                <User className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                  {profile.name}
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  @{profile.username}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span
                    className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                      profile.role === "admin"
                        ? "bg-red-100 text-red-800"
                        : profile.role === "driver"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {profile.role === "admin"
                      ? "مدير"
                      : profile.role === "driver"
                      ? "سائق"
                      : "عميل"}
                  </span>
                  {profile.points > 0 && (
                    <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      <span>{profile.points} نقطة</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <Edit className="h-4 w-4" />
              <span>تعديل الملف</span>
            </button>
          </div>
        </div>

        {/* Contact Information - Mobile Optimized */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
            معلومات التواصل
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">رقم الهاتف</p>
                <p className="text-sm sm:text-base text-gray-900 truncate">
                  {profile.phone || "غير محدد"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">
                  البريد الإلكتروني
                </p>
                <p className="text-sm sm:text-base text-gray-900 truncate">
                  {profile.email || "غير محدد"}
                </p>
              </div>
            </div>

            {profile.address_text && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600">العنوان</p>
                  <p className="text-sm sm:text-base text-gray-900 leading-relaxed">
                    {profile.address_text}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">عضو منذ</p>
                <p className="text-sm sm:text-base text-gray-900">
                  {new Date(profile.created_at).toLocaleDateString("ar-SY", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loyalty Points - Mobile Optimized */}
        {profile.role === "customer" && (
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl shadow-sm border border-yellow-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-600" />
                  <span>نقاط الولاء</span>
                </h2>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-600">
                  {profile.points}
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  تكسب نقطة واحدة مقابل كل 1000 ليرة سورية
                </p>
              </div>
              <div className="flex justify-center sm:justify-end">
                <div className="bg-white rounded-full p-3 sm:p-4 shadow-md">
                  <Award className="h-8 w-8 sm:h-12 sm:w-12 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions - Mobile Optimized */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
            روابط سريعة
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Link
              href="/orders"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Package className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm sm:text-base">
                  طلباتي
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  عرض جميع الطلبات
                </p>
              </div>
            </Link>

            <Link
              href="/products"
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Package className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm sm:text-base">
                  المنتجات
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  تصفح المنتجات المتاحة
                </p>
              </div>
            </Link>

            {profile.role === "admin" && (
              <Link
                href="/admin"
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors sm:col-span-2"
              >
                <Settings className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm sm:text-base">
                    لوحة الإدارة
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    إدارة المتجر
                  </p>
                </div>
              </Link>
            )}

            {profile.role === "driver" && (
              <Link
                href="/driver"
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors sm:col-span-2"
              >
                <Truck className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm sm:text-base">
                    لوحة السائق
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    عرض الطلبات المخصصة
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Edit Form (Hidden by default) */}
        {isEditing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                تعديل الملف الشخصي
              </h3>
              <p className="text-gray-600 mb-4">
                سيتم إضافة إمكانية تعديل الملف الشخصي قريباً
              </p>
              <button
                onClick={() => setIsEditing(false)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
