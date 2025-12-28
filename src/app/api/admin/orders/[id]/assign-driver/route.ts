import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
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

    const body = await request.json();
    const { driver_id } = body;

    // Create delivery assignment
    const { data: delivery, error: deliveryError } = await supabase
      .from("deliveries")
      .insert({
        order_id: id,
        driver_id,
        status: "assigned",
      })
      .select()
      .single();

    if (deliveryError) {
      console.error("Error assigning driver:", deliveryError);
      return NextResponse.json(
        { error: "Failed to assign driver" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, delivery });
  } catch (error) {
    console.error("Error in assign driver API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


