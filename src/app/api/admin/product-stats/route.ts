// src/app/api/admin/product-stats/route.ts
// API لجلب إحصائيات المنتجات

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // التحقق من Admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    // إجمالي المنتجات
    const { count: totalProducts } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    // منتجات بالدولار
    const { count: usdProducts } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .not("usd_price", "is", null);

    // آخر مزامنة (آخر تحديث لمنتج)
    const { data: lastUpdated } = await supabase
      .from("products")
      .select("price_updated_at")
      .not("price_updated_at", "is", null)
      .order("price_updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      totalProducts: totalProducts || 0,
      usdProducts: usdProducts || 0,
      lastSync: lastUpdated?.price_updated_at || null,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
