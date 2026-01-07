import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * API لجلب إحصائيات متقدمة للأدمن
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // التحقق من صلاحيات الأدمن
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // التواريخ
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // 1. إحصائيات الطلبات اليومية
    const { data: todayOrders } = await supabase
      .from("orders")
      .select("id, total_price, status, created_at")
      .gte("created_at", today.toISOString());

    // 2. إحصائيات الأمس
    const { data: yesterdayOrders } = await supabase
      .from("orders")
      .select("id, total_price, status")
      .gte("created_at", yesterday.toISOString())
      .lt("created_at", today.toISOString());

    // 3. إحصائيات الأسبوع
    const { data: weekOrders } = await supabase
      .from("orders")
      .select("id, total_price, status")
      .gte("created_at", weekAgo.toISOString());

    // 4. إحصائيات الشهر
    const { data: monthOrders } = await supabase
      .from("orders")
      .select("id, total_price, status")
      .gte("created_at", monthAgo.toISOString());

    // 5. المنتجات المباعة اليوم
    const { data: todayOrderItems } = await supabase
      .from("order_items")
      .select(
        `
        qty,
        price_at_order,
        products (id, name, sku, category),
        orders!inner (created_at, status)
      `
      )
      .gte("orders.created_at", today.toISOString());

    // 6. أكثر المنتجات مبيعاً (كل الوقت)
    const { data: topProducts } = await supabase.rpc(
      "get_top_selling_products",
      { limit_count: 10 }
    );

    // 7. إحصائيات حسب الحالة (اليوم)
    const todayByStatus = {
      pending: todayOrders?.filter((o) => o.status === "pending").length || 0,
      confirmed:
        todayOrders?.filter((o) => o.status === "confirmed").length || 0,
      on_delivery:
        todayOrders?.filter((o) => o.status === "on_delivery").length || 0,
      delivered:
        todayOrders?.filter((o) => o.status === "delivered").length || 0,
      cancelled:
        todayOrders?.filter((o) => o.status === "cancelled").length || 0,
    };

    // 8. إحصائيات السائقين
    const { data: drivers } = await supabase
      .from("drivers")
      .select("id, active, region");

    const { data: driverDeliveries } = await supabase
      .from("deliveries")
      .select(
        `
        id,
        status,
        driver_id,
        drivers (id, region),
        orders!inner (created_at)
      `
      )
      .gte("orders.created_at", today.toISOString());

    // 9. الإيرادات
    const todayRevenue =
      todayOrders
        ?.filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;

    const yesterdayRevenue =
      yesterdayOrders
        ?.filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;

    const weekRevenue =
      weekOrders
        ?.filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;

    const monthRevenue =
      monthOrders
        ?.filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;

    // 10. متوسط قيمة الطلب
    const avgOrderValue =
      todayOrders && todayOrders.length > 0
        ? todayOrders.reduce((sum, o) => sum + (o.total_price || 0), 0) /
          todayOrders.length
        : 0;

    // 11. معدل التحويل
    const conversionRate =
      todayOrders && todayOrders.length > 0
        ? (todayOrders.filter((o) => o.status === "delivered").length /
            todayOrders.length) *
          100
        : 0;

    // 12. تجميع المنتجات المباعة اليوم
    const todayProductsSold = todayOrderItems?.reduce((acc, item) => {
      const productName = item.products?.name || "Unknown";
      const existing = acc.find((p) => p.name === productName);

      if (existing) {
        existing.quantity += item.qty || 0;
        existing.revenue += (item.price_at_order || 0) * (item.qty || 0);
      } else {
        acc.push({
          name: productName,
          sku: item.products?.sku || "",
          category: item.products?.category || "",
          quantity: item.qty || 0,
          revenue: (item.price_at_order || 0) * (item.qty || 0),
        });
      }

      return acc;
    }, [] as Array<{ name: string; sku: string; category: string; quantity: number; revenue: number }>);

    // ترتيب حسب الكمية
    todayProductsSold?.sort((a, b) => b.quantity - a.quantity);

    // 13. التوصيلات حسب المنطقة (اليوم)
    const deliveriesByRegion = driverDeliveries?.reduce((acc, delivery) => {
      const region = delivery.drivers?.region || "غير محدد";
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 14. أداء السائقين (اليوم)
    const driverPerformance = drivers?.map((driver) => {
      const deliveries = driverDeliveries?.filter(
        (d) => d.driver_id === driver.id
      );
      const completed = deliveries?.filter(
        (d) => d.status === "delivered"
      ).length;

      return {
        driverId: driver.id,
        region: driver.region || "غير محدد",
        active: driver.active,
        totalDeliveries: deliveries?.length || 0,
        completed: completed || 0,
        pending: (deliveries?.length || 0) - (completed || 0),
      };
    });

    // البيانات النهائية
    return NextResponse.json({
      today: {
        date: today.toISOString(),
        orders: {
          total: todayOrders?.length || 0,
          byStatus: todayByStatus,
        },
        revenue: todayRevenue,
        avgOrderValue: Math.round(avgOrderValue),
        conversionRate: Math.round(conversionRate * 100) / 100,
        productsSold: todayProductsSold || [],
        totalItemsSold:
          todayProductsSold?.reduce((sum, p) => sum + p.quantity, 0) || 0,
      },
      yesterday: {
        orders: yesterdayOrders?.length || 0,
        revenue: yesterdayRevenue,
      },
      week: {
        orders: weekOrders?.length || 0,
        revenue: weekRevenue,
      },
      month: {
        orders: monthOrders?.length || 0,
        revenue: monthRevenue,
      },
      comparisons: {
        ordersVsYesterday:
          yesterdayOrders && yesterdayOrders.length > 0
            ? Math.round(
                (((todayOrders?.length || 0) - yesterdayOrders.length) /
                  yesterdayOrders.length) *
                  100
              )
            : 0,
        revenueVsYesterday:
          yesterdayRevenue > 0
            ? Math.round(
                ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
              )
            : 0,
      },
      topProducts: topProducts || [],
      deliveries: {
        byRegion: deliveriesByRegion || {},
        driverPerformance: driverPerformance || [],
      },
      drivers: {
        total: drivers?.length || 0,
        active: drivers?.filter((d) => d.active).length || 0,
      },
    });
  } catch (error) {
    console.error("Error in advanced stats API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
