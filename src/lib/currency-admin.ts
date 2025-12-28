// src/lib/currency-admin.ts
// وظائف إدارة العملات للأدمن

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
 * تحديث أسعار جميع المنتجات بناءً على سعر الدولار الجديد
 * @param newRate سعر الدولار الجديد
 * @returns عدد المنتجات التي تم تحديثها
 */
export async function updateProductPrices(newRate: number): Promise<number> {
  const supabase = await createClient();
  let updatedCount = 0;

  try {
    // 1. تحديث المنتجات الرئيسية (products)
    // جلب جميع المنتجات التي لها usd_price
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, usd_price")
      .not("usd_price", "is", null);

    if (productsError) {
      console.error("خطأ في جلب المنتجات:", productsError);
      throw productsError;
    }

    if (products && products.length > 0) {
      console.log(`🔄 تحديث ${products.length} منتج رئيسي...`);

      for (const product of products) {
        if (product.usd_price && product.usd_price > 0) {
          const newPrice = roundPrice(product.usd_price * newRate);

          const { error: updateError } = await supabase
            .from("products")
            .update({
              price: newPrice,
              last_synced_rate: newRate,
              price_updated_at: new Date().toISOString(),
            })
            .eq("id", product.id);

          if (updateError) {
            console.error(`خطأ في تحديث المنتج ${product.id}:`, updateError);
          } else {
            updatedCount++;
          }
        }
      }
    }

    // 2. تحديث المتغيرات (product_variants)
    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("id, usd_price")
      .not("usd_price", "is", null);

    if (variantsError) {
      console.error("خطأ في جلب المتغيرات:", variantsError);
      throw variantsError;
    }

    if (variants && variants.length > 0) {
      console.log(`🔄 تحديث ${variants.length} متغير...`);

      for (const variant of variants) {
        if (variant.usd_price && variant.usd_price > 0) {
          const newPrice = roundPrice(variant.usd_price * newRate);

          const { error: updateError } = await supabase
            .from("product_variants")
            .update({
              price: newPrice,
              last_synced_rate: newRate,
              price_updated_at: new Date().toISOString(),
            })
            .eq("id", variant.id);

          if (updateError) {
            console.error(`خطأ في تحديث المتغير ${variant.id}:`, updateError);
          } else {
            updatedCount++;
          }
        }
      }
    }

    console.log(`✅ تم تحديث ${updatedCount} عنصر بنجاح`);
    return updatedCount;
  } catch (error) {
    console.error("❌ خطأ في تحديث الأسعار:", error);
    throw error;
  }
}

/**
 * جلب تاريخ تحديثات سعر الصرف
 * @param limit عدد السجلات المطلوبة
 */
export async function getCurrencyHistory(limit: number = 10) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("currency_rates")
    .select("*")
    .eq("currency_pair", "USD_SYP")
    .order("fetched_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("خطأ في جلب التاريخ:", error);
    throw error;
  }

  return data;
}
