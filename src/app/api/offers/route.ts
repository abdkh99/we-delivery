import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - Get active offers (public)
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: offers, error } = await supabase
      .from("offers")
      .select("*")
      .eq("is_active", true)
      .gte("end_date", new Date().toISOString())
      .lte("start_date", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching offers:", error);
      return NextResponse.json(
        { error: "Failed to fetch offers" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { offers: offers || [] },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Error in offers API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new offer (admin only)
export async function POST(request: Request) {
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

    const body = await request.json();
    const {
      title,
      description,
      discount_type,
      discount_value,
      start_date,
      end_date,
      applicable_to,
      category_filter,
      product_ids,
    } = body;

    // Validation
    if (!title || !discount_type || !discount_value || !start_date || !end_date || !applicable_to) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (new Date(start_date) >= new Date(end_date)) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    if (discount_type === "percentage" && discount_value > 100) {
      return NextResponse.json(
        { error: "Percentage discount cannot exceed 100%" },
        { status: 400 }
      );
    }

    const offerData: any = {
      title,
      description: description || null,
      discount_type,
      discount_value,
      start_date,
      end_date,
      is_active: true,
      applicable_to,
      category_filter: applicable_to === "category" ? category_filter : null,
      product_ids: applicable_to === "product" ? product_ids : null,
      created_by: user.id,
    };

    const { data: offer, error: insertError } = await supabase
      .from("offers")
      .insert(offerData)
      .select()
      .single();

    if (insertError) {
      console.error("Error creating offer:", insertError);
      return NextResponse.json(
        { error: "Failed to create offer" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, offer });
  } catch (error) {
    console.error("Error in offers API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
