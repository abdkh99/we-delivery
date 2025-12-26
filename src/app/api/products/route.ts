import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: products, error } = await supabase
      .from("products")
      .select(
        `
        *,
        product_variants (
          id,
          master_product_id,
          variant_name,
          variant_sku,
          price,
          stock_estimate,
          image_url,
          description,
          display_order,
          is_active
        )
      `
      )
      .eq("is_active", true)
      .gt("stock_estimate", 0)  // إخفاء المنتجات اللي مخزونها 0 أو أقل
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
      return NextResponse.json(
        { error: "Failed to fetch products", details: error.message },
        { status: 500 }
      );
    }

    // فلترة المنتجات والـ variants حسب المخزون
    const sanitizedProducts = (products || []).map((product) => {
      // فلترة الـ variants النشطة واللي عندها مخزون
      const activeVariants = (product.product_variants || []).filter(
        (variant) => 
          variant?.is_active !== false && 
          (variant?.stock_estimate ?? 0) > 0
      );

      return {
        ...product,
        product_variants: activeVariants,
      };
    })
    // إخفاء المنتجات اللي ما عندها variants متوفرة (إذا كانت master product)
    .filter((product) => {
      // إذا المنتج عنده variants
      if (product.is_master_product && product.product_variants.length === 0) {
        return false; // اخفي المنتج لأن كل الـ variants خلصت
      }
      return true;
    });

    return NextResponse.json(
      { products: sanitizedProducts },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error in products API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}