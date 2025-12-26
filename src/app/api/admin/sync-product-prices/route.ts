// src/app/api/admin/sync-product-prices/route.ts
// API لتحديث أسعار جميع المنتجات والمتغيرات المسعرة بالدولار

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * تقريب السعر إلى أقرب 500
 */
function roundPrice(price: number): number {
  const ROUNDING_BASE = 500;
  if (price <= 0) return ROUNDING_BASE;
  return Math.ceil(price / ROUNDING_BASE) * ROUNDING_BASE;
}

/**
 * تحديث أسعار مجموعة من السجلات
 */
async function batchUpdatePrices(
  supabase: any,
  tableName: "products" | "product_variants",
  items: Array<{ id: string; usd_price: number }>,
  newRate: number
): Promise<{ updated: number; errors: string[] }> {
  let updated = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      const newPrice = roundPrice(item.usd_price * newRate);

      const { error } = await supabase
        .from(tableName)
        .update({
          price: newPrice,
          last_synced_rate: newRate,
          price_updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) {
        errors.push(`${tableName}[${item.id}]: ${error.message}`);
      } else {
        updated++;
      }
    } catch (error) {
      errors.push(
        `${tableName}[${item.id}]: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  return { updated, errors };
}

export async function POST() {
  console.log("\n========================================");
  console.log("🔄 SYNCING ALL PRODUCT PRICES");
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

    // 2. جلب آخر سعر صرف
    console.log("\n2️⃣ Fetching current exchange rate...");
    const { data: currentRate, error: rateError } = await supabase
      .from("currency_rates")
      .select("*")
      .eq("currency_pair", "USD_SYP")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rateError || !currentRate) {
      console.error("❌ No exchange rate found");
      return NextResponse.json(
        { error: "No exchange rate available" },
        { status: 500 }
      );
    }

    console.log(`✅ Current rate: ${currentRate.rate}`);
    console.log(
      `📅 Rate updated: ${new Date(currentRate.fetched_at).toLocaleString(
        "ar-SY"
      )}`
    );

    const allErrors: string[] = [];
    let totalUpdated = 0;

    // 3. تحديث المنتجات الرئيسية (products)
    console.log("\n3️⃣ Updating main products...");
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, usd_price")
      .not("usd_price", "is", null)
      .gt("usd_price", 0);

    if (productsError) {
      console.error("❌ Error fetching products:", productsError);
      allErrors.push(`Products fetch: ${productsError.message}`);
    } else if (products && products.length > 0) {
      console.log(`📦 Found ${products.length} USD-priced products`);
      const result = await batchUpdatePrices(
        supabase,
        "products",
        products,
        currentRate.rate
      );
      totalUpdated += result.updated;
      allErrors.push(...result.errors);
      console.log(`✅ Updated ${result.updated} products`);
      if (result.errors.length > 0) {
        console.error(`❌ ${result.errors.length} product errors`);
      }
    } else {
      console.log("⚠️ No USD-priced products found");
    }

    // 4. تحديث المتغيرات (product_variants)
    console.log("\n4️⃣ Updating product variants...");
    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("id, variant_name, usd_price")
      .not("usd_price", "is", null)
      .gt("usd_price", 0);

    if (variantsError) {
      console.error("❌ Error fetching variants:", variantsError);
      allErrors.push(`Variants fetch: ${variantsError.message}`);
    } else if (variants && variants.length > 0) {
      console.log(`📦 Found ${variants.length} USD-priced variants`);
      const result = await batchUpdatePrices(
        supabase,
        "product_variants",
        variants,
        currentRate.rate
      );
      totalUpdated += result.updated;
      allErrors.push(...result.errors);
      console.log(`✅ Updated ${result.updated} variants`);
      if (result.errors.length > 0) {
        console.error(`❌ ${result.errors.length} variant errors`);
      }
    } else {
      console.log("⚠️ No USD-priced variants found");
    }

    console.log("\n========================================");
    console.log(`✅ SYNC COMPLETE`);
    console.log(`📊 Total items updated: ${totalUpdated}`);
    console.log(`💱 Exchange rate: ${currentRate.rate} SYP`);
    if (allErrors.length > 0) {
      console.log(`❌ Total errors: ${allErrors.length}`);
      allErrors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
      if (allErrors.length > 10) {
        console.log(`   ... and ${allErrors.length - 10} more`);
      }
    }
    console.log("========================================\n");

    return NextResponse.json({
      success: true,
      updatedCount: totalUpdated,
      newRate: currentRate.rate,
      details: {
        products: products?.length || 0,
        variants: variants?.length || 0,
      },
      errors: allErrors.length > 0 ? allErrors : undefined,
    });
  } catch (error) {
    console.error("\n========================================");
    console.error("❌ SYNC FAILED");
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
