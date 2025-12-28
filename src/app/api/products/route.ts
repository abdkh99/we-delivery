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

    const sanitizedProducts = (products || []).map((product) => ({
      ...product,
      product_variants: (product.product_variants || []).filter(
        (variant) => variant?.is_active !== false
      ),
    }));

    return NextResponse.json(
      { products: sanitizedProducts },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
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