// src/app/api/admin/driver-reports/route.ts
// API لتقارير مفصلة عن السائقين

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

    // جلب جميع السائقين مع تقاريرهم
    const { data: drivers, error: driversError } = await supabase
      .from("drivers")
      .select(`
        id,
        active,
        region,
        users:user_id (
          id,
          name,
          phone,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (driversError) {
      return NextResponse.json(
        { error: "Failed to fetch drivers", details: driversError.message },
        { status: 500 }
      );
    }

    // جلب جميع التوصيلات مع تفاصيل الطلبات
    const { data: deliveries, error: deliveriesError } = await supabase
      .from("deliveries")
      .select(`
        id,
        status,
        started_at,
        delivered_at,
        created_at,
        driver_id,
        orders:order_id (
          id,
          total_price,
          address_text,
          lat,
          lng,
          status,
          created_at,
          users:user_id (
            id,
            name,
            phone
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (deliveriesError) {
      return NextResponse.json(
        { error: "Failed to fetch deliveries", details: deliveriesError.message },
        { status: 500 }
      );
    }

    // تجميع البيانات حسب السائق
    const driverReports = drivers?.map((driver) => {
      const driverDeliveries = deliveries?.filter(
        (d) => d.driver_id === driver.id
      ) || [];

      const stats = {
        total: driverDeliveries.length,
        completed: driverDeliveries.filter((d) => d.status === "delivered").length,
        inProgress: driverDeliveries.filter((d) => d.status === "on_way").length,
        assigned: driverDeliveries.filter((d) => d.status === "assigned").length,
        failed: driverDeliveries.filter((d) => d.status === "failed").length,
        cancelled: driverDeliveries.filter((d) => d.status === "cancelled").length,
      };

      // إجمالي الإيرادات من الطلبات المكتملة
      const revenue = driverDeliveries
        .filter((d) => d.status === "delivered" && d.orders)
        .reduce((sum, d) => {
          const order = d.orders as any;
          return sum + (order?.total_price || 0);
        }, 0);

      // آخر 10 توصيلات
      const recentDeliveries = driverDeliveries
        .slice(0, 10)
        .map((d) => ({
          id: d.id,
          status: d.status,
          started_at: d.started_at,
          delivered_at: d.delivered_at,
          created_at: d.created_at,
          order: d.orders
            ? {
                id: (d.orders as any).id,
                customer_name: (d.orders as any).users?.name || "غير محدد",
                customer_phone: (d.orders as any).users?.phone || null,
                address: (d.orders as any).address_text,
                total_price: (d.orders as any).total_price,
                created_at: (d.orders as any).created_at,
              }
            : null,
        }));

      return {
        driver: {
          id: driver.id,
          name: (driver.users as any)?.name || "غير محدد",
          phone: (driver.users as any)?.phone || null,
          email: (driver.users as any)?.email || null,
          active: driver.active,
          region: driver.region,
        },
        stats,
        revenue,
        recentDeliveries,
      };
    }) || [];

    return NextResponse.json({
      success: true,
      reports: driverReports,
      totalDrivers: driverReports.length,
      totalDeliveries: deliveries?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching driver reports:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

