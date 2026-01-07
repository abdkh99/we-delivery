import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// تفعيل ISR - إعادة توليد البيانات كل 5 ثواني (real-time data)
export const revalidate = 5;

export async function GET() {
  try {
    console.log("=== GET /api/driver/orders START ===");
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("User auth check:", { 
      userId: user?.id, 
      hasError: !!authError 
    });

    if (authError || !user) {
      console.log("Auth failed:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a driver
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id, active")
      .eq("user_id", user.id)
      .single();

    if (driverError || !driver || !driver.active) {
      return NextResponse.json(
        { error: "Driver access required" },
        { status: 403 }
      );
    }

    // Get driver's assigned orders
    const { data: orders, error: ordersError } = await supabase
      .from("deliveries")
      .select(
        `
        *,
        orders (
          *,
          users (
            id,
            name,
            phone
          ),
          order_items (
            *,
            products (*),
            product_flavors:flavor_id (
              id,
              name,
              name_ar
            ),
            product_variants:variant_id (
              id,
              variant_name,
              variant_sku
            )
          )
        )
      `
      )
      .eq("driver_id", driver.id)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Error fetching driver orders:", ordersError);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    // Debug: Log the structure of fetched orders
    console.log("Driver orders fetched:", orders?.length || 0);
    if (orders && orders.length > 0) {
      console.log("First order structure:", JSON.stringify(orders[0], null, 2));
    }

    return NextResponse.json(
      { orders },
      {
        headers: {
          "Cache-Control": "private, s-maxage=5, stale-while-revalidate=10",
        },
      }
    );
  } catch (error) {
    console.error("Error in driver orders API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


