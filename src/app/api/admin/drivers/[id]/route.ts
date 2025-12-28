import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * PATCH: Update driver information including region
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const { vehicle_info, region, active } = body;

    const updateData: {
      vehicle_info?: string;
      region?: string | null;
      active?: boolean;
    } = {};
    if (vehicle_info !== undefined) updateData.vehicle_info = vehicle_info;
    if (region !== undefined) updateData.region = region;
    if (typeof active === "boolean") updateData.active = active;

    const { data: driver, error } = await supabase
      .from("drivers")
      .update(updateData)
      .eq("id", params.id)
      .select(`
        *,
        users!drivers_user_id_fkey (
          id,
          name,
          phone,
          email
        )
      `)
      .single();

    if (error) {
      console.error("Error updating driver:", error);
      return NextResponse.json(
        { error: "Failed to update driver" },
        { status: 500 }
      );
    }

    return NextResponse.json({ driver });
  } catch (error) {
    console.error("Error in driver update API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
