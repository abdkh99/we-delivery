"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// أنماط مشتركة لحقول الإدخال والأزرار
const inputBase =
  "block w-full border border-gray-300 bg-white px-3.5 py-2.5 text-sm lg:px-4 lg:py-3 lg:text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600";
const inputClass = `${inputBase} rounded-lg`;
const primaryButtonClass =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm lg:py-3 lg:text-base font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    text: "",
    color: "",
    bg: "",
  });
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

  // Check password strength
  const checkPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[a-z]/.test(pass)) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^a-zA-Z0-9]/.test(pass)) strength++;

    if (strength <= 2)
      return { text: "ضعيفة", color: "text-red-600", bg: "bg-red-400" };
    if (strength === 3)
      return { text: "متوسطة", color: "text-amber-600", bg: "bg-amber-400" };
    return { text: "قوية", color: "text-emerald-600", bg: "bg-emerald-500" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (!name.trim()) {
      setError("الاسم مطلوب");
      setLoading(false);
      return;
    }

    if (!username.trim()) {
      setError("اسم المستخدم مطلوب");
      setLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
      setError(
        "اسم المستخدم يجب أن يكون من 3 إلى 30 حرفاً، بأحرف إنجليزية وأرقام وشرطة سفلية (_) فقط، بدون مسافات",
      );
      setLoading(false);
      return;
    }

    // Syrian phone validation
    if (!phone || phone.length !== 9) {
      setError("رقم الهاتف يجب أن يتكون من 9 أرقام");
      setLoading(false);
      return;
    }

    if (!/^\d+$/.test(phone)) {
      setError("رقم الهاتف يجب أن يحتوي على أرقام فقط");
      setLoading(false);
      return;
    }

    // Construct full phone with +963
    const fullPhone = `+963${phone}`;

    // Strong password validation
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      setLoading(false);
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError("كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل");
      setLoading(false);
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل");
      setLoading(false);
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError("كلمة المرور يجب أن تحتوي على رقم واحد على الأقل");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمات المرور غير متطابقة");
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
      const normalizedUsername = username.trim().toLowerCase();
      const email = `${normalizedUsername}@estore.local`;

      // إنشاء الحساب في Supabase مع تخزين بيانات المستخدم في user_metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name.trim(),
            name: name.trim(),
            username: normalizedUsername,
            phone: fullPhone,
            role: "customer",
          },
        },
      });

      if (error || !data?.user) {
        const message = error?.message || "";

        if (
          message.toLowerCase().includes("already") ||
          message.toLowerCase().includes("exists") ||
          message.includes("User already registered")
        ) {
          setError("اسم المستخدم مستخدم بالفعل");
        } else if (message.toLowerCase().includes("password")) {
          setError("كلمة المرور لا تستوفي الشروط المطلوبة");
        } else {
          setError(message || "حدث خطأ أثناء إنشاء الحساب");
        }
        setLoading(false);
        return;
      }

      // التأكد من وجود جلسة للمستخدم بعد التسجيل
      if (!data.session) {
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError || !signInData?.session) {
          console.error("Auto sign-in after signup failed:", signInError);
          setError(
            "تم إنشاء الحساب بنجاح، لكن فشل تسجيل الدخول التلقائي. يرجى محاولة تسجيل الدخول يدويًا.",
          );
          setLoading(false);
          return;
        }
      }

      // في حال النجاح نعيد توجيه المستخدم للصفحة الرئيسية
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      console.error("Signup error:", err);
      setError("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md lg:max-w-lg">
        <p className="mb-6 lg:mb-8 text-center text-xl lg:text-3xl font-bold text-blue-600">
          We Delivery
        </p>

        <div className="rounded-xl lg:rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">إنشاء حساب جديد</h1>
          <p className="mt-1 text-sm lg:text-base text-gray-500">
            أدخل بياناتك لإنشاء حسابك
          </p>

          {!isOnline && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm lg:text-base text-red-700"
            >
              لا يوجد اتصال بالإنترنت
            </div>
          )}

          <form className="mt-6 lg:mt-8 space-y-4 lg:space-y-5" onSubmit={handleSubmit}>
            {/* الاسم الكامل */}
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm lg:text-base font-medium text-gray-700"
              >
                الاسم الكامل
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                className={inputClass}
                placeholder="أدخل اسمك الكامل"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* اسم المستخدم */}
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm lg:text-base font-medium text-gray-700"
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
                placeholder="username"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  )
                }
              />
              <p className="mt-1.5 text-xs lg:text-sm text-gray-500">
                أحرف إنجليزية وأرقام وشرطة سفلية فقط، من 3 إلى 30 حرفاً
              </p>
            </div>

            {/* رقم الهاتف */}
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-sm lg:text-base font-medium text-gray-700"
              >
                رقم الهاتف
              </label>
              <div className="flex" dir="ltr">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm lg:px-4 lg:text-base text-gray-500">
                  +963
                </span>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  autoComplete="tel-national"
                  className={`${inputBase} min-w-0 flex-1 rounded-r-lg`}
                  placeholder="9xxxxxxxx"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 9) setPhone(val);
                  }}
                />
              </div>
            </div>

            {/* كلمة المرور */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm lg:text-base font-medium text-gray-700"
              >
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  className={`${inputClass} pl-10 lg:pl-12`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordStrength(checkPasswordStrength(e.target.value));
                  }}
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
                    <EyeOff className="h-4 w-4 lg:h-5 lg:w-5" />
                  ) : (
                    <Eye className="h-4 w-4 lg:h-5 lg:w-5" />
                  )}
                </button>
              </div>

              {password ? (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.bg}`}
                      style={{
                        width:
                          passwordStrength.text === "ضعيفة"
                            ? "33%"
                            : passwordStrength.text === "متوسطة"
                              ? "66%"
                              : "100%",
                      }}
                    />
                  </div>
                  <span className={`text-xs lg:text-sm ${passwordStrength.color}`}>
                    {passwordStrength.text}
                  </span>
                </div>
              ) : (
                <p className="mt-1.5 text-xs lg:text-sm text-gray-500">
                  8 أحرف على الأقل، وتحتوي على حرف كبير وحرف صغير ورقم
                </p>
              )}
            </div>

            {/* تأكيد كلمة المرور */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm lg:text-base font-medium text-gray-700"
              >
                تأكيد كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  className={`${inputClass} pl-10 lg:pl-12`}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword
                      ? "إخفاء كلمة المرور"
                      : "إظهار كلمة المرور"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 lg:h-5 lg:w-5" />
                  ) : (
                    <Eye className="h-4 w-4 lg:h-5 lg:w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm lg:text-base text-red-700"
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
                  جاري إنشاء الحساب...
                </>
              ) : !isOnline ? (
                "لا يوجد اتصال بالإنترنت"
              ) : (
                "إنشاء الحساب"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm lg:text-base text-gray-600">
          لديك حساب بالفعل؟{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
