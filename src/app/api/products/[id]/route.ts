import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const productId = params.id;

    // جلب المنتج مع جميع التفاصيل
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        `
        *,
        product_flavors (
          id,
          product_id,
          name,
          name_ar,
          image_url,
          stock_estimate,
          display_order,
          is_active
        ),
        product_variants (
          id,
          master_product_id,
          variant_name,
          variant_sku,
          price,
          stock_estimate,
          is_active
        )
      `
      )
      .eq("id", productId)
      .single();

    if (productError) {
      console.error("Error fetching product:", productError);
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // ترتيب النكهات حسب display_order
    if (product.product_flavors) {
      product.product_flavors.sort(
        (a, b) => (a.display_order || 0) - (b.display_order || 0)
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error in product detail API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
