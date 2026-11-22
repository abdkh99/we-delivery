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
      .order("name", { ascending: true })
      .limit(30);

    if (query) {
      dbQuery = dbQuery.or(
        `name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`,
      );
    }

    // Optional: Filter only customers to be promoted to drivers
    // dbQuery = dbQuery.neq('role', 'driver');

    const { data: users, error } = await dbQuery;

    if (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 },
      );
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error in user search API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

const ALLOWED_ROLES = ["customer", "driver", "admin"] as const;

/**
 * PATCH /api/admin/users   body: { user_id: string, role: "customer" | "driver" | "admin" }
 *
 * All the rules (admin only, no self-demotion, last admin protected, drivers table
 * sync) live in the database function public.admin_set_user_role, so they can't be
 * bypassed by calling PostgREST directly.
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { user_id?: string; role?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
    }

    const { user_id: userId, role } = body;
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "معرّف المستخدم مطلوب" },
        { status: 400 },
      );
    }
    if (!role || !(ALLOWED_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ error: "دور غير صالح" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("admin_set_user_role", {
      p_user_id: userId,
      p_role: role,
    });

    if (error) {
      console.error("admin_set_user_role failed:", error.code, error.message);

      if (error.code === "42501") {
        const msg = error.message.includes("own admin")
          ? "لا يمكنك إزالة صلاحية المدير عن حسابك"
          : error.message.includes("last admin")
            ? "لا يمكن إزالة آخر مدير في النظام"
            : "صلاحيات المدير مطلوبة";
        return NextResponse.json({ error: msg }, { status: 403 });
      }
      if (error.code === "P0002") {
        return NextResponse.json(
          { error: "المستخدم غير موجود" },
          { status: 404 },
        );
      }
      if (error.code === "22023") {
        return NextResponse.json({ error: "دور غير صالح" }, { status: 400 });
      }
      return NextResponse.json({ error: "فشل تغيير الدور" }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error("Error in admin user role API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
