import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || userProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      sku,
      price,
      stock_estimate,
      image_url,
      category,
      description,
    } = body;

    // Get old product data to detect changes and check for variants
    const { data: oldProduct } = await supabase
      .from("products")
      .select("stock_estimate, price, has_variants")
      .eq("id", id)
      .single();

    // Check if product has variants
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id, price, usd_price")
      .eq("master_product_id", id);

    // Update product
    const { data: product, error: productError } = await supabase
      .from("products")
      .update({
        name,
        sku,
        price,
        stock_estimate,
        image_url,
        category,
        description,
      })
      .eq("id", id)
      .select()
      .single();

    if (productError) {
      console.error("Error updating product:", productError);
      return NextResponse.json(
        { error: "Failed to update product" },
        { status: 500 }
      );
    }

    // 🔥 FIX: If price changed and product has variants, update variants proportionally
    const priceChanged = oldProduct && oldProduct.price !== price;
    if (priceChanged && variants && variants.length > 0 && oldProduct) {
      const priceRatio = oldProduct.price > 0 ? price / oldProduct.price : 1;
      console.log(`🔄 Updating ${variants.length} variants with ratio ${priceRatio}`);

      const variantUpdates = variants.map((variant) => {
        const newVariantPrice = Math.round(variant.price * priceRatio);
        
        // If variant has usd_price, recalculate based on new rate
        if (variant.usd_price && oldProduct.price > 0) {
          const newRate = price / (oldProduct.price / (variant.usd_price || 1));
          return supabase
            .from("product_variants")
            .update({
              price: Math.round(variant.usd_price * newRate),
              last_synced_rate: newRate,
              price_updated_at: new Date().toISOString(),
            })
            .eq("id", variant.id);
        } else {
          // Just scale the price proportionally
          return supabase
            .from("product_variants")
            .update({
              price: newVariantPrice,
              price_updated_at: new Date().toISOString(),
            })
            .eq("id", variant.id);
        }
      });

      const results = await Promise.allSettled(variantUpdates);
      const successful = results.filter((r) => r.status === "fulfilled").length;
      console.log(`✅ Updated ${successful}/${variants.length} variants`);
    }

    // 🔥 CRITICAL: Revalidate cache if stock or price changed
    const stockChanged = oldProduct && oldProduct.stock_estimate !== stock_estimate;
    const priceChanged = oldProduct && oldProduct.price !== price;
    
    if (stockChanged || priceChanged) {
      console.log(`🔄 Revalidating cache for product ${id} (stock: ${stockChanged}, price: ${priceChanged})`);
      try {
        // Revalidate product pages
        revalidatePath("/", "layout");
        revalidatePath("/products");
        revalidatePath("/products/[id]", "page");
        revalidatePath(`/products/${id}`);
        
        // Revalidate admin pages
        revalidatePath("/admin");
        revalidatePath("/admin/products");
        
        console.log("✅ Cache revalidated - updates will appear immediately");
      } catch (revalidateError) {
        console.error("⚠️ Cache revalidation warning (non-critical):", revalidateError);
        // Non-critical - product update is already successful
      }
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error in admin product update API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || userProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Delete product
    const { error: productError } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (productError) {
      console.error("Error deleting product:", productError);
      return NextResponse.json(
        { error: "Failed to delete product" },
        { status: 500 }
      );
    }

    // 🔥 CRITICAL: Revalidate cache after product deletion
    console.log(`🔄 Revalidating cache after deleting product ${id}`);
    try {
      revalidatePath("/", "layout");
      revalidatePath("/products");
      revalidatePath("/products/[id]", "page");
      revalidatePath(`/products/${id}`);
      revalidatePath("/admin");
      revalidatePath("/admin/products");
      
      console.log("✅ Cache revalidated");
    } catch (revalidateError) {
      console.error("⚠️ Cache revalidation warning (non-critical):", revalidateError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in admin product deletion API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


