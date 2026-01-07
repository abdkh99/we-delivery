"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Package, Eye, EyeOff, Wifi, WifiOff } from "lucide-react";
import { withRetry, isNetworkError, getNetworkErrorMessage } from "@/lib/network-utils";

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
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const router = useRouter();
  const supabase = createClient();

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

    // Check if offline
    if (!navigator.onLine) {
      setError("لا يوجد اتصال بالإنترنت. يرجى التحقق من اتصالك والمحاولة مرة أخرى");
      setLoading(false);
      return;
    }

    try {
      // Check if username is unique with retry logic
      const { data: existingUser } = await withRetry(
        async () => {
          const result = await supabase
            .from("users")
            .select("username")
            .eq("username", username.toLowerCase())
            .maybeSingle();
          return result.data;
        },
        {
          maxRetries: 2,
          timeout: 20000,
          retryDelay: 1500,
        },
        (attempt) => {
          setIsRetrying(true);
          setRetryCount(attempt);
        }
      );

      if (existingUser) {
        setError("اسم المستخدم محجوز. يرجى اختيار اسم آخر");
        setLoading(false);
        return;
      }

      // Create email from username (Supabase requires email for auth)
      const generatedEmail = `${username.toLowerCase()}@estore.local`;

      // Sign up with Supabase Auth with retry logic
      const { data, error } = await withRetry(
        async () => {
          const result = await supabase.auth.signUp({
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
          if (result.error) throw result.error;
          return result;
        },
        {
          maxRetries: 2,
          timeout: 30000, // 30 seconds
          retryDelay: 2000,
        },
        (attempt) => {
          setIsRetrying(true);
          setRetryCount(attempt);
        }
      );

      if (error) {
        // Better error messages
        if (error.message.includes("already registered")) {
          setError("اسم المستخدم مستخدم بالفعل");
        } else if (error.message.includes("Invalid email")) {
          setError("حدث خطأ في التسجيل. يرجى المحاولة مرة أخرى");
        } else {
          setError(getNetworkErrorMessage(error));
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Wait for profile to be created by trigger, with verification
        let profileReady = false;
        for (let i = 0; i < 5; i++) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          try {
            const { data: profile } = await supabase
              .from("users")
              .select("id")
              .eq("id", data.user.id)
              .maybeSingle();
            if (profile) {
              profileReady = true;
              break;
            }
          } catch (err) {
            // Continue retrying
            console.log("Profile check attempt", i + 1);
          }
        }

        if (!profileReady) {
          // Fallback: create profile manually if trigger failed
          try {
            await withRetry(
              async () => {
                const result = await supabase.from("users").insert({
                  id: data.user.id,
                  name: name,
                  username: username.toLowerCase(),
                  phone: fullPhone,
                  email: `${username.toLowerCase()}@estore.local`,
                  role: "customer",
                });
                if (result.error) throw result.error;
                return result;
              },
              {
                maxRetries: 2,
                timeout: 20000,
                retryDelay: 1500,
              }
            );
          } catch (err) {
            console.error("Failed to create profile:", err);
            // Continue anyway - profile might have been created by trigger
          }
        }

        // Redirect to home page
        router.push("/");
        router.refresh();
      }
    } catch (err: unknown) {
      console.error("Signup error:", err);
      if (isNetworkError(err)) {
        setError(getNetworkErrorMessage(err));
      } else {
        setError("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى");
      }
    } finally {
      setLoading(false);
      setIsRetrying(false);
      setRetryCount(0);
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
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-md w-full mx-auto">
        <div className="bg-white py-8 px-4 shadow-2xl rounded-2xl sm:px-10 border border-gray-100 relative">
          
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
               <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm transform hover:rotate-6 transition-transform duration-300">
                 <Package className="h-8 w-8" />
               </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              إنشاء حساب جديد
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              انضم إلينا واستمتع بتجربة تسوق فريدة
            </p>
            
            {/* Network Status Indicator */}
            {!isOnline && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <WifiOff className="h-4 w-4" />
                <span>لا يوجد اتصال بالإنترنت</span>
              </div>
            )}
            {isRetrying && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                <Wifi className="h-4 w-4 animate-pulse" />
                <span>جاري إعادة المحاولة... ({retryCount}/2)</span>
              </div>
            )}
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Name Input */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  الاسم الكامل
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-colors"
                    placeholder="أدخل اسمك الكامل"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              {/* Username Input */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  اسم المستخدم
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-colors"
                    placeholder="username"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                      )
                    }
                  />
                </div>
              </div>

              {/* Phone Input */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  رقم الهاتف
                </label>
                <div className="mt-1 relative rounded-xl shadow-sm flex" dir="ltr">
                  <span className="inline-flex items-center px-4 py-3 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm font-semibold">
                    +963
                  </span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    className="flex-1 block w-full px-4 py-3 rounded-none rounded-r-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-colors"
                    placeholder="9xxxxxxxx"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 9) setPhone(val);
                    }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  كلمة المرور
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-colors"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordStrength(checkPasswordStrength(e.target.value));
                    }}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 left-0 pl-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${passwordStrength.bg}`} 
                        style={{ width: passwordStrength.text === "ضعيفة" ? "33%" : passwordStrength.text === "متوسطة" ? "66%" : "100%" }}
                      ></div>
                    </div>
                    <span className={`text-xs font-medium ${passwordStrength.color}`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  تأكيد كلمة المرور
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-colors"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 left-0 pl-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-red-50 p-4 border border-red-100 animate-in fade-in slide-in-from-top-2">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="rounded-xl bg-green-50 p-4 border border-green-100 animate-in fade-in slide-in-from-top-2">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <h3 className="text-sm font-medium text-green-800">{success}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading || !isOnline}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isRetrying ? "جاري إعادة المحاولة..." : "جاري إنشاء الحساب..."}
                  </>
                ) : !isOnline ? (
                  <>
                    <WifiOff className="h-5 w-5" />
                    لا يوجد اتصال بالإنترنت
                  </>
                ) : (
                  "إنشاء الحساب"
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">أو سجل الدخول عبر</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="h-5 w-5 ml-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              لديك حساب بالفعل؟{" "}
              <Link
                href="/login"
                className="font-bold text-blue-600 hover:text-blue-500 transition-colors"
              >
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
