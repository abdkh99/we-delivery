import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET: Fetch system settings by category
 */
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");

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

        let query = supabase.from("system_settings").select("*");

        if (category) {
            query = query.eq("category", category);
        }

        const { data: settings, error } = await query.order("key", { ascending: true });

        if (error) {
            console.error("Error fetching system settings:", error);
            return NextResponse.json(
                { error: "Failed to fetch settings" },
                { status: 500 }
            );
        }

        return NextResponse.json({ settings });
    } catch (error) {
        console.error("Error in system settings API:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * POST: Create or update a system setting
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
        const { key, value, category } = body;

        if (!key || !category) {
            return NextResponse.json(
                { error: "Key and category are required" },
                { status: 400 }
            );
        }

        // Upsert the setting (insert or update if exists)
        const { data: setting, error } = await supabase
            .from("system_settings")
            .upsert(
                {
                    key,
                    value: value || {},
                    category,
                    updated_at: new Date().toISOString(),
                    updated_by: user.id,
                },
                { onConflict: "key" }
            )
            .select()
            .single();

        if (error) {
            console.error("Error saving system setting:", error);
            return NextResponse.json(
                { error: "Failed to save setting" },
                { status: 500 }
            );
        }

        return NextResponse.json({ setting }, { status: 201 });
    } catch (error) {
        console.error("Error in system settings POST:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * DELETE: Delete a system setting
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
        const key = searchParams.get("key");

        if (!key) {
            return NextResponse.json(
                { error: "Setting key is required" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("system_settings")
            .delete()
            .eq("key", key);

        if (error) {
            console.error("Error deleting system setting:", error);
            return NextResponse.json(
                { error: "Failed to delete setting" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in system settings DELETE:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
