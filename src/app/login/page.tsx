"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// أنماط مشتركة لحقول الإدخال والأزرار
const inputBase =
  "block w-full border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600";
const inputClass = `${inputBase} rounded-lg`;
const primaryButtonClass =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const router = useRouter();

  // Check online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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

    // Check if offline
    if (!navigator.onLine) {
      setError(
        "لا يوجد اتصال بالإنترنت. يرجى التحقق من اتصالك والمحاولة مرة أخرى",
      );
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const email = `${username.trim().toLowerCase()}@estore.local`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data?.user) {
        const message = error?.message || "";

        if (
          message.includes("Invalid login credentials") ||
          message.includes("تم إدخال بيانات غير صحيحة")
        ) {
          setError("اسم المستخدم أو كلمة المرور غير صحيحة");
        } else if (message.toLowerCase().includes("not found")) {
          setError("المستخدم غير موجود. يرجى التسجيل أولاً");
        } else {
          setError(message || "حدث خطأ أثناء تسجيل الدخول");
        }
        setLoading(false);
        return;
      }

      // نجاح تسجيل الدخول
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-xl font-bold text-blue-600">
          We Delivery
        </p>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-bold text-gray-900">تسجيل الدخول</h1>
          <p className="mt-1 text-sm text-gray-500">
            أدخل بياناتك للوصول إلى حسابك
          </p>

          {!isOnline && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              لا يوجد اتصال بالإنترنت
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                اسم المستخدم
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                className={inputClass}
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className={`${inputClass} pl-10`}
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isOnline}
              className={primaryButtonClass}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : !isOnline ? (
                "لا يوجد اتصال بالإنترنت"
              ) : (
                "تسجيل الدخول"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          ليس لديك حساب؟{" "}
          <Link
            href="/signup"
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            إنشاء حساب جديد
          </Link>
        </p>
      </div>
    </div>
  );
}
