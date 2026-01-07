"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, ShoppingBag, Lock, User, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validation
    if (!username.trim()) {
      setError("اسم المستخدم مطلوب");
      setLoading(false);
      return;
    }

    if (!password) {
      setError("كلمة المرور مطلوبة");
      setLoading(false);
      return;
    }

    try {
      // Generate email from username (same as signup)
      const generatedEmail = `${username.toLowerCase()}@estore.local`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: generatedEmail,
        password,
      });

      if (error) {
        // Better error messages
        console.error("Login error details:", error);

        if (error.message.includes("Invalid login credentials")) {
          setError("اسم المستخدم أو كلمة المرور غير صحيحة");
        } else if (error.message.includes("Email not confirmed")) {
          setError(
            "⚠️ البريد الإلكتروني غير مؤكد. يرجى الاتصال بالدعم الفني أو تعطيل تأكيد البريد من إعدادات Supabase"
          );
        } else if (error.message.includes("User not found")) {
          setError("المستخدم غير موجود. يرجى التسجيل أولاً");
        } else {
          setError(`فشل تسجيل الدخول: ${error.message}`);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // Give AuthContext time to pick up the session change
        await new Promise((resolve) => setTimeout(resolve, 100));
        // Successfully logged in
        router.push("/");
        router.refresh();
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.message.includes("popup")) {
          setError("فشل فتح نافذة تسجيل الدخول بـ Google");
        } else {
          setError("فشل تسجيل الدخول بـ Google");
        }
      } else {
        setSuccess("جاري تحويلك إلى Google...");
      }
    } catch (err: unknown) {
      console.error("Google signin error:", err);
      setError("فشل تسجيل الدخول بـ Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* خلفية متحركة */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob"></div>
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-400 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* بطاقة تسجيل الدخول */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/20 backdrop-blur-sm">
          {/* الهيدر */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-blue-600 to-indigo-600 p-5 rounded-2xl transform group-hover:scale-105 transition-transform">
                  <ShoppingBag className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
              مرحباً بعودتك! 👋
            </h2>
            <p className="text-gray-600 text-base">
              سجل دخولك للوصول إلى حسابك ومتابعة التسوق
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {/* حقل اسم المستخدم */}
            <div className="space-y-2">
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-gray-700 flex items-center gap-2"
              >
                <User className="h-4 w-4 text-blue-600" />
                اسم المستخدم
              </label>
              <div className="relative group">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none block w-full px-4 py-3.5 pr-11 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 bg-gray-50 focus:bg-white"
                  placeholder="أدخل اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
              </div>
            </div>

            {/* حقل كلمة المرور */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 flex items-center gap-2"
              >
                <Lock className="h-4 w-4 text-blue-600" />
                كلمة المرور
              </label>
              <div className="relative group">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="appearance-none block w-full px-4 py-3.5 pr-11 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 bg-gray-50 focus:bg-white"
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center z-10 hover:scale-110 transition-transform"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-blue-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-blue-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* رسائل الخطأ والنجاح */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3.5 rounded-xl animate-shake">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="h-5 w-5 text-red-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{error}</div>
                    {error.includes("Invalid") && (
                      <div className="text-xs mt-1.5 text-red-600">
                        تأكد من اسم المستخدم وكلمة المرور
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3.5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-green-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold">{success}</span>
                </div>
              </div>
            )}

            {/* زر تسجيل الدخول */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  جاري تسجيل الدخول...
                </>
              ) : (
                <>
                  تسجيل الدخول
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* رابط التسجيل */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ليس لديك حساب؟{" "}
              <Link
                href="/signup"
                className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors"
              >
                إنشاء حساب جديد
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
