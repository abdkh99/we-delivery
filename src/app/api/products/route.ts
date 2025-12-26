import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ✅ إضافة dynamic rendering لـ Vercel
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
      return NextResponse.json(
        { error: "Failed to fetch products", details: error.message },
        { status: 500 }
      );
    }

    // ✅ فلترة المنتجات بشكل صحيح
    const sanitizedProducts = (products || [])
      .map((product) => {
        // فلترة الـ variants النشطة واللي عندها مخزون > 0
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
      .filter((product) => {
        // ✅ إذا المنتج master product (له variants)
        if (product.has_variants === true || product.is_master_product === true) {
          // أظهر المنتج فقط إذا كان عنده variants متاحة
          return product.product_variants.length > 0;
        }
        
        // ✅ إذا المنتج عادي (بدون variants)
        // أظهر المنتج إذا المخزون > 0
        return (product.stock_estimate ?? 0) > 0;
      });

    return NextResponse.json(
      { products: sanitizedProducts },
      {
        headers: {
          // ✅ منع Vercel من كاش الـ response
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
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