"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Package, Eye, EyeOff } from "lucide-react";

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
  const [success, setSuccess] = useState("");
  const [passwordStrength, setPasswordStrength] = useState("");
  const router = useRouter();
  const supabase = createClient();

  // Check password strength
  const checkPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[a-z]/.test(pass)) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^a-zA-Z0-9]/.test(pass)) strength++;

    if (strength <= 2)
      return { text: "ضعيفة", color: "text-red-600", bg: "bg-red-600" };
    if (strength === 3)
      return { text: "متوسطة", color: "text-yellow-600", bg: "bg-yellow-600" };
    return { text: "قوية", color: "text-green-600", bg: "bg-green-600" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

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

    if (username.length < 3) {
      setError("اسم المستخدم يجب أن يكون 3 أحرف على الأقل");
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

    try {
      // Check if username is unique
      const { data: existingUser } = await supabase
        .from("users")
        .select("username")
        .eq("username", username.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        setError("اسم المستخدم محجوز. يرجى اختيار اسم آخر");
        setLoading(false);
        return;
      }

      // Create email from username (Supabase requires email for auth)
      const generatedEmail = `${username.toLowerCase()}@estore.local`;

      // Sign up with Supabase Auth
      // Note: Email confirmation should be disabled in Supabase Dashboard
      // Go to: Authentication → Providers → Email → Confirm email: OFF
      const { data, error } = await supabase.auth.signUp({
        email: generatedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: name,
            name: name,
            username: username.toLowerCase(),
            phone: fullPhone,
          },
        },
      });

      if (error) {
        // Better error messages
        if (error.message.includes("already registered")) {
          setError("اسم المستخدم مستخدم بالفعل");
        } else if (error.message.includes("Invalid email")) {
          setError("حدث خطأ في التسجيل. يرجى المحاولة مرة أخرى");
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // The user profile will be created automatically by the database trigger
        // Wait a moment for the trigger to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Redirect to home page
        router.push("/");
        router.refresh();
      }
    } catch (err: unknown) {
      console.error("Signup error:", err);
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
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Package className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            إنشاء حسابك
          </h2>
          <p className="mt-2 text-center text-sm text-gray-700">
            أو{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              تسجيل الدخول إلى حساب موجود
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                الاسم الكامل
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="الاسم الكامل"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="username" className="sr-only">
                اسم المستخدم
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="اسم المستخدم"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                  )
                }
              />
            </div>
            <div>
              <label htmlFor="phone" className="sr-only">
                رقم الهاتف
              </label>
              <div className="flex" dir="ltr">
                <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-700 sm:text-sm font-medium">
                  +963
                </span>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  maxLength={9}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="912345678"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setPhone(value);
                  }}
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  كلمة المرور
                </label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="كلمة المرور (8 أحرف على الأقل)"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    const strength = checkPasswordStrength(e.target.value);
                    setPasswordStrength(e.target.value ? strength.text : "");
                  }}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center z-10"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {password && (
                <div className="mt-1 px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">
                      قوة كلمة المرور:
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        checkPasswordStrength(password).color
                      }`}
                    >
                      {passwordStrength}
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full bg-gray-200 rounded">
                    <div
                      className={`h-1 rounded transition-all ${
                        checkPasswordStrength(password).bg
                      }`}
                      style={{
                        width:
                          passwordStrength === "ضعيفة"
                            ? "33%"
                            : passwordStrength === "متوسطة"
                            ? "66%"
                            : "100%",
                      }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <p className={password.length >= 8 ? "text-green-600" : ""}>
                      {password.length >= 8 ? "✓" : "○"} 8 أحرف على الأقل
                    </p>
                    <p
                      className={/[a-z]/.test(password) ? "text-green-600" : ""}
                    >
                      {/[a-z]/.test(password) ? "✓" : "○"} حرف صغير (a-z)
                    </p>
                    <p
                      className={/[A-Z]/.test(password) ? "text-green-600" : ""}
                    >
                      {/[A-Z]/.test(password) ? "✓" : "○"} حرف كبير (A-Z)
                    </p>
                    <p
                      className={/[0-9]/.test(password) ? "text-green-600" : ""}
                    >
                      {/[0-9]/.test(password) ? "✓" : "○"} رقم (0-9)
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <label htmlFor="confirm-password" className="sr-only">
                تأكيد كلمة المرور
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="تأكيد كلمة المرور"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center z-10"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-blue-50 border border-blue-200 text-blue-600 px-4 py-3 rounded-md">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "جاري إنشاء الحساب..."
                : "إنشاء حساب بالبريد الإلكتروني"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
