import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const supabase = await createClient();
    const productId = params.id;

    // جلب المنتج مع جميع التفاصيل
    const { data: product, error: productError } = await supabase
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
          usd_price,
          stock_estimate,
          image_url,
          description,
          display_order,
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
    if (product.product_variants) {
      product.product_variants.sort(
        (a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)
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
