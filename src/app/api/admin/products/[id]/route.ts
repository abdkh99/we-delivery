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
      usd_price,
      last_synced_rate,
      has_variants,
      variants,
    } = body;

    // Get old product data to detect changes and check for variants
    const { data: oldProduct } = await supabase
      .from("products")
      .select("stock_estimate, price, has_variants, usd_price")
      .eq("id", id)
      .single();

    // Build product update data
    const productUpdateData: any = {
      name,
      sku,
      price,
      stock_estimate,
      image_url,
      category,
      description,
      has_variants: has_variants || false,
    };

    // Add USD pricing fields if provided
    if (usd_price !== undefined) {
      productUpdateData.usd_price = usd_price;
    }
    if (last_synced_rate !== undefined) {
      productUpdateData.last_synced_rate = last_synced_rate;
      productUpdateData.price_updated_at = new Date().toISOString();
    }

    // Update product
    const { data: product, error: productError } = await supabase
      .from("products")
      .update(productUpdateData)
      .eq("id", id)
      .select()
      .single();

    if (productError) {
      console.error("Error updating product:", productError);
      return NextResponse.json(
        { error: "Failed to update product", details: productError.message },
        { status: 500 }
      );
    }

    // Handle variants/flavors update
    if (variants && Array.isArray(variants)) {
      console.log(`🔄 Processing ${variants.length} variants`);

      // Get existing variants
      const { data: existingVariants } = await supabase
        .from("product_variants")
        .select("id")
        .eq("master_product_id", id);

      const existingVariantIds = new Set(
        (existingVariants || []).map((v: { id: any; }) => v.id)
      );
      const incomingVariantIds = new Set(
        variants.filter((v: any) => v.id && !v.id.startsWith("temp-")).map((v: any) => v.id)
      );

      // Delete variants that are no longer in the list
      const variantsToDelete = Array.from(existingVariantIds).filter(
        (id) => !incomingVariantIds.has(id)
      );

      if (variantsToDelete.length > 0) {
        console.log(`🗑️ Deleting ${variantsToDelete.length} variants`);
        await supabase
          .from("product_variants")
          .delete()
          .in("id", variantsToDelete);
      }

      // Helper function to calculate variant price
      const calculateVariantPrice = (variant: any, basePrice: number, baseUsdPrice?: number, rate?: number) => {
        if (variant.usd_price && rate) {
          return Math.ceil((variant.usd_price * rate) / 5) * 5;
        }
        if (variant.price !== undefined && variant.price !== null) {
          return variant.price;
        }
        return basePrice;
      };

      // Update or create variants
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        const variantPrice = calculateVariantPrice(variant, price, usd_price, last_synced_rate);

        const variantData: any = {
          master_product_id: id,
          variant_name: variant.variant_name,
          variant_sku: variant.variant_sku || null,
          price: variantPrice,
          stock_estimate: variant.stock_estimate || 0,
          image_url: variant.image_url || null,
          description: variant.description || null,
          display_order: variant.display_order !== undefined ? variant.display_order : i,
          is_active: variant.is_active !== false,
        };

        // Add USD pricing if provided
        if (variant.usd_price !== undefined && variant.usd_price !== null) {
          variantData.usd_price = variant.usd_price;
          if (last_synced_rate) {
            variantData.last_synced_rate = last_synced_rate;
            variantData.price_updated_at = new Date().toISOString();
          }
        } else if (usd_price !== undefined && usd_price !== null) {
          // Use product USD price if variant doesn't have one
          variantData.usd_price = usd_price;
          if (last_synced_rate) {
            variantData.last_synced_rate = last_synced_rate;
            variantData.price_updated_at = new Date().toISOString();
          }
        }

        if (variant.id && !variant.id.startsWith("temp-")) {
          // Update existing variant
          const { error: updateError } = await supabase
            .from("product_variants")
            .update(variantData)
            .eq("id", variant.id);

          if (updateError) {
            console.error(`Error updating variant ${variant.id}:`, updateError);
          }
        } else {
          // Create new variant
          const { error: insertError } = await supabase
            .from("product_variants")
            .insert(variantData);

          if (insertError) {
            console.error(`Error creating variant:`, insertError);
          }
        }
      }

      console.log(`✅ Variants processed successfully`);
    } else if (has_variants === false) {
      // If product no longer has variants, delete all existing variants
      const { error: deleteError } = await supabase
        .from("product_variants")
        .delete()
        .eq("master_product_id", id);

      if (deleteError) {
        console.error("Error deleting variants:", deleteError);
      }
    }

    // 🔥 CRITICAL: Revalidate cache if stock or price changed
    const stockChanged = oldProduct && oldProduct.stock_estimate !== stock_estimate;

    const priceChanged = oldProduct && (oldProduct.price !== price || oldProduct.usd_price !== usd_price);
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


