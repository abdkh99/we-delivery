// src/lib/currency.ts
// نظام سعر صرف يدوي - محدث من قبل الأدمن فقط
// تم إزالة جلب السعر من API الخارجي

import { createClient } from "@/lib/supabase/server";

interface CurrencyRateInfo {
  rate: number;
  provider?: string;
  fetchedAt?: string;
  source?: string;
}

/**
 * تقريب السعر لأقرب 5
 */
function roundPrice(price: number): number {
  const ROUNDING_BASE = 5;
  if (price <= 0) return 5;
  const rounded = Math.ceil(price / ROUNDING_BASE) * ROUNDING_BASE;
  return rounded < 5 ? 5 : rounded;
}

/**
 * جلب سعر الصرف - من قاعدة البيانات فقط (محدث يدوياً من الأدمن)
 */
export async function ensureUsdToSypRate(): Promise<CurrencyRateInfo> {
  const supabase = await createClient();

  console.log("💾 Getting exchange rate from database...");

  try {
    // جلب آخر سعر محفوظ
    const { data: currentRate, error } = await supabase
      .from("currency_rates")
      .select("*")
      .eq("currency_pair", "USD_SYP")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("❌ Database error:", error);
      throw new Error("Failed to get exchange rate");
    }

    if (!currentRate) {
      console.error("❌ No exchange rate found in database");
      console.error(
        "⚠️ الرجاء تحديث سعر الصرف من لوحة الأدمن: /admin/currency"
      );
      throw new Error(
        "No exchange rate available - Please update from admin panel"
      );
    }

    // حساب عمر السعر
    const fetchedAt = new Date(currentRate.fetched_at);
    const now = new Date();
    const hoursSinceUpdate =
      (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60);
    const daysSinceUpdate = hoursSinceUpdate / 24;

    console.log(`✅ Using rate: ${currentRate.rate}`);
    console.log(`📅 Last updated: ${fetchedAt.toLocaleString("ar-SY")}`);
    console.log(
      `⏱️ Age: ${daysSinceUpdate.toFixed(1)} days (${hoursSinceUpdate.toFixed(
        1
      )} hours)`
    );
    console.log(`🔖 Provider: ${currentRate.provider || "unknown"}`);
    console.log(`🔧 Manual: ${currentRate.is_manual ? "Yes" : "No"}`);

    // تحذير إذا كان السعر قديم جداً (أكثر من 7 أيام)
    if (daysSinceUpdate > 7) {
      console.warn(
        `⚠️ Warning: Exchange rate is ${daysSinceUpdate.toFixed(1)} days old`
      );
      console.warn("⚠️ Consider updating from admin panel: /admin/currency");
    }

    return {
      rate: currentRate.rate,
      provider: currentRate.provider || "manual",
      fetchedAt: currentRate.fetched_at,
      source: currentRate.is_manual ? "manual_admin" : "database",
    };
  } catch (error) {
    console.error("❌ Error getting exchange rate:", error);

    // في حالة الطوارئ فقط - استخدام سعر افتراضي
    console.error("🚨 EMERGENCY: Using emergency fallback rate: 15000");
    console.error("⚠️ يجب تحديث السعر فوراً من: /admin/currency");

    return {
      rate: 15000,
      provider: "emergency_fallback",
      fetchedAt: new Date().toISOString(),
      source: "fallback",
    };
  }
}

/**
 * تحويل USD إلى SYP
 */
export async function convertUsdToSyp(usdAmount: number): Promise<number> {
  const rateInfo = await ensureUsdToSypRate();
  return roundPrice(usdAmount * rateInfo.rate);
}

/**
 * مزامنة أسعار المنتجات مع سعر الصرف الجديد
 */
export async function syncProductsWithRate(
  newRate: number
): Promise<{ updated: number; errors: number }> {
  const supabase = await createClient();

  console.log(`🔄 Syncing products with rate: ${newRate}`);

  try {
    // جلب جميع المنتجات التي لها سعر بالدولار
    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("id, usd_price, last_synced_rate")
      .not("usd_price", "is", null);

    if (fetchError) {
      console.error("Error fetching products:", fetchError);
      return { updated: 0, errors: 1 };
    }

    if (!products || products.length === 0) {
      console.log("No products with USD pricing found");
      return { updated: 0, errors: 0 };
    }

    let updated = 0;
    let errors = 0;

    // تحديث كل منتج
    for (const product of products) {
      // تحديث فقط إذا كان السعر مختلف
      if (product.last_synced_rate !== newRate) {
        const newPrice = roundPrice((product.usd_price || 0) * newRate);

        const { error: updateError } = await supabase
          .from("products")
          .update({
            price: newPrice,
            last_synced_rate: newRate,
            price_updated_at: new Date().toISOString(),
          })
          .eq("id", product.id);

        if (updateError) {
          console.error(`Error updating product ${product.id}:`, updateError);
          errors++;
        } else {
          updated++;
        }
      }
    }

    console.log(`✅ Sync complete: ${updated} updated, ${errors} errors`);
    return { updated, errors };
  } catch (error) {
    console.error("Error in syncProductsWithRate:", error);
    return { updated: 0, errors: 1 };
  }
}
