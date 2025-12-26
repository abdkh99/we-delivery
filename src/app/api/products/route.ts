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

    console.log(`📦 Total products from DB: ${products?.length || 0}`);

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
          _hasVariants: activeVariants.length > 0, // ✅ flag مساعد
        };
      })
      .filter((product) => {
        // ✅ المنطق الصحيح: تحقق من وجود variants أولاً
        const hasVariants = product.product_variants && product.product_variants.length > 0;
        
        if (hasVariants) {
          // ✅ المنتج له variants: أظهره فقط إذا كان عنده variants متاحة
          const hasAvailableVariants = product._hasVariants;
          console.log(`Product "${product.name}" - Has variants: ${product.product_variants.length}, Available: ${hasAvailableVariants}`);
          return hasAvailableVariants;
        } else {
          // ✅ المنتج عادي (بدون variants): أظهره إذا المخزون > 0
          const isAvailable = (product.stock_estimate ?? 0) > 0;
          console.log(`Product "${product.name}" - Regular product, Stock: ${product.stock_estimate}, Available: ${isAvailable}`);
          return isAvailable;
        }
      })
      .map((product) => {
        // ✅ إزالة الـ flag المساعد قبل الإرجاع
        const { _hasVariants, ...cleanProduct } = product;
        return cleanProduct;
      });

    console.log(`✅ Products after filtering: ${sanitizedProducts.length}`);

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