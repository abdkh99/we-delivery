// src/app/api/admin/products/route.ts
// API لإضافة المنتجات مع تشخيص شامل

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ensureUsdToSypRate } from "@/lib/currency";

function roundPrice(price: number): number {
  const ROUNDING_BASE = 500;
  if (price <= 0) return ROUNDING_BASE;
  return Math.ceil(price / ROUNDING_BASE) * ROUNDING_BASE;
}

export async function POST(request: Request) {
  console.log("\n========================================");
  console.log("🚀 NEW PRODUCT REQUEST");
  console.log("========================================\n");

  try {
    const supabase = await createClient();

    // 1. التحقق من المصادقة
    console.log("1️⃣ Checking authentication...");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("❌ Auth error:", authError);
      return NextResponse.json(
        { error: "Auth error", details: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      console.error("❌ No user found");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.email);

    // 2. التحقق من Admin
    console.log("2️⃣ Checking admin role...");
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("❌ Profile error:", profileError);
      return NextResponse.json(
        { error: "Profile error", details: profileError.message },
        { status: 500 }
      );
    }

    if (!userProfile || userProfile.role !== "admin") {
      console.error("❌ Not admin. Role:", userProfile?.role);
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    console.log("✅ User is admin");

    // 3. قراءة البيانات
    console.log("3️⃣ Reading request body...");
    let body;
    try {
      body = await request.json();
      console.log("✅ Body received:");
      console.log(JSON.stringify(body, null, 2));
    } catch (error) {
      console.error("❌ Invalid JSON:", error);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      name,
      sku,
      price,
      usd_price,
      stock_estimate,
      image_url,
      category,
      description,
      has_flavors,
      flavors,
      pricing_mode,
    } = body;

    // 4. التحقق من الحقول
    console.log("4️⃣ Validating fields...");

    if (!name) {
      console.error("❌ Missing: name");
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!sku) {
      console.error("❌ Missing: sku");
      return NextResponse.json({ error: "SKU is required" }, { status: 400 });
    }

    if (!category) {
      console.error("❌ Missing: category");
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    console.log("✅ Required fields present");

    // 5. التحقق من المخزون
    console.log("5️⃣ Validating stock...");
    const stock = parseInt(stock_estimate);

    if (isNaN(stock) || stock < 0) {
      console.error("❌ Invalid stock:", stock_estimate);
      return NextResponse.json(
        { error: "Invalid stock value" },
        { status: 400 }
      );
    }

    console.log("✅ Stock valid:", stock);

    // 6. حساب السعر
    console.log("6️⃣ Calculating price...");
    let finalPrice: number;
    let usdPriceValue: number | null = null;
    let rateUsed: number | null = null;

    if (pricing_mode === "usd" || usd_price) {
      console.log("💵 USD pricing mode");
      const usdVal = parseFloat(usd_price);

      if (!usdVal || usdVal <= 0) {
        console.error("❌ Invalid USD price:", usd_price);
        return NextResponse.json(
          { error: "Invalid USD price" },
          { status: 400 }
        );
      }

      console.log(`💵 USD price: $${usdVal}`);

      // جلب سعر الصرف
      console.log("📊 Fetching exchange rate...");
      let rateInfo;
      try {
        rateInfo = await ensureUsdToSypRate();
        console.log("✅ Exchange rate received:", rateInfo);
      } catch (error) {
        console.error("❌ Rate fetch error:", error);
        return NextResponse.json(
          { error: "Failed to get exchange rate" },
          { status: 500 }
        );
      }

      finalPrice = roundPrice(usdVal * rateInfo.rate);
      usdPriceValue = usdVal;
      rateUsed = rateInfo.rate;

      console.log(
        `💰 Calculation: $${usdVal} × ${rateInfo.rate} = ${
          usdVal * rateInfo.rate
        }`
      );
      console.log(`💰 Rounded: ${finalPrice} SYP`);
    } else {
      console.log("💰 SYP pricing mode");
      const sypVal = parseFloat(price);

      if (!sypVal || sypVal <= 0) {
        console.error("❌ Invalid SYP price:", price);
        return NextResponse.json(
          { error: "Invalid SYP price" },
          { status: 400 }
        );
      }

      finalPrice = roundPrice(sypVal);
      console.log(`💰 Price: ${finalPrice} SYP`);
    }

    // 7. التحقق من النكهات
    console.log("7️⃣ Validating flavors...");

    if (has_flavors) {
      if (!flavors || flavors.length === 0) {
        console.error("❌ No flavors provided");
        return NextResponse.json(
          { error: "At least one flavor required" },
          { status: 400 }
        );
      }

      for (let i = 0; i < flavors.length; i++) {
        const flavor = flavors[i];
        if (!flavor.name || !flavor.name_ar) {
          console.error(`❌ Flavor ${i + 1} missing name/name_ar`);
          return NextResponse.json(
            { error: `Flavor ${i + 1} needs name and name_ar` },
            { status: 400 }
          );
        }
      }

      console.log(`✅ ${flavors.length} flavors valid`);
    } else {
      console.log("✅ No flavors (OK)");
    }

    // 8. بناء بيانات المنتج
    console.log("8️⃣ Building product data...");
    const productData: any = {
      name,
      sku,
      price: finalPrice,
      stock_estimate: stock,
      image_url: image_url || null,
      category,
      description: description || null,
      has_flavors: has_flavors || false,
    };

    if (usdPriceValue !== null) {
      productData.usd_price = usdPriceValue;
      productData.last_synced_rate = rateUsed;
      productData.price_updated_at = new Date().toISOString();
    }

    console.log("✅ Product data:");
    console.log(JSON.stringify(productData, null, 2));

    // 9. حفظ المنتج
    console.log("9️⃣ Inserting product into database...");
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert(productData)
      .select()
      .single();

    if (productError) {
      console.error("❌ Product insert error:", productError);
      console.error("Error details:", JSON.stringify(productError, null, 2));
      return NextResponse.json(
        {
          error: "Failed to create product",
          details: productError.message,
          code: productError.code,
        },
        { status: 500 }
      );
    }

    console.log("✅ Product created successfully!");
    console.log("Product ID:", product.id);

    // 10. إضافة النكهات/المتغيرات (Variants)
    if (has_flavors && flavors && flavors.length > 0) {
      console.log("🔟 Adding variants...");

      // 🔥 FIX: Use product_variants instead of product_flavors
      const variantData = flavors.map((f: any, i: number) => {
        // 🔥 FIX: Ensure both usdPriceValue AND rateUsed are valid before multiplication
        const variantPrice = usdPriceValue && rateUsed
          ? roundPrice(usdPriceValue * rateUsed)
          : finalPrice;
        
        return {
          master_product_id: product.id,
          variant_name: f.name_ar || f.name, // Use Arabic name as variant name
          variant_sku: `${product.sku || 'PROD'}-V${i + 1}`,
          price: variantPrice,
          stock_estimate: f.stock_estimate || 0,
          image_url: f.image_url || null,
          description: f.description || null,
          display_order: i,
          is_active: true,
          // If using USD pricing, store USD price for future sync
          ...(usdPriceValue && {
            usd_price: usdPriceValue,
            last_synced_rate: rateUsed,
            price_updated_at: new Date().toISOString(),
          }),
        };
      });

      console.log("Variant data:", JSON.stringify(variantData, null, 2));

      const { error: variantError } = await supabase
        .from("product_variants")
        .insert(variantData);

      if (variantError) {
        console.error("⚠️ Variant error:", variantError);
        console.error("Error details:", JSON.stringify(variantError, null, 2));
        // Don't fail the whole operation, just log the error
      } else {
        console.log(`✅ ${variantData.length} variants added`);
        
        // Update product to indicate it has variants
        await supabase
          .from("products")
          .update({ has_variants: true })
          .eq("id", product.id);
      }
    }

    console.log("\n========================================");
    console.log("✅ SUCCESS - Product created!");
    console.log("========================================\n");

    return NextResponse.json({
      success: true,
      product,
      rate_used: rateUsed,
    });
  } catch (error) {
    console.error("\n========================================");
    console.error("❌ UNHANDLED ERROR");
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

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
