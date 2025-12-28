// src/app/api/admin/exchange-rate/route.ts
// API محسّن - تحديث سعر الصرف + تحديث تلقائي لأسعار جميع المنتجات

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * تقريب السعر
 */
function roundPrice(price: number): number {
  const ROUNDING_BASE = 500;
  if (price <= 0) return ROUNDING_BASE;
  return Math.ceil(price / ROUNDING_BASE) * ROUNDING_BASE;
}

/**
 * GET: جلب آخر سعر محفوظ
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: currentRate, error } = await supabase
      .from("currency_rates")
      .select("*")
      .eq("currency_pair", "USD_SYP")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!currentRate) {
      return NextResponse.json({ error: "No rate found" }, { status: 404 });
    }

    return NextResponse.json({
      rate: currentRate.rate,
      provider: currentRate.provider,
      fetchedAt: currentRate.fetched_at,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST: حفظ سعر جديد (يدوياً) + تحديث تلقائي لجميع المنتجات باستخدام database function
 */
export async function POST(request: Request) {
  console.log("\n========================================");
  console.log("💾 SAVING NEW EXCHANGE RATE + UPDATING ALL PRODUCTS");
  console.log("========================================\n");

  try {
    const supabase = await createClient();

    // 1. التحقق من Admin
    console.log("1️⃣ Checking authorization...");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("❌ Not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      console.log("❌ Not admin");
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    console.log("✅ Admin authorized:", user.email);

    // 2. قراءة السعر من Body
    console.log("\n2️⃣ Reading rate from body...");
    const body = await request.json();
    const { rate } = body;

    if (!rate) {
      console.log("❌ No rate provided");
      return NextResponse.json({ error: "Rate is required" }, { status: 400 });
    }

    const rateValue = parseFloat(rate);

    if (isNaN(rateValue) || rateValue <= 0) {
      console.log("❌ Invalid rate:", rate);
      return NextResponse.json(
        { error: "Invalid rate value" },
        { status: 400 }
      );
    }

    if (rateValue < 5000 || rateValue > 50000) {
      console.log("❌ Rate out of range:", rateValue);
      return NextResponse.json(
        { error: "Rate must be between 5,000 and 50,000" },
        { status: 400 }
      );
    }

    console.log("✅ Rate received:", rateValue);

    // 3. تقريب السعر
    console.log("\n3️⃣ Rounding rate...");
    const roundedRate = roundPrice(rateValue);
    console.log(`📊 Raw: ${rateValue}`);
    console.log(`📊 Rounded: ${roundedRate}`);

    // 4. جلب آخر سعر محفوظ
    console.log("\n4️⃣ Getting last saved rate...");
    const { data: lastRate } = await supabase
      .from("currency_rates")
      .select("*")
      .eq("currency_pair", "USD_SYP")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRate) {
      console.log(`💾 Last rate: ${lastRate.rate}`);

      // التحقق من التغير
      if (lastRate.rate === roundedRate) {
        console.log("⏭️ Rate unchanged");
        return NextResponse.json({
          success: true,
          rate: roundedRate,
          provider: "manual",
          fetchedAt: lastRate.fetched_at,
          status: "unchanged",
          message: "Rate same as previous",
          updatedProductsCount: 0,
        });
      }
    }

    // 5. حفظ السعر الجديد
    console.log("\n5️⃣ Saving new rate...");
    const { data: newRate, error: insertError } = await supabase
      .from("currency_rates")
      .insert({
        currency_pair: "USD_SYP",
        rate: roundedRate,
        provider: `admin:${user.email}`,
        is_manual: true,
        updated_by: user.id,
        fetched_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Failed to save:", insertError);
      return NextResponse.json(
        { error: "Failed to save rate", details: insertError.message },
        { status: 500 }
      );
    }

    console.log("✅ Rate saved successfully!");
    console.log(`📈 Change: ${lastRate?.rate || "N/A"} → ${roundedRate}`);

    // 6. تحديث أسعار جميع المنتجات باستخدام database function (أسرع بكثير!)
    console.log("\n6️⃣ Updating ALL product prices using database function...");
    const { data: updateResult, error: updateError } = await supabase
      .rpc("update_all_product_prices", { p_new_rate: roundedRate });

    if (updateError) {
      console.error("❌ Error updating prices:", updateError);
      // حتى لو فشل التحديث، السعر تم حفظه
      return NextResponse.json({
        success: true,
        rate: roundedRate,
        previousRate: lastRate?.rate || null,
        provider: "manual",
        fetchedAt: newRate.fetched_at,
        status: "rate_saved_but_products_update_failed",
        message: "Rate saved but products update failed",
        updatedProductsCount: 0,
        error: updateError.message,
      });
    }

    const totalUpdated = updateResult?.[0]?.total_updated || 0;

    console.log("\n========================================");
    console.log("✅ COMPLETE!");
    console.log(`💱 New exchange rate: ${roundedRate} SYP`);
    console.log(`📦 Total products updated: ${totalUpdated}`);
    console.log("========================================\n");

    return NextResponse.json({
      success: true,
      rate: roundedRate,
      previousRate: lastRate?.rate || null,
      provider: "manual",
      fetchedAt: newRate.fetched_at,
      status: "updated",
      message: "Rate saved and all products updated successfully",
      updatedProductsCount: totalUpdated,
    });
  } catch (error) {
    console.error("\n========================================");
    console.error("❌ OPERATION FAILED");
    console.error("========================================");
    console.error(error);
    console.error("========================================\n");

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
