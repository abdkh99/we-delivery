import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - Get a specific address
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: address, error } = await supabase
      .from("delivery_addresses")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Address not found" }, { status: 404 });
      }
      console.error("Error fetching address:", error);
      return NextResponse.json(
        { error: "Failed to fetch address", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ address });
  } catch (error: unknown) {
    console.error("Error in address API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}

// PUT - Update an address
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify address belongs to user
    const { data: existingAddress } = await supabase
      .from("delivery_addresses")
      .select("user_id")
      .eq("id", params.id)
      .single();

    if (!existingAddress || existingAddress.user_id !== user.id) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    const body = await request.json();
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

    // If this is set as default, unset other defaults
    if (is_default) {
      await supabase
        .from("delivery_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .eq("is_default", true)
        .neq("id", params.id);
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (label) {
      const validLabels = ["home", "work", "gym", "school", "other"];
      if (!validLabels.includes(label)) {
        return NextResponse.json(
          { error: "Invalid label" },
          { status: 400 }
        );
      }
      updateData.label = label;
    }

    if (latitude !== undefined) updateData.latitude = Number(latitude);
    if (longitude !== undefined) updateData.longitude = Number(longitude);
    if (street !== undefined) updateData.street = street;
    if (neighborhood !== undefined) updateData.neighborhood = neighborhood;
    if (address_details !== undefined) updateData.address_details = address_details;
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone;
    if (is_default !== undefined) updateData.is_default = is_default;

    const { data: address, error } = await supabase
      .from("delivery_addresses")
      .update(updateData)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating address:", error);
      return NextResponse.json(
        { error: "Failed to update address", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ address });
  } catch (error: unknown) {
    console.error("Error in address API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete an address
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify address belongs to user
    const { data: existingAddress } = await supabase
      .from("delivery_addresses")
      .select("user_id")
      .eq("id", params.id)
      .single();

    if (!existingAddress || existingAddress.user_id !== user.id) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("delivery_addresses")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting address:", error);
      return NextResponse.json(
        { error: "Failed to delete address", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error in address API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}



