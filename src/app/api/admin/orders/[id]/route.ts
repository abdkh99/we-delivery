import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { calculateLoyaltyPoints } from "@/lib/utils";

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

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || userProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Fetch order details with all related data
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        users!inner(name, phone),
        order_items(
          *,
          products(*)
        ),
        deliveries(*)
      `)
      .eq("id", id)
      .single();

    if (orderError) {
      console.error("Error fetching order:", orderError);
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error in admin order GET API:", error);
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
  const { id } = await params;
  try {
    console.log("=== PATCH /api/admin/orders/[id] START ===");
    console.log("Order ID:", id);
    
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("User auth check:", { userId: user?.id, hasError: !!authError });

    if (authError || !user) {
      console.log("Auth failed:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    console.log("User profile:", { role: userProfile?.role, hasError: !!profileError });

    if (profileError || userProfile?.role !== "admin") {
      console.log("Admin check failed:", profileError);
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    console.log("Requested status change:", status);

    // Validate status
    const validStatuses = ["pending", "confirmed", "on_delivery", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      console.log("Invalid status:", status);
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Update order status
    console.log("Updating order status...");
    console.log("Current order before update - fetching...");
    
    // First, get current order with items for stock management
    const { data: currentOrder } = await supabase
      .from("orders")
      .select(`
        status,
        order_items (
          *,
          products (*)
        )
      `)
      .eq("id", id)
      .single();
    
    console.log("Current order status:", currentOrder?.status);
    console.log("Requested new status:", status);
    
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select(`
        *,
        users (
          id,
          name,
          email,
          phone
        ),
        deliveries (
          *,
          drivers (
            id,
            users (
              name,
              phone
            )
          )
        ),
        order_items (
          *,
          products (*)
        )
      `)
      .single();

    if (orderError) {
      console.error("❌ Error updating order:", orderError);
      console.error("Error details:", {
        message: orderError.message,
        code: orderError.code,
        details: orderError.details,
        hint: orderError.hint
      });
      return NextResponse.json(
        { error: "Failed to update order", details: orderError.message },
        { status: 500 }
      );
    }

    if (!order) {
      console.error("⚠️ Order update returned no data - possible RLS policy issue");
      return NextResponse.json(
        { error: "Order not found or update not permitted" },
        { status: 404 }
      );
    }

    console.log("✅ Order status updated successfully:", {
      orderId: order.id,
      newStatus: order.status
    });

    // ✅ إدارة المخزون: إرجاع المخزون عند الإلغاء
    const oldStatus = currentOrder?.status;
    if (oldStatus && status === "cancelled" && (oldStatus === "pending" || oldStatus === "confirmed")) {
      console.log(`📦 Returning stock for cancelled order: ${oldStatus} → ${status}`);
      
      // استخدام order_items من currentOrder (قبل التحديث) لضمان الحصول على البيانات الصحيحة
      const orderItems = currentOrder?.order_items || [];
      
      if (orderItems.length > 0) {
        for (const item of orderItems) {
          const product = item.products as any;
          if (!product) continue;
          
          // إرجاع المخزون الرئيسي
          const currentStock = await supabase
            .from("products")
            .select("stock_estimate")
            .eq("id", product.id)
            .single();
          
          if (currentStock.data) {
            const newStock = (currentStock.data.stock_estimate || 0) + item.qty;
            
            const { error: stockError } = await supabase
              .from("products")
              .update({ stock_estimate: newStock })
              .eq("id", product.id);
            
            if (stockError) {
              console.error(`⚠️ Failed to return stock for product ${product.id}:`, stockError);
            } else {
              console.log(`✅ Returned ${item.qty} units to product ${product.name}`);
            }
          }
          
          // إذا كان هناك variant، أعد مخزونه أيضاً
          if (item.variant_id) {
            const { data: variant } = await supabase
              .from("product_variants")
              .select("stock_estimate")
              .eq("id", item.variant_id)
              .single();
            
            if (variant) {
              const newVariantStock = (variant.stock_estimate || 0) + item.qty;
              await supabase
                .from("product_variants")
                .update({ stock_estimate: newVariantStock })
                .eq("id", item.variant_id);
              console.log(`✅ Returned ${item.qty} units to variant ${item.variant_id}`);
            }
          }
          
          // إذا كان هناك flavor، أعد مخزونه أيضاً
          if (item.flavor_id) {
            const { data: flavor } = await supabase
              .from("product_flavors")
              .select("stock_estimate")
              .eq("id", item.flavor_id)
              .single();
            
            if (flavor) {
              const newFlavorStock = (flavor.stock_estimate || 0) + item.qty;
              await supabase
                .from("product_flavors")
                .update({ stock_estimate: newFlavorStock })
                .eq("id", item.flavor_id);
              console.log(`✅ Returned ${item.qty} units to flavor ${item.flavor_id}`);
            }
          }
        }
      }
    }

    // ✅ Update delivery status to match order status
    if (order.deliveries && order.deliveries.length > 0) {
      console.log("Updating delivery status to match order status...");
      const deliveryStatus = status === "on_delivery" ? "on_way" : 
                             status === "delivered" ? "delivered" : 
                             status === "cancelled" ? "cancelled" : "assigned";
      
      const { error: deliveryUpdateError } = await supabase
        .from("deliveries")
        .update({ status: deliveryStatus })
        .eq("order_id", order.id);
      
      if (deliveryUpdateError) {
        console.error("❌ Error updating delivery status:", deliveryUpdateError);
      } else {
        console.log("✅ Delivery status synced with order status:", deliveryStatus);
      }
    }

    // ✅ Handle loyalty points using atomic function
    if (status === "delivered") {
      console.log("💰 Processing loyalty points for delivered order...");
      
      // Calculate points to award
      const pointsEarned = calculateLoyaltyPoints(order.total_price - (order.delivery_fee || 0));
      
      // Use atomic function to award points
      const { data: pointsResult, error: pointsError } = await supabase.rpc(
        "award_points_on_delivery",
        {
          p_order_id: order.id,
          p_points_to_award: pointsEarned,
        }
      );

      if (pointsError) {
        console.error("❌ Error awarding points:", pointsError);
      } else if (pointsResult && pointsResult[0]) {
        const result = pointsResult[0];
        if (result.success) {
          console.log("✅ Points awarded:", result.points_awarded);
        } else {
          console.log("ℹ️", result.message);
        }
      }
    } else if (status === "cancelled") {
      console.log("♻️ Processing cancellation with atomic function...");
      
      // ✅ Use atomic function for admin cancellation
      const { data: cancelResult, error: cancelError } = await supabase.rpc(
        "admin_cancel_order_with_refund",
        {
          p_order_id: order.id,
          p_admin_user_id: user.id,
        }
      );

      if (cancelError) {
        console.error("❌ Error in admin cancellation:", cancelError);
      } else if (cancelResult && cancelResult[0]) {
        const result = cancelResult[0];
        if (result.success) {
          console.log("✅ Order cancelled successfully");
          console.log("✅ Points refunded:", result.refunded_points);
        } else {
          console.error("❌ Cancellation failed:", result.message);
        }
      }
    }

    console.log("=== PATCH /api/admin/orders/[id] SUCCESS ===");

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Error in admin order update API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}