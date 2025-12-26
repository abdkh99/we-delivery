import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUsdToSypRate } from "@/lib/currency";
import { roundPrice } from "@/lib/utils";
/**
 * API لتحديث أسعار المنتجات تلقائياً بناءً على سعر الدولار
 * يمكن استدعاؤه من:
 * 1. Admin يدوياً
 * 2. Cron Job تلقائي (كل 24 ساعة)
 */

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

    console.log("💱 Current exchange rate:", rateInfo.rate);

    const supabase = await createClient();

    // جلب جميع المنتجات التي لها سعر بالدولار
    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("id, name, usd_price, price, last_synced_rate")
      .not("usd_price", "is", null);

    if (fetchError) {
      console.error("Error fetching products:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        message: "No products with USD pricing found",
        updatedProducts: 0,
        rate: rateInfo.rate,
      });
    }

    console.log(`📦 Found ${products.length} products with USD pricing`);

    // تحديث المنتجات
    const updates = [];
    const updatedProducts = [];

    for (const product of products) {
      // حساب السعر الجديد بالليرة
    const newPrice = roundPrice((product.usd_price || 0) * rateInfo.rate);
      // تحديث فقط إذا تغير السعر أو السعر القديم مختلف
      if (
        newPrice !== product.price ||
        rateInfo.rate !== product.last_synced_rate
      ) {
        updates.push(
          supabase
            .from("products")
            .update({
              price: newPrice,
              last_synced_rate: rateInfo.rate,
              price_updated_at: new Date().toISOString(),
            })
            .eq("id", product.id)
        );

        updatedProducts.push({
          id: product.id,
          name: product.name,
          oldPrice: product.price,
          newPrice: newPrice,
          usdPrice: product.usd_price,
        });
      }
    }

    // تنفيذ جميع التحديثات
    if (updates.length > 0) {
      const results = await Promise.allSettled(updates);

      const failed = results.filter((r) => r.status === "rejected").length;

      console.log(
        `✅ Updated ${updates.length - failed}/${updates.length} products`
      );

      if (failed > 0) {
        console.warn(`⚠️ Failed to update ${failed} products`);
      }
    }

    // تحديث الـ variants أيضاً
    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("id, variant_name, usd_price, price, last_synced_rate")
      .not("usd_price", "is", null);

    const variantUpdates = [];
    const updatedVariants = [];

    if (!variantsError && variants) {
      for (const variant of variants) {
        const newPrice = Math.ceil((variant.usd_price || 0) * rateInfo.rate);

        if (
          newPrice !== variant.price ||
          rateInfo.rate !== variant.last_synced_rate
        ) {
          variantUpdates.push(
            supabase
              .from("product_variants")
              .update({
                price: newPrice,
                last_synced_rate: rateInfo.rate,
                price_updated_at: new Date().toISOString(),
              })
              .eq("id", variant.id)
          );

          updatedVariants.push({
            id: variant.id,
            name: variant.variant_name,
            oldPrice: variant.price,
            newPrice: newPrice,
          });
        }
      }

      if (variantUpdates.length > 0) {
        await Promise.allSettled(variantUpdates);
        console.log(`✅ Updated ${variantUpdates.length} variants`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Prices updated successfully",
      rate: rateInfo.rate,
      rateProvider: rateInfo.provider,
      updatedAt: new Date().toISOString(),
      statistics: {
        totalProductsChecked: products.length,
        productsUpdated: updatedProducts.length,
        variantsUpdated: updatedVariants.length,
      },
      updatedProducts,
      updatedVariants,
    });
  } catch (error) {
    console.error("Error in pricing sync API:", error);
    return NextResponse.json(
      {
        error: "Failed to sync product prices",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint للحصول على معلومات آخر تحديث
 */
export async function GET() {
  try {
    const supabase = await createClient();

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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // جلب آخر سعر صرف مستخدم
    const rateInfo = await ensureUsdToSypRate();

    // جلب إحصائيات المنتجات
    const { data: products } = await supabase
      .from("products")
      .select("id, name, usd_price, price, last_synced_rate, price_updated_at")
      .not("usd_price", "is", null);

    const needsUpdate = products
      ? products.filter((p) => p.last_synced_rate !== rateInfo.rate)
      : [];

    return NextResponse.json({
      currentRate: rateInfo.rate,
      rateProvider: rateInfo.provider,
      rateFetchedAt: rateInfo.fetchedAt,
      statistics: {
        totalProductsWithUsdPricing: products?.length || 0,
        productsNeedingUpdate: needsUpdate.length,
        lastUpdateRun: products?.[0]?.price_updated_at || null,
      },
    });
  } catch (error) {
    console.error("Error in pricing sync GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
