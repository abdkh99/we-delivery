import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - Get all offers (admin)
export async function GET() {
  try {
    const supabase = await createClient();
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

    const { data: offers, error } = await supabase
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching offers:", error);
      return NextResponse.json(
        { error: "Failed to fetch offers" },
        { status: 500 }
      );
    }

    return NextResponse.json({ offers: offers || [] });
  } catch (error) {
    console.error("Error in admin offers API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
