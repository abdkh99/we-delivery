import { createClient } from "@/lib/supabase/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

/**
 * Helper: verify admin user with the session-based client,
 * then return a service-role client that bypasses RLS for admin ops.
 */
async function getAdminClient() {
    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }

    const serviceClient = getServiceSupabaseClient({ required: false });
    // Fall back to session client if service key isn't configured
    const client = serviceClient || supabase;

    return { client, error: null };
}

/**
 * GET: Fetch all delivery fee tiers
 */
export async function GET() {
    try {
        const result = await getAdminClient();
        if (result.error) return result.error;
        const client = result.client!;

        const { data: tiers, error } = await client
            .from("delivery_fee_tiers")
            .select("*")
            .order("min_order_amount", { ascending: true });

        if (error) {
            console.error("Error fetching delivery fee tiers:", error);
            return NextResponse.json(
                { error: "Failed to fetch tiers" },
                { status: 500 }
            );
        }

        return NextResponse.json({ tiers });
    } catch (error) {
        console.error("Error in delivery fee tiers API:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * POST: Create new delivery fee tier
 */
export async function POST(request: Request) {
    try {
        const result = await getAdminClient();
        if (result.error) return result.error;
        const client = result.client!;

        const body = await request.json();
        const {
            min_order_amount,
            max_order_amount,
            delivery_fee,
            is_active,
        } = body;

        if (
            typeof min_order_amount !== "number" ||
            typeof delivery_fee !== "number"
        ) {
            return NextResponse.json(
                { error: "Invalid input data" },
                { status: 400 }
            );
        }

        const { data: tier, error } = await client
            .from("delivery_fee_tiers")
            .insert({
                min_order_amount,
                max_order_amount: max_order_amount || null,
                delivery_fee,
                is_active: is_active !== false,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating delivery fee tier:", error);
            return NextResponse.json(
                { error: "Failed to create tier" },
                { status: 500 }
            );
        }

        return NextResponse.json({ tier }, { status: 201 });
    } catch (error) {
        console.error("Error in delivery fee tiers POST:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * PATCH: Update delivery fee tier
 */
export async function PATCH(request: Request) {
    try {
        const result = await getAdminClient();
        if (result.error) return result.error;
        const client = result.client!;

        const body = await request.json();
        const {
            id,
            min_order_amount,
            max_order_amount,
            delivery_fee,
            is_active,
        } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Tier ID is required" },
                { status: 400 }
            );
        }

        const updateData: {
            min_order_amount?: number;
            max_order_amount?: number | null;
            delivery_fee?: number;
            is_active?: boolean;
        } = {};
        if (typeof min_order_amount === "number")
            updateData.min_order_amount = min_order_amount;
        if (max_order_amount !== undefined)
            updateData.max_order_amount = max_order_amount || null;
        if (typeof delivery_fee === "number")
            updateData.delivery_fee = delivery_fee;
        if (typeof is_active === "boolean") updateData.is_active = is_active;

        const { data: tier, error } = await client
            .from("delivery_fee_tiers")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating delivery fee tier:", error);
            return NextResponse.json(
                { error: "Failed to update tier" },
                { status: 500 }
            );
        }

        return NextResponse.json({ tier });
    } catch (error) {
        console.error("Error in delivery fee tiers PATCH:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * DELETE: Delete delivery fee tier
 */
export async function DELETE(request: Request) {
    try {
        const result = await getAdminClient();
        if (result.error) return result.error;
        const client = result.client!;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Tier ID is required" },
                { status: 400 }
            );
        }

        // Use select to verify deletion
        const { data: deleted, error } = await client
            .from("delivery_fee_tiers")
            .delete()
            .eq("id", id)
            .select();

        if (error) {
            console.error("Error deleting delivery fee tier:", error);
            return NextResponse.json(
                { error: "Failed to delete tier" },
                { status: 500 }
            );
        }

        if (!deleted || deleted.length === 0) {
            return NextResponse.json(
                { error: "Tier not found or already deleted" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in delivery fee tiers DELETE:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
