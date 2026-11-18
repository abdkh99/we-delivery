import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get order with order items
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          products (*)
        )
      `
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (orderError) {
      console.error("Error fetching order:", orderError);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error in order API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    // Only support cancelling for now
    const action = (body.action as string) || body.status;

    if (action !== "cancel" && action !== "cancelled") {
      return NextResponse.json(
        { error: "Unsupported action" },
        { status: 400 }
      );
    }

    // fetch current order to validate ownership and status
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, user_id")
      .eq("id", id)
      .maybeSingle();

    if (orderError) {
      console.error("Error fetching order before cancel:", orderError);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // only allow cancelling pending orders
    if (order.status !== "pending") {
      return NextResponse.json(
        { error: "Cannot cancel at this stage" },
        { status: 400 }
      );
    }

    // ✅ Cancel atomically in the database (status + delivery + points refund + stock restore).
    // Customers have no UPDATE policy on `orders`, so this must go through the SECURITY DEFINER function.
    const { data: cancelResult, error: cancelError } = await supabase.rpc(
      "customer_cancel_order",
      { p_order_id: id }
    );

    const cancel = Array.isArray(cancelResult) ? cancelResult[0] : cancelResult;

    if (cancelError || !cancel?.success) {
      console.error("Error cancelling order:", cancelError || cancel);
      return NextResponse.json(
        {
          error: "Failed to cancel order",
          details: cancelError?.message || cancel?.message,
        },
        { status: cancelError ? 500 : 400 }
      );
    }

    const refundedPoints: number = cancel.refunded_points ?? 0;

    console.log("✅ Order cancelled successfully:", id);
    console.log("✅ Points refunded:", refundedPoints);

    // Fetch updated order to return
    const { data: updated } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    return NextResponse.json({
      success: true,
      order: updated,
      refunded_points: refundedPoints,
      message: "تم إلغاء الطلب بنجاح",
    });
  } catch (error) {
    console.error("Error in PATCH order API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
