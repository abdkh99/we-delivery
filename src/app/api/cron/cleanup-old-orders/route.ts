// src/app/api/cron/cleanup-old-orders/route.ts
// Cron Job لحذف الطلبات المكتملة أو الملغاة بعد 12 ساعة

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  console.log("\n========================================");
  console.log("🧹 CLEANUP: Old Orders");
  console.log("========================================\n");

  try {
    // التحقق من Authorization
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.CURRENCY_SYNC_SECRET;

    if (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.log("❌ Unauthorized - Invalid cron secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Authorized via Cron secret");

    const supabase = await createClient();

    // حساب التاريخ قبل 12 ساعة
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

    console.log(`📅 Deleting orders completed/cancelled before: ${twelveHoursAgo.toISOString()}`);

    // جلب الطلبات المكتملة أو الملغاة التي تم تحديثها قبل 12 ساعة
    const { data: oldOrders, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, updated_at")
      .in("status", ["delivered", "cancelled"])
      .lt("updated_at", twelveHoursAgo.toISOString());

    if (fetchError) {
      console.error("❌ Error fetching old orders:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch old orders", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!oldOrders || oldOrders.length === 0) {
      console.log("✅ No old orders to delete");
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: "No old orders to delete",
      });
    }

    console.log(`📦 Found ${oldOrders.length} old orders to delete`);

    // حذف الطلبات (سيتم حذف order_items وdeliveries تلقائياً بسبب CASCADE)
    const orderIds = oldOrders.map((o) => o.id);
    
    // ملاحظة: يجب حذف order_items وdeliveries أولاً بسبب Foreign Keys
    // ثم حذف orders
    
    let deletedCount = 0;
    const errors: string[] = [];

    for (const orderId of orderIds) {
      try {
        // حذف order_items أولاً
        const { error: itemsError } = await supabase
          .from("order_items")
          .delete()
          .eq("order_id", orderId);

        if (itemsError) {
          console.error(`❌ Error deleting order_items for ${orderId}:`, itemsError);
          errors.push(`Order ${orderId}: ${itemsError.message}`);
          continue;
        }

        // حذف deliveries
        const { error: deliveriesError } = await supabase
          .from("deliveries")
          .delete()
          .eq("order_id", orderId);

        if (deliveriesError) {
          console.error(`❌ Error deleting deliveries for ${orderId}:`, deliveriesError);
          errors.push(`Order ${orderId}: ${deliveriesError.message}`);
          continue;
        }

        // حذف points_transactions المرتبطة
        const { error: pointsError } = await supabase
          .from("points_transactions")
          .delete()
          .eq("order_id", orderId);

        // تجاهل خطأ points_transactions إذا لم تكن موجودة

        // حذف الطلب
        const { error: orderError } = await supabase
          .from("orders")
          .delete()
          .eq("id", orderId);

        if (orderError) {
          console.error(`❌ Error deleting order ${orderId}:`, orderError);
          errors.push(`Order ${orderId}: ${orderError.message}`);
        } else {
          deletedCount++;
          console.log(`✅ Deleted order ${orderId}`);
        }
      } catch (error) {
        console.error(`❌ Error processing order ${orderId}:`, error);
        errors.push(`Order ${orderId}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    console.log("\n========================================");
    console.log("✅ CLEANUP COMPLETE");
    console.log(`📊 Deleted: ${deletedCount}/${orderIds.length} orders`);
    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length}`);
      errors.forEach((err) => console.log(`   - ${err}`));
    }
    console.log("========================================\n");

    return NextResponse.json({
      success: true,
      deletedCount,
      totalFound: oldOrders.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Deleted ${deletedCount} old orders`,
    });
  } catch (error) {
    console.error("\n========================================");
    console.error("❌ CLEANUP FAILED");
    console.error("========================================");
    console.error(error);
    console.error("========================================\n");

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET: للتحقق من أن الـ endpoint يعمل
 */
export async function GET() {
  return NextResponse.json({
    message: "Cron endpoint for cleaning up old orders",
    schedule: "Should run every hour or daily",
    deletesOrdersAfter: "12 hours of being completed/cancelled",
  });
}

