"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Package, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

export default function SetupPage() {
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  useEffect(() => {
    // Check if Supabase is configured
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    setSupabaseConfigured(
      !!(
        url &&
        key &&
        url !== "your_supabase_project_url" &&
        key !== "your_supabase_anon_key"
      )
    );
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <Package className="mx-auto h-12 w-12 text-blue-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            إعداد متجرك الإلكتروني
          </h1>
          <p className="text-lg text-gray-700">
            اتبع هذه الخطوات لتشغيل سوبر ماركت الحي
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1: Environment Variables */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              {supabaseConfigured ? (
                <CheckCircle className="h-6 w-6 text-blue-500 mr-3" />
              ) : (
                <AlertCircle className="h-6 w-6 text-yellow-500 mr-3" />
              )}
              <h2 className="text-xl font-semibold text-gray-900">
                الخطوة 1: إعداد متغيرات البيئة
              </h2>
            </div>

            {supabaseConfigured ? (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-blue-800">
                  ✅ متغيرات البيئة مُعدة! أنت جاهز للبدء.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-yellow-800">
                    ⚠️ تحتاج متغيرات البيئة إلى الإعداد. قم بإنشاء ملف{" "}
                    <code className="bg-yellow-100 px-1 rounded">
                      .env.local
                    </code>{" "}
                    في الجذر الخاص بمشروعك.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-md p-4">
                  <h3 className="font-medium text-gray-900 mb-2">
                    إنشاء ملف .env.local:
                  </h3>
                  <pre className="text-sm text-gray-700 overflow-x-auto">
                    {`# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STORE_NAME="Neighborhood Supermarket"
NEXT_PUBLIC_STORE_BASE_LAT=33.5138
NEXT_PUBLIC_STORE_BASE_LNG=36.2765
NEXT_PUBLIC_DELIVERY_RADIUS_KM=2
NEXT_PUBLIC_DELIVERY_FEE=500
NEXT_PUBLIC_FREE_DELIVERY_THRESHOLD=5000

# Loyalty System
NEXT_PUBLIC_POINTS_PER_AMOUNT=10
NEXT_PUBLIC_POINTS_AMOUNT_THRESHOLD=10000`}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Supabase Setup */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">
                الخطوة 2: إعداد مشروع Supabase
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">
                    1. إنشاء مشروع Supabase
                  </h3>
                  <a
                    href="https://supabase.com/dashboard/projects"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-700"
                  >
                    الذهاب إلى لوحة Supabase
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">
                    2. الحصول على بيانات API
                  </h3>
                  <a
                    href="https://supabase.com/dashboard/project/_/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-700"
                  >
                    الذهاب إلى إعدادات API
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="font-medium text-blue-900 mb-2">
                  انسخ هذه القيم إلى ملف .env.local:
                </h4>
                <ul className="text-blue-800 space-y-1 text-sm">
                  <li>
                    • <strong>رابط المشروع:</strong> موجود في إعدادات API
                  </li>
                  <li>
                    • <strong>مفتاح anon/public:</strong> موجود في إعدادات API
                  </li>
                  <li>
                    • <strong>مفتاح service_role:</strong> موجود في إعدادات API
                    (للعمليات الإدارية)
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Step 3: Database Schema */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-purple-500 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">
                الخطوة 3: إعداد مخطط قاعدة البيانات
              </h2>
            </div>

            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                <h4 className="font-medium text-purple-900 mb-2">
                  تشغيل مخطط قاعدة البيانات:
                </h4>
                <ol className="text-purple-800 space-y-1 text-sm">
                  <li>1. اذهب إلى لوحة مشروع Supabase</li>
                  <li>2. انتقل إلى محرر SQL</li>
                  <li>
                    3. انسخ محتويات{" "}
                    <code className="bg-purple-100 px-1 rounded">
                      supabase-schema.sql
                    </code>
                  </li>
                  <li>4. الصق وقم بتشغيل سكريبت SQL</li>
                </ol>
              </div>

              <div className="bg-gray-50 rounded-md p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  يتضمن المخطط:
                </h4>
                <ul className="text-gray-700 space-y-1 text-sm">
                  <li>• مصادقة المستخدمين والملفات الشخصية</li>
                  <li>• كتالوج المنتجات مع الفئات</li>
                  <li>• نظام إدارة الطلبات</li>
                  <li>• تتبع التوصيل</li>
                  <li>• نظام نقاط الولاء</li>
                  <li>• بيانات منتجات تجريبية</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Step 4: Restart and Test */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">
                الخطوة 4: إعادة التشغيل والاختبار
              </h2>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="font-medium text-green-900 mb-2">
                  بعد إكمال الإعداد:
                </h4>
                <ol className="text-blue-800 space-y-1 text-sm">
                  <li>1. احفظ ملف .env.local</li>
                  <li>2. أعد تشغيل خادم التطوير (Ctrl+C ثم npm run dev)</li>
                  <li>3. زر الصفحة الرئيسية لاختبار التطبيق</li>
                  <li>4. جرب إنشاء حساب وتصفح المنتجات</li>
                </ol>
              </div>

              <div className="bg-gray-50 rounded-md p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  الميزات للاختبار:
                </h4>
                <ul className="text-gray-700 space-y-1 text-sm">
                  <li>• تسجيل المستخدمين وتسجيل الدخول</li>
                  <li>• تصفح المنتجات والبحث</li>
                  <li>• وظائف سلة التسوق</li>
                  <li>• وضع الطلبات وتتبعها</li>
                  <li>• نظام نقاط الولاء</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              الحالة الحالية
            </h2>

            <div className="space-y-3">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-blue-500 mr-3" />
                <span className="text-gray-700">كود التطبيق جاهز</span>
              </div>

              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-blue-500 mr-3" />
                <span className="text-gray-700">مخطط قاعدة البيانات مُعد</span>
              </div>

              <div className="flex items-center">
                {supabaseConfigured ? (
                  <CheckCircle className="h-5 w-5 text-blue-500 mr-3" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500 mr-3" />
                )}
                <span className="text-gray-700">
                  {supabaseConfigured
                    ? "متغيرات البيئة مُعدة"
                    : "متغيرات البيئة تحتاج إعداد"}
                </span>
              </div>

              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-blue-500 mr-3" />
                <span className="text-gray-700">
                  مشروع Supabase يحتاج إلى إنشاء
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
