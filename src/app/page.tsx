"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { Package, Truck, Star, MapPin, Phone, Clock } from "lucide-react";
import LoadingAnimation from "@/components/LoadingAnimation";

export default function Home() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingAnimation />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              جميع منتجاتنا تُوصل إلى باب منزلك
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              سوبر ماركت فيورا - منتجات عالية الجودة مع توصيل سريع
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link
                  href="/products"
                  className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  تسوق الآن
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    ابدأ الآن
                  </Link>
                  <Link
                    href="/products"
                    className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                  >
                    تصفح المنتجات
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              لماذا تختار متجرنا؟
            </h2>
            <p className="text-lg text-gray-800">
              نجعل التسوق مريحاً وبأسعار معقولة
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-blue-700">
                توصيل سريع
              </h3>
              <p className="text-gray-800">احصل على مشترياتك خلال وقت قصير</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-blue-700">
                منتجات طازجة
              </h3>
              <p className="text-gray-800">
                منتجات يومية طازجة من موردين محليين
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-blue-700">
                نقاط الولاء
              </h3>
              <p className="text-gray-800">
                اكسب نقاط مع كل شراء واستبدلها بخصومات
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-blue-700">
                خدمة محلية
              </h3>
              <p className="text-gray-800">نخدم حيك بعناية شخصية</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            هل أنت مستعد للبدء بالتسوق؟
          </h2>
          <p className="text-lg text-gray-800 mb-8">
            انضم إلى آلاف العملاء الراضين في حيك
          </p>
          {user ? (
            <Link
              href="/products"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              تصفح المنتجات
            </Link>
          ) : (
            <Link
              href="/signup"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              إنشاء حساب
            </Link>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">اتصل بنا</h2>
            <p className="text-lg text-gray-800">
              نحن هنا لمساعدتك في أي استفسار
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-blue-700">
                الدعم الهاتفي
              </h3>
              <p dir="ltr" className="text-gray-900 font-medium ">
                +963 995 696 426
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-blue-700">
                ساعات العمل
              </h3>
              <p className="text-gray-900 font-medium">
                يومياً: 9:00 ص - 10:00 م
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4 gap-2">
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-400  to-sky-400 bg-clip-text text-transparent">
                We Delivery
              </span>
            </div>
            <p className="text-gray-300">جميع الحقوق محفوظة 2025 ©</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
