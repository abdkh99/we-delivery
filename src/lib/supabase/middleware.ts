import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error(
      "Supabase URL and Key are not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // 🔥 FIX: تحسين معالجة الصفحات المحمية
  const pathname = request.nextUrl.pathname;
  
  // قائمة الصفحات العامة (لا تحتاج تسجيل دخول)
  const publicPaths = [
    "/",
    "/login",
    "/signup", 
    "/auth",
    "/products",
    "/api",
    "/offline"
  ];

  // التحقق إذا كان المسار عام
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  // 🔥 FIX: السماح للمستخدمين المسجلين بالوصول لصفحات Admin/Driver
  // حتى لو كان هناك تأخير في تحميل session
  const isProtectedPath = pathname.startsWith("/admin") || pathname.startsWith("/driver");

  if (!user && !isPublicPath) {
    // لا يوجد مستخدم ومحاولة الوصول لصفحة محمية
    // 🔥 FIX: تجنب إعادة التوجيه المستمرة
    if (!userError && !pathname.startsWith("/login")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse;
}
