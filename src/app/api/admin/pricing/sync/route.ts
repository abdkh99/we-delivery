import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ensureUsdToSypRate,
  syncProductsWithRate,
} from "@/lib/currency";

async function assertAdmin(request: Request) {
  const cronSecret = process.env.CURRENCY_SYNC_SECRET;
  const headerSecret = request.headers.get("x-cron-secret");

  if (cronSecret && headerSecret && cronSecret === headerSecret) {
    return { isCron: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      ),
    };
  }

  return { isCron: false };
}

export async function POST(request: Request) {
  try {
    const authResult = await assertAdmin(request);
    if ("error" in authResult && authResult.error) {
      return authResult.error;
    }

    // جلب سعر الصرف الحالي
    const rateInfo = await ensureUsdToSypRate();

    // مزامنة المنتجات مع السعر
    const syncResult = await syncProductsWithRate(rateInfo.rate);

    return NextResponse.json({
      rate: rateInfo,
      syncResult,
    });
  } catch (error) {
    console.error("Pricing sync API error:", error);
    return NextResponse.json(
      { error: "Failed to sync product prices" },
      { status: 500 }
    );
  }
}
