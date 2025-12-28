import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculateLoyaltyPoints } from "@/lib/utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("=== PATCH /api/driver/orders/[id] START ===");
    console.log("Delivery ID:", id);
    
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User authenticated:", user.id);

    // Check if user is a driver
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id, active")
      .eq("user_id", user.id)
      .single();

    if (driverError || !driver || !driver.active) {
      console.error("Driver check failed:", driverError);
      return NextResponse.json(
        { error: "Driver access required" },
        { status: 403 }
      );
    }

    console.log("Driver verified:", driver.id);

    const body = await request.json();
    console.log("Request body:", body);
    const { status, notes, proof_image_url } = body;

    // Note: Proof of delivery is optional for now
    // if (status === "delivered" && !proof_image_url) {
    //   return NextResponse.json(
    //     { error: "Proof of delivery image is required" },
    //     { status: 400 }
    //   );
    // }

    // Get the delivery to check the order
    console.log("Fetching delivery...");
    const { data: delivery, error: deliveryFetchError } = await supabase
      .from("deliveries")
      .select("*, orders!inner(*)")
      .eq("id", id)
      .eq("driver_id", driver.id)
      .single();

    if (deliveryFetchError || !delivery) {
      console.error("Delivery fetch error:", deliveryFetchError);
      console.log("Delivery data:", delivery);
      return NextResponse.json(
        { error: "Delivery not found or not assigned to you" },
        { status: 404 }
      );
    }

    console.log("Delivery found:", delivery.id);
    
    // Security: Only allow updates if order is confirmed by admin
    const order = delivery.orders as { status: string; id: string; user_id: string; total_price: number; delivery_fee: number };
    console.log("Order status:", order.status);
    
    if (order.status === "pending") {
      console.log("Order is pending - cannot update");
      return NextResponse.json(
        { error: "Cannot update delivery - order not yet confirmed by admin" },
        { status: 403 }
      );
    }

    if (order.status === "cancelled") {
      console.log("Order is cancelled - cannot update");
      return NextResponse.json(
        { error: "Cannot update delivery - order has been cancelled" },
        { status: 403 }
      );
    }

    // Update delivery status
    const updateData: { status: string; started_at?: string; delivered_at?: string; notes?: string; proof_image_url?: string } = { status };

    if (status === "on_way") {
      updateData.started_at = new Date().toISOString();
    } else if (status === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    }

    if (notes) updateData.notes = notes;
    if (proof_image_url) updateData.proof_image_url = proof_image_url;

    console.log("Updating delivery with data:", updateData);

    const { data: updatedDelivery, error: deliveryError } = await supabase
      .from("deliveries")
      .update(updateData)
      .eq("id", id)
      .eq("driver_id", driver.id)
      .select()
      .single();

    if (deliveryError) {
      console.error("Error updating delivery:", deliveryError);
      return NextResponse.json(
        { error: "Failed to update delivery", details: deliveryError.message },
        { status: 500 }
      );
    }

    console.log("Delivery updated successfully:", updatedDelivery.id);

    // If delivered, update order status
    if (status === "delivered") {
      console.log("Updating order status to delivered for order:", delivery.order_id);
      const { data: orderUpdateData, error: orderUpdateError } = await supabase
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", delivery.order_id)
        .select();

      if (orderUpdateError) {
        console.error("❌ Error updating order status:", orderUpdateError);
      } else if (!orderUpdateData || orderUpdateData.length === 0) {
        console.error("⚠️ Order update returned no rows - RLS policy issue?");
      } else {
        console.log("✅ Order status updated to delivered:", orderUpdateData[0].status);
      }

      // ✅ Award loyalty points using atomic function
      const pointsEarned = calculateLoyaltyPoints(order.total_price - order.delivery_fee);
      
      const { data: pointsResult, error: pointsError } = await supabase.rpc(
        "award_points_on_delivery",
        {
          p_order_id: order.id,
          p_points_to_award: pointsEarned,
        }
      );

      if (pointsError) {
        console.error("❌ Error awarding points:", pointsError);
      } else if (pointsResult && pointsResult[0]?.success) {
        console.log("✅ Points awarded:", pointsResult[0].points_awarded);
      }
    }

    // If on_way, update order status
    if (status === "on_way") {
      console.log("Updating order status to on_delivery for order:", delivery.order_id);
      const { data: orderUpdateData, error: orderError } = await supabase
        .from("orders")
        .update({ status: "on_delivery" })
        .eq("id", delivery.order_id)
        .select();
      
      if (orderError) {
        console.error("❌ Error updating order to on_delivery:", orderError);
      } else if (!orderUpdateData || orderUpdateData.length === 0) {
        console.error("⚠️ Order update returned no rows - RLS policy issue?");
      } else {
        console.log("✅ Order status updated to on_delivery:", orderUpdateData[0].status);
      }
    }

    console.log("=== PATCH /api/driver/orders/[id] SUCCESS ===");
    return NextResponse.json({ success: true, delivery: updatedDelivery, pointsAwarded: status === "delivered" });
  } catch (error) {
    console.error("Error in driver delivery update API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


