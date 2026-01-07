import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// تفعيل ISR - إعادة توليد البيانات كل 10 ثواني
export const revalidate = 10;

/**
 * API موحد لجلب جميع بيانات لوحة الإدارة دفعة واحدة
 * يقلل عدد الطلبات من 3 إلى 1
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // التحقق من صلاحيات المستخدم
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // التحقق من أن المستخدم admin
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // جلب جميع البيانات بشكل متوازي
    const [ordersResult, productsResult, driversResult] = await Promise.all([
      // جلب الطلبات
      supabase
        .from("orders")
        .select(
          `
          *,
          users:user_id(id, name, phone),
          order_items:order_items(*, products(*)),
          deliveries(*, drivers:driver_id(*, users(*)))
        `
        )
        .order("created_at", { ascending: false }),

      // جلب المنتجات
      supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false }),

      // جلب السائقين مع بيانات المستخدم
      supabase
        .from("drivers")
        .select(`
          *,
          users!drivers_user_id_fkey (
            id,
            name,
            phone,
            email
          )
        `)
        .order("created_at", { ascending: false }),
    ]);

    if (ordersResult.error) {
      console.error("Error fetching orders:", ordersResult.error);
    }
    if (productsResult.error) {
      console.error("Error fetching products:", productsResult.error);
    }
    if (driversResult.error) {
      console.error("Error fetching drivers:", driversResult.error);
    }

    return NextResponse.json(
      {
        orders: ordersResult.data || [],
        products: productsResult.data || [],
        drivers: driversResult.data || [],
      },
      {
        headers: {
          "Cache-Control": "private, s-maxage=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("Error in admin dashboard API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
