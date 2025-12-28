import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET: Fetch all commission settings
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
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

    const { data: settings, error } = await supabase
      .from("commission_settings")
      .select("*")
      .order("min_order_amount", { ascending: true });

    if (error) {
      console.error("Error fetching commission settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error in commission settings API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST: Create new commission setting
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
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

    const body = await request.json();
    const {
      min_order_amount,
      max_order_amount,
      commission_percentage,
      is_active,
    } = body;

    if (
      typeof min_order_amount !== "number" ||
      typeof commission_percentage !== "number"
    ) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    const { data: setting, error } = await supabase
      .from("commission_settings")
      .insert({
        min_order_amount,
        max_order_amount: max_order_amount || null,
        commission_percentage,
        is_active: is_active !== false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating commission setting:", error);
      return NextResponse.json(
        { error: "Failed to create setting" },
        { status: 500 }
      );
    }

    return NextResponse.json({ setting }, { status: 201 });
  } catch (error) {
    console.error("Error in commission settings POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update commission setting
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
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

    const body = await request.json();
    const {
      id,
      min_order_amount,
      max_order_amount,
      commission_percentage,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Setting ID is required" },
        { status: 400 }
      );
    }

    const updateData: {
      min_order_amount?: number;
      max_order_amount?: number | null;
      commission_percentage?: number;
      is_active?: boolean;
    } = {};
    if (typeof min_order_amount === "number")
      updateData.min_order_amount = min_order_amount;
    if (max_order_amount !== undefined)
      updateData.max_order_amount = max_order_amount || null;
    if (typeof commission_percentage === "number")
      updateData.commission_percentage = commission_percentage;
    if (typeof is_active === "boolean") updateData.is_active = is_active;

    const { data: setting, error } = await supabase
      .from("commission_settings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating commission setting:", error);
      return NextResponse.json(
        { error: "Failed to update setting" },
        { status: 500 }
      );
    }

    return NextResponse.json({ setting });
  } catch (error) {
    console.error("Error in commission settings PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete commission setting
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Setting ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("commission_settings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting commission setting:", error);
      return NextResponse.json(
        { error: "Failed to delete setting" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in commission settings DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
