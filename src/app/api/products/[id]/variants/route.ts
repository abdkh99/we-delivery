import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data: variants, error } = await supabase
      .from("product_variants")
      .select(
        `
        id,
        master_product_id,
        variant_name,
        variant_sku,
        price,
        stock_estimate,
        image_url,
        description,
        display_order,
        is_active,
        usd_price,
        last_synced_rate,
        price_updated_at
      `
      )
      .eq("master_product_id", params.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching variants:", error);
      return NextResponse.json(
        { error: "Failed to fetch variants", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { variants: variants || [] },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Error in product variants API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

