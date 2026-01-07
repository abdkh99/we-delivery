"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import {
  Package,
  Truck,
  Star,
  MapPin,
  Phone,
  Clock,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import LoadingAnimation from "@/components/LoadingAnimation";
import Lottie from "lottie-react";
import animationData from "../animations/DeliveryTruck _Loading _Exporting.json";

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
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-70" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Text Content */}
            <div className="text-center lg:text-right order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/50 text-blue-700 text-sm font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                خدمة التوصيل الأسرع في مدينتك
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
                جميع منتجاتك <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  تصل لباب بيتك
                </span>
              </h1>

              <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                سوبر ماركت فيورا يوفر لك تجربة تسوق فريدة. منتجات طازجة، جودة
                عالية، وتوصيل سريع يضمن لك الراحة والرضا التام.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {user ? (
                  <Link
                    href="/products"
                    className="inline-flex items-center justify-center bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transform hover:-translate-y-1 transition-all duration-200 shadow-lg shadow-blue-600/20"
                  >
                    تسوق الآن
                    <ArrowLeft className="mr-2 h-5 w-5" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      className="inline-flex items-center justify-center bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transform hover:-translate-y-1 transition-all duration-200 shadow-lg shadow-blue-600/20"
                    >
                      ابدأ الآن
                      <ArrowLeft className="mr-2 h-5 w-5" />
                    </Link>
                    <Link
                      href="/products"
                      className="inline-flex items-center justify-center bg-white text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:border-blue-600 hover:text-blue-600 transition-all duration-200"
                    >
                      تصفح المنتجات
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-10 flex items-center justify-center lg:justify-start gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  <span>توصيل مجاني</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  <span>دفع آمن</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  <span>دعم 24/7</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Animation */}
            <div className="relative order-1 lg:order-2 hidden lg:flex justify-center lg:justify-end">
              <div className="relative w-full max-w-lg lg:max-w-xl">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="relative bg-white/50 backdrop-blur-sm rounded-3xl p-6 border border-white/50 shadow-2xl">
                  <Lottie
                    animationData={animationData}
                    loop={true}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              لماذا تختار متجرنا؟
            </h2>
            <p className="text-lg text-slate-600">
              نحن نجمع بين الجودة، السرعة، والراحة لنقدم لك أفضل تجربة تسوق
              ممكنة.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Truck className="h-8 w-8 text-blue-600" />}
              title="توصيل سريع"
              description="احصل على مشترياتك خلال وقت قياسي بفضل شبكة التوصيل المتطورة لدينا."
            />
            <FeatureCard
              icon={<Package className="h-8 w-8 text-indigo-600" />}
              title="منتجات طازجة"
              description="نضمن لك منتجات يومية طازجة مختارة بعناية من أفضل الموردين المحليين."
            />
            <FeatureCard
              icon={<Star className="h-8 w-8 text-amber-500" />}
              title="برنامج الولاء"
              description="اكسب نقاط مع كل عملية شراء واستبدلها بخصومات ومكافآت حصرية."
            />
            <FeatureCard
              icon={<MapPin className="h-8 w-8 text-emerald-600" />}
              title="تغطية واسعة"
              description="نصل إليك أينما كنت، ونخدم حيك بعناية واهتمام شخصي."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            جاهز لتجربة تسوق مختلفة؟
          </h2>
          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto">
            انضم إلى آلاف العملاء السعداء واستمتع بتجربة تسوق سهلة، سريعة،
            وموثوقة.
          </p>

          {user ? (
            <Link
              href="/products"
              className="inline-flex items-center bg-white text-blue-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              ابدا التسوق الآن
            </Link>
          ) : (
            <Link
              href="/signup"
              className="inline-flex items-center bg-white text-blue-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              إنشاء حساب مجاني
            </Link>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center bg-white rounded-3xl p-8 md:p-12 shadow-xl">
            <div className="text-right">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                نحن هنا لمساعدتك
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                فريق الدعم لدينا جاهز للإجابة على استفساراتك ومساعدتك في أي وقت.
                لا تتردد في التواصل معنا.
              </p>

              <div className="space-y-6">
                <div className="flex items-center gap-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 transition-colors hover:bg-blue-100">
                  <div className="bg-blue-600 p-3 rounded-xl text-white">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">اتصل بنا</h3>
                    <p
                      dir="ltr"
                      className="text-blue-700 font-semibold mt-1 text-lg"
                    >
                      +963 995 696 426
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-colors hover:bg-slate-100">
                  <div className="bg-slate-800 p-3 rounded-xl text-white">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">ساعات العمل</h3>
                    <p className="text-slate-600 mt-1">
                      يومياً: 9:00 ص - 10:00 م
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative h-full min-h-[300px] bg-blue-600 rounded-2xl overflow-hidden flex items-center justify-center p-8 text-white text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600"></div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-4">هل لديك سؤال؟</h3>
                <p className="mb-6 text-blue-100">
                  تواصل معنا عبر الواتساب لرد أسرع
                </p>
                <button className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg flex items-center gap-2 mx-auto">
                  <Phone className="w-5 h-5" />
                  تواصل عبر واتساب
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-right">
              <span className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                We Deliver
              </span>
              <p className="text-slate-400 mt-2 text-sm">
                شريكك الموثوق للتسوق اليومي
              </p>
            </div>
            <div className="flex gap-8 text-slate-400">
              <Link href="#" className="hover:text-white transition-colors">
                من نحن
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                الشروط والأحكام
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                الخصوصية
              </Link>
            </div>
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} We Deliver. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:bg-blue-50 transition-colors">
        <div className="transform group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
        {title}
      </h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function CheckCircleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
