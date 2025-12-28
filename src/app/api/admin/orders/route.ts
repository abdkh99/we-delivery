// src/app/api/orders/route.ts
// بديل: إدارة المخزون عن طريق API (بدون Trigger)

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. المصادقة
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. قراءة البيانات
    const { items, ...orderData } = await request.json();

    // 3. التحقق من المخزون قبل إنشاء الطلب
    for (const item of items) {
      const { data: product } = await supabase
        .from("products")
        .select("stock_estimate")
        .eq("id", item.product_id)
        .single();

      if (!product || product.stock_estimate < item.quantity) {
        return NextResponse.json(
          { error: `Not enough stock for product ${item.product_id}` },
          { status: 400 }
        );
      }
    }

    // 4. إنشاء الطلب
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        ...orderData,
        user_id: user.id,
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // 5. إنشاء order_items ونقص المخزون
    for (const item of items) {
      // إضافة item
      const { error: itemError } = await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        status: "pending",
      });

      if (itemError) {
        console.error("Error creating order item:", itemError);
        continue;
      }

      // نقص المخزون
      const { error: stockError } = await supabase
        .from("products")
        .update({
          stock_estimate: supabase.sql`stock_estimate - ${item.quantity}`,
        })
        .eq("id", item.product_id);

      if (stockError) {
        console.error("Error updating stock:", stockError);
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// API لإلغاء الطلب
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { order_id, status } = await request.json();

    // إذا الحالة cancelled، إرجاع المخزون
    if (status === "cancelled") {
      // جلب items الطلب
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", order_id)
        .eq("status", "pending");

      // إرجاع المخزون
      if (items) {
        for (const item of items) {
          await supabase
            .from("products")
            .update({
              stock_estimate: supabase.sql`stock_estimate + ${item.quantity}`,
            })
            .eq("id", item.product_id);
        }
      }

      // تحديث حالة الـ items
      await supabase
        .from("order_items")
        .update({ status: "cancelled" })
        .eq("order_id", order_id);
    }

    // تحديث حالة الطلب
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", order_id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
