import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - Get all saved addresses for the authenticated user
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: addresses, error } = await supabase
      .from("delivery_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching addresses:", error);
      return NextResponse.json(
        { error: "Failed to fetch addresses", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ addresses: addresses || [] });
  } catch (error: unknown) {
    console.error("Error in addresses API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Create a new address
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("📥 Received address data:", body);
    
    const {
      label,
      latitude,
      longitude,
      street,
      neighborhood,
      address_details,
      contact_phone,
      is_default,
    } = body;

    // Validation with detailed error messages
    const missingFields: string[] = [];
    if (!label) missingFields.push("label");
    if (latitude === undefined || latitude === null) missingFields.push("latitude");
    if (longitude === undefined || longitude === null) missingFields.push("longitude");
    if (!street || !street.trim()) missingFields.push("street");
    if (!address_details || !address_details.trim()) missingFields.push("address_details");

    if (missingFields.length > 0) {
      console.error("❌ Missing required fields:", missingFields);
      return NextResponse.json(
        { 
          error: "Missing required fields",
          missingFields: missingFields,
          received: Object.keys(body)
        },
        { status: 400 }
      );
    }

    // Validate label
    const validLabels = ["home", "work", "gym", "school", "other"];
    if (!validLabels.includes(label)) {
      return NextResponse.json(
        { error: "Invalid label. Must be one of: home, work, gym, school, other" },
        { status: 400 }
      );
    }

    // If this is set as default, unset other defaults
    if (is_default) {
      await supabase
        .from("delivery_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .eq("is_default", true);
    }

    const { data: address, error } = await supabase
      .from("delivery_addresses")
      .insert({
        user_id: user.id,
        label,
        latitude: Number(latitude),
        longitude: Number(longitude),
        city: "Damascus", // Fixed as per requirements
        street,
        neighborhood: neighborhood || null,
        address_details,
        contact_phone: contact_phone || null,
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating address:", error);
      return NextResponse.json(
        { error: "Failed to create address", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ address }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error in addresses API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}

