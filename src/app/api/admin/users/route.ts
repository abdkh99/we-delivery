import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q");

        const supabase = await createClient();

        // Check admin auth
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: userProfile } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (userProfile?.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        let dbQuery = supabase
            .from("users")
            .select("id, name, phone, email, role")
            .limit(10);

        if (query) {
            dbQuery = dbQuery.or(`name.ilike.%${query}%,phone.ilike.%${query}%`);
        }

        // Optional: Filter only customers to be promoted to drivers
        // dbQuery = dbQuery.neq('role', 'driver');

        const { data: users, error } = await dbQuery;

        if (error) {
            console.error("Error fetching users:", error);
            return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
        }

        return NextResponse.json({ users });
    } catch (error) {
        console.error("Error in user search API:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
