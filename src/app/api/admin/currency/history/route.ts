// src/app/api/admin/currency/history/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // التحقق من الصلاحيات
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    // جلب آخر 20 سجل
    const { data: history, error } = await supabase
      .from("currency_rates")
      .select("*")
      .eq("currency_pair", "USD_SYP")
      .order("fetched_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching history:", error);
      return NextResponse.json(
        { error: "Failed to fetch history" },
        { status: 500 }
      );
    }

    return NextResponse.json({ history: history || [] });
  } catch (error) {
    console.error("Error in history endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
