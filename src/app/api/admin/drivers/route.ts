import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
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

    // Get all drivers with user info
    const { data: drivers, error: driversError } = await supabase
      .from("drivers")
      .select(
        `
        *,
        users!drivers_user_id_fkey (
          id,
          name,
          phone,
          email
        )
      `
      )
      .order("created_at", { ascending: false });

    if (driversError) {
      console.error("Error fetching drivers:", driversError);
      return NextResponse.json(
        { error: "Failed to fetch drivers" },
        { status: 500 }
      );
    }

    return NextResponse.json({ drivers });
  } catch (error) {
    console.error("Error in admin drivers API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
    const { user_id, vehicle_info } = body;

    // Create new driver
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .insert({
        user_id,
        vehicle_info,
        active: true,
      })
      .select(
        `
        *,
        users!drivers_user_id_fkey (
          id,
          name,
          phone,
          email
        )
      `
      )
      .single();

    if (driverError) {
      console.error("Error creating driver:", driverError);
      return NextResponse.json(
        { error: "Failed to create driver" },
        { status: 500 }
      );
    }

    return NextResponse.json({ driver });
  } catch (error) {
    console.error("Error in admin driver creation API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


