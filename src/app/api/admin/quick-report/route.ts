// src/app/api/admin/quick-report/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // التحقق من الصلاحيات
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

    // حساب التواريخ
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // جلب بيانات اليوم
    const { data: todayOrders } = await supabase
      .from("orders")
      .select("total_price, status")
      .gte("created_at", today.toISOString());

    // جلب بيانات الأسبوع
    const { data: weekOrders } = await supabase
      .from("orders")
      .select("total_price, status")
      .gte("created_at", weekAgo.toISOString());

    // جلب بيانات الشهر
    const { data: monthOrders } = await supabase
      .from("orders")
      .select("total_price, status")
      .gte("created_at", monthAgo.toISOString());

    // حساب الإحصائيات
    const calculateStats = (orders: any[]) => ({
      orders: orders?.length || 0,
      revenue: orders?.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0) || 0,
      deliveries: orders?.filter(o => o.status === "delivered").length || 0,
    });

    // بيانات تجريبية للمنتجات والسائقين الأكثر نشاطاً
    const topProducts = [
      { name: "شيبس ليز - نكهة الخل", sales: 150, revenue: 750000 },
      { name: "بيبسي 1.5 لتر", sales: 120, revenue: 600000 },
      { name: "كيت كات", sales: 100, revenue: 500000 },
    ];

    const topDrivers = [
      { name: "محمد أحمد", deliveries: 50, revenue: 2500000 },
      { name: "خالد يوسف", deliveries: 45, revenue: 2250000 },
      { name: "سامي علي", deliveries: 40, revenue: 2000000 },
    ];

    const data = {
      today: calculateStats(todayOrders || []),
      week: calculateStats(weekOrders || []),
      month: calculateStats(monthOrders || []),
      topProducts,
      topDrivers,
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error in quick report endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
