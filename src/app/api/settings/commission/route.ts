import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Public API to get active commission rates
 * No authentication required - read-only public info for cart display
 */
export async function GET() {
    try {
        const supabase = await createClient();

        const { data: settings, error } = await supabase
            .from("commission_settings")
            .select("*")
            .eq("is_active", true)
            .order("min_order_amount", { ascending: true });

        if (error) {
            console.error("Error fetching commission settings:", error);
            return NextResponse.json(
                { error: "Failed to fetch commission settings" },
                { status: 500 }
            );
        }

        return NextResponse.json({ settings: settings || [] });
    } catch (error) {
        console.error("Error in public commission API:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
