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
    // ✅ تحسين الفلترة: إخفاء المنتجات بناءً على حالة المخزون
    .filter((product) => {
      // إذا المنتج عنده variants (منتج رئيسي مع نكهات)
      if (product.has_variants || product.is_master_product) {
        // أظهر المنتج فقط إذا كان عنده variants متاحة
        return product.product_variants.length > 0;
      }
      
      // إذا المنتج عادي بدون variants
      // ✅ تأكد أن المخزون أكبر من 0 AND المنتج نشط
      return (product.stock_estimate ?? 0) > 0 && product.is_active === true;
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