// ==========================================
// ENHANCED CHECKOUT API - WITH VARIANT STOCK VALIDATION
// Replace: src/app/api/checkout/route.ts
// ==========================================

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// Utility functions (inline to avoid import issues)
function calculateDeliveryFee(distance: number, totalPrice: number): number {
  const FREE_DELIVERY_THRESHOLD = 100000;
  const BASE_FEE = 2000;

  if (totalPrice >= FREE_DELIVERY_THRESHOLD) {
    return 0;
  }
  return BASE_FEE;
}

function calculatePlatformCommission(totalPrice: number): number {
  const COMMISSION_THRESHOLD = 10000;
  const COMMISSION_RATE = 0.05; // 5%

  if (totalPrice <= COMMISSION_THRESHOLD) {
    return 0;
  }
  return Math.round(totalPrice * COMMISSION_RATE);
}

function calculateLoyaltyPoints(amount: number): number {
  return Math.floor(amount / 10000);
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    console.log("\n===========================================");
    console.log("🚀 CHECKOUT API STARTED (WITH VARIANT SUPPORT)");
    console.log("===========================================\n");

    const supabase = await createClient();

    // ============================================
    // 1. AUTHENTICATION
    // ============================================
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Auth failed:", authError?.message);
      return NextResponse.json(
        { error: "يرجى تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    console.log("✅ User authenticated:", user.id);

    // ============================================
    // 2. PARSE REQUEST BODY
    // ============================================
    let body;
    try {
      body = await request.json();
      console.log("📦 Request received with", body.items?.length || 0, "items");
    } catch (e) {
      console.error("❌ Invalid JSON body");
      return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
    }

    const { items, deliveryAddress, deliveryLat, deliveryLng, notes } = body;

    // ============================================
    // 3. BASIC VALIDATION
    // ============================================
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error("❌ No items in cart");
      return NextResponse.json({ error: "السلة فارغة" }, { status: 400 });
    }

    // 🔥 FIX: Validate item structure and normalize data
    console.log("\n🔍 Validating and normalizing cart items...");
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (!item.product || !item.product.id) {
        console.error(`❌ Item ${i} missing product or product.id`);
        return NextResponse.json(
          { error: "بيانات غير صحيحة", message: "بعض العناصر في السلة غير صحيحة" },
          { status: 400 }
        );
      }
      
      if (!item.quantity || item.quantity <= 0) {
        console.error(`❌ Item ${i} has invalid quantity: ${item.quantity}`);
        return NextResponse.json(
          { error: "كمية غير صحيحة", message: "يرجى التحقق من الكميات في السلة" },
          { status: 400 }
        );
      }
      
      // Log item structure for debugging (especially on mobile)
      console.log(`Item ${i}:`, {
        productId: item.product.id,
        productName: item.product.name,
        variantId: item.variantId || "none",
        masterProductId: item.masterProductId || "none",
        quantity: item.quantity,
      });
    }
    
    console.log("✅ All items validated");

    if (!deliveryAddress?.trim() || !deliveryLat || !deliveryLng) {
      console.error("❌ Missing delivery info");
      return NextResponse.json(
        { error: "يرجى تحديد عنوان التوصيل" },
        { status: 400 }
      );
    }

    console.log("✅ Basic validation passed");

    // ============================================
    // 3.5 CART LIMITS VALIDATION (Backend)
    // ============================================
    const { CART_LIMITS, getActiveMaxOrderValue, validateCartLimits } =
      await import("@/lib/cart-limits");

    // Check Limits
    const maxOrderValue = await getActiveMaxOrderValue(supabase as any);

    // Calculate total price for validation
    const currentTotalPrice = items.reduce(
      (sum: number, item: any) =>
        sum + (item.product?.price || 0) * (item.quantity || 0),
      0
    );

    const limitsValidation = validateCartLimits(
      items,
      currentTotalPrice,
      maxOrderValue
    );

    if (!limitsValidation.valid) {
      console.error("❌ Cart limits exceeded:", limitsValidation.error);
      return NextResponse.json(
        {
          error: "تجاوز الحد المسموح",
          message: limitsValidation.error,
        },
        { status: 400 }
      );
    }

    // ============================================
    // 4. VERIFY PRODUCTS & VARIANTS IN DATABASE
    // ============================================
    console.log("\n🔍 Verifying products and variants...");

    // 🔥 FIX: Collect all product IDs correctly
    // For variants: use masterProductId (the actual product ID)
    // For regular products: use product.id
    const productIds = new Set<string>();
    const variantIds = new Set<string>();

    items.forEach((item) => {
      // If item has masterProductId (variant item), use that as the product ID
      if (item?.masterProductId) {
        productIds.add(item.masterProductId);
      } else if (item?.product?.id) {
        // For non-variant items, use product.id directly
        productIds.add(item.product.id);
      }
      
      if (item?.variantId) {
        variantIds.add(item.variantId);
      }
    });

    // Fetch products with their variants
    const { data: dbProducts, error: productsError } = await supabase
      .from("products")
      .select(
        `
        id, 
        name, 
        price, 
        stock_estimate, 
        is_active,
        has_variants,
        product_variants (
          id,
          variant_name,
          price,
          stock_estimate,
          is_active,
          master_product_id
        )
      `
      )
      .in("id", Array.from(productIds));

    if (productsError) {
      console.error("❌ Database error:", productsError);
      return NextResponse.json(
        { error: "خطأ في قاعدة البيانات" },
        { status: 500 }
      );
    }

    // If we have variant IDs, also fetch products that have those variants
    if (variantIds.size > 0) {
      const { data: variantsData, error: variantsError } = await supabase
        .from("product_variants")
        .select(
          `
          id,
          master_product_id,
          variant_name,
          price,
          stock_estimate,
          is_active
        `
        )
        .in("id", Array.from(variantIds));

      if (!variantsError && variantsData && variantsData.length > 0) {
        const masterProductIds = variantsData
          .map((v: any) => v.master_product_id)
          .filter((id: string) => id && !productIds.has(id));

        if (masterProductIds.length > 0) {
          const { data: masterProducts, error: masterError } = await supabase
            .from("products")
            .select(
              `
              id, 
              name, 
              price, 
              stock_estimate, 
              is_active,
              has_variants,
              product_variants (
                id,
                variant_name,
                price,
                stock_estimate,
                is_active,
                master_product_id
              )
            `
            )
            .in("id", masterProductIds);

          if (!masterError && masterProducts) {
            dbProducts.push(...masterProducts);
          }
        }
      }
    }

    // Remove duplicates
    const uniqueProducts = Array.from(
      new Map(dbProducts?.map((p: any) => [p.id, p]) || []).values()
    );

    console.log(`✅ Found ${uniqueProducts.length} unique products`);

    // Check if products are active
    const inactiveProducts = uniqueProducts.filter((p: any) => !p.is_active);
    if (inactiveProducts.length > 0) {
      console.error(
        "❌ Inactive products:",
        inactiveProducts.map((p: any) => p.name)
      );
      return NextResponse.json(
        { error: "بعض المنتجات غير متوفرة حالياً" },
        { status: 400 }
      );
    }

    console.log("✅ All products verified and active");

    // ============================================
    // 5. VALIDATE STOCK (CRITICAL - VARIANT LEVEL)
    // ============================================
    console.log("\n📊 Checking stock at variant level...");

    // 🔥 FIX: Build a map of all variants for quick lookup
    const variantMap = new Map<string, any>();
    uniqueProducts.forEach((p: any) => {
      if (p.product_variants && Array.isArray(p.product_variants)) {
        p.product_variants.forEach((v: any) => {
          variantMap.set(v.id, { ...v, master_product_id: p.id });
        });
      }
    });

    // 🔥 FIX: Store resolved variant IDs for each item (for use in stock reservation)
    const itemVariantMap = new Map<number, { variantId: string | null; productId: string }>();
    let itemIndex = 0;

    for (const item of items) {
      console.log(`\n🔍 Processing item:`, {
        productId: item.product.id,
        productName: item.product.name,
        variantId: item.variantId,
        masterProductId: item.masterProductId,
        quantity: item.quantity,
      });

      // 🔥 FIX: Enhanced product lookup logic
      let dbProduct: any = null;
      let actualVariantId: string | null = null;
      
      // Strategy 1: Use masterProductId if available (most reliable)
      if (item?.masterProductId) {
        dbProduct = uniqueProducts.find((p: any) => p.id === item.masterProductId);
        if (dbProduct) {
          console.log(`✅ Found product via masterProductId: ${dbProduct.name}`);
        }
      }
      
      // Strategy 2: If we have variantId but no product found yet, look up variant first
      if (!dbProduct && item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (variant && variant.master_product_id) {
          dbProduct = uniqueProducts.find((p: any) => p.id === variant.master_product_id);
          actualVariantId = item.variantId;
          if (dbProduct) {
            console.log(`✅ Found product via variant lookup: ${dbProduct.name} (variant: ${variant.variant_name})`);
          }
        }
      }
      
      // Strategy 3: Check if item.product.id is actually a variant ID (mobile/old cart issue)
      if (!dbProduct) {
        const possibleVariant = variantMap.get(item.product.id);
        if (possibleVariant && possibleVariant.master_product_id) {
          dbProduct = uniqueProducts.find((p: any) => p.id === possibleVariant.master_product_id);
          actualVariantId = item.product.id; // The product.id was actually a variant ID
          if (dbProduct) {
            console.log(`✅ Found product - item.product.id was actually a variant ID: ${dbProduct.name}`);
          }
        }
      }
      
      // Strategy 4: Try direct product lookup (for non-variant items)
      if (!dbProduct) {
        dbProduct = uniqueProducts.find((p: any) => p.id === item.product.id);
        if (dbProduct) {
          console.log(`✅ Found product via direct lookup: ${dbProduct.name}`);
        }
      }
      
      // Strategy 5: If we still have variantId but no product, query database directly
      if (!dbProduct && item.variantId) {
        console.log(`⚠️ Product not found in cache, querying database for variant: ${item.variantId}`);
        const { data: variantData, error: variantError } = await supabase
          .from("product_variants")
          .select("master_product_id, variant_name")
          .eq("id", item.variantId)
          .single();
        
        if (!variantError && variantData?.master_product_id) {
          dbProduct = uniqueProducts.find((p: any) => p.id === variantData.master_product_id);
          actualVariantId = item.variantId;
          if (dbProduct) {
            console.log(`✅ Found product via database query: ${dbProduct.name}`);
            // Add variant to product if not already there
            if (!dbProduct.product_variants) {
              dbProduct.product_variants = [];
            }
            const variantExists = dbProduct.product_variants.some((v: any) => v.id === item.variantId);
            if (!variantExists) {
              const { data: fullVariant } = await supabase
                .from("product_variants")
                .select("*")
                .eq("id", item.variantId)
                .single();
              if (fullVariant) {
                dbProduct.product_variants.push(fullVariant);
              }
            }
          }
        }
      }

      // If still not found, return error with detailed logging
      if (!dbProduct) {
        console.error(
          `❌ Product not found for item:`,
          JSON.stringify({
            productId: item.product.id,
            productName: item.product.name,
            variantId: item.variantId,
            masterProductId: item.masterProductId,
            availableProductIds: uniqueProducts.map((p: any) => p.id),
            availableVariantIds: Array.from(variantMap.keys()),
          }, null, 2)
        );
        return NextResponse.json(
          {
            error: "بعض المنتجات غير متوفرة",
            message: `المنتج ${item.product.name || "غير معروف"} غير متوفر حالياً. يرجى تحديث السلة والمحاولة مرة أخرى.`,
            details: "Product lookup failed - item may be from old cart format",
          },
          { status: 400 }
        );
      }
      
      // Use the actual variant ID if we found it
      const finalVariantId = actualVariantId || item.variantId;
      
      // Store the resolved variant ID and product ID for this item
      itemVariantMap.set(itemIndex, {
        variantId: finalVariantId,
        productId: dbProduct.id,
      });

      // Check if this item uses a variant
      if (finalVariantId) {
        console.log(
          `Checking variant ${finalVariantId} for product ${dbProduct.name}`
        );

        // Find the variant
        const variant = (dbProduct.product_variants || []).find(
          (v: any) => v.id === finalVariantId
        );

        if (!variant) {
          console.error("❌ Variant not found:", finalVariantId);
          console.error("Available variants:", dbProduct.product_variants?.map((v: any) => v.id));
          return NextResponse.json(
            {
              error: "النكهة المختارة غير متوفرة",
              message: `يرجى اختيار نكهة أخرى لـ ${dbProduct.name}`,
            },
            { status: 400 }
          );
        }

        if (!variant.is_active) {
          console.error("❌ Variant is inactive:", variant.variant_name);
          return NextResponse.json(
            {
              error: "النكهة غير متوفرة حالياً",
              message: `${variant.variant_name} غير متوفرة`,
            },
            { status: 400 }
          );
        }

        // CRITICAL: Check variant stock
        if (item.quantity > (variant.stock_estimate || 0)) {
          console.error(
            `❌ Insufficient stock for variant: ${variant.variant_name}`,
            `Available: ${variant.stock_estimate}, Requested: ${item.quantity}`
          );
          return NextResponse.json(
            {
              error: "كمية غير متوفرة",
              message: `${dbProduct.name} - ${variant.variant_name}: المتوفر ${
                variant.stock_estimate || 0
              }`,
            },
            { status: 400 }
          );
        }

        // CRITICAL: Reject if stock is 0
        if ((variant.stock_estimate || 0) === 0) {
          console.error(`❌ Variant out of stock: ${variant.variant_name}`);
          return NextResponse.json(
            {
              error: "المنتج غير متوفر",
              message: `${dbProduct.name} - ${variant.variant_name} غير متوفر حالياً`,
            },
            { status: 400 }
          );
        }

        console.log(
          `✅ Variant stock OK: ${variant.variant_name} (${variant.stock_estimate} available)`
        );
      } else {
        // 🔥 FIX: Product without variant - check product stock
        // IMPORTANT: Skip if this is a master product with variants
        if (dbProduct.has_variants) {
          console.log(
            `⚠️ Skipping stock check for master product: ${dbProduct.name} (has variants)`
          );
          continue; // Skip to next item
        }

        if (item.quantity > (dbProduct.stock_estimate || 0)) {
          console.error("❌ Insufficient stock for:", dbProduct.name);
          return NextResponse.json(
            {
              error: "كمية غير متوفرة",
              message: `${dbProduct.name} - المتوفر: ${
                dbProduct.stock_estimate || 0
              }`,
            },
            { status: 400 }
          );
        }

        if ((dbProduct.stock_estimate || 0) === 0) {
          console.error(`❌ Product out of stock: ${dbProduct.name}`);
          return NextResponse.json(
            {
              error: "المنتج غير متوفر",
              message: `${dbProduct.name} غير متوفر حالياً`,
            },
            { status: 400 }
          );
        }

        console.log(
          `✅ Product stock OK: ${dbProduct.name} (${dbProduct.stock_estimate} available)`
        );
      }
      
      itemIndex++;
    }

    console.log("✅ All stock checks passed");

    // ============================================
    // 6. CALCULATE TOTALS
    // ============================================
    console.log("\n💰 Calculating totals...");

    const totalPrice = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    const deliveryFee = calculateDeliveryFee(1, totalPrice);
    const platformCommission = calculatePlatformCommission(totalPrice);

    console.log("Subtotal:", totalPrice);
    console.log("Delivery:", deliveryFee);
    console.log("Commission:", platformCommission);
    console.log("Grand Total:", totalPrice + deliveryFee + platformCommission);

    // ============================================
    // 7. VALIDATE PAYMENT (Points vs Cash)
    // ============================================
    console.log("\n💳 Validating payment...");

    const itemsForValidation = items.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
      payment_method: item.paymentMethod || "cash",
    }));

    const { data: validation, error: validationError } = await supabase.rpc(
      "validate_mixed_payment",
      {
        p_user_id: user.id,
        p_items: itemsForValidation,
      }
    );

    if (validationError) {
      console.error("❌ Payment validation error:", validationError);
      return NextResponse.json(
        { error: "فشل التحقق من الدفع", details: validationError.message },
        { status: 500 }
      );
    }

    if (!validation || validation.length === 0 || !validation[0].is_valid) {
      const errorMsg = validation?.[0]?.error_message || "فشل التحقق من الدفع";
      console.error("❌ Payment invalid:", errorMsg);
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const pointsToDeduct = validation[0].total_points_needed || 0;
    const cashAmount = validation[0].total_cash_needed || 0;

    let paymentMethod: "cash" | "points" | "mixed" = "cash";
    if (pointsToDeduct > 0 && cashAmount > 0) {
      paymentMethod = "mixed";
    } else if (pointsToDeduct > 0) {
      paymentMethod = "points";
    }

    console.log("✅ Payment validated");
    console.log("Points to deduct:", pointsToDeduct);
    console.log("Cash amount:", cashAmount);
    console.log("Payment method:", paymentMethod);

    // ============================================
    // 8. RESERVE STOCK ATOMICALLY (CRITICAL)
    // ============================================
    console.log("\n🔒 Reserving stock atomically...");

    const reservedItems: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const resolvedItem = itemVariantMap.get(i);
      
      try {
        // Use the variant ID we determined earlier during validation
        const variantIdToReserve = resolvedItem?.variantId || item.variantId;
        
        if (variantIdToReserve) {
          // Reserve variant stock
          const { data: reserveResult, error: reserveError } =
            await supabase.rpc("reserve_variant_stock", {
              p_variant_id: variantIdToReserve,
              p_quantity: item.quantity,
            });

          if (reserveError || !reserveResult?.success) {
            console.error(
              "❌ Failed to reserve variant stock:",
              reserveError || reserveResult
            );

            // Rollback all reserved items
            for (const reserved of reservedItems) {
              if (reserved.variantId) {
                await supabase.rpc("reserve_variant_stock", {
                  p_variant_id: reserved.variantId,
                  p_quantity: -reserved.quantity, // Return stock
                });
              } else {
                await supabase.rpc("reserve_product_stock", {
                  p_product_id: reserved.productId,
                  p_quantity: -reserved.quantity, // Return stock
                });
              }
            }

            return NextResponse.json(
              {
                error: reserveResult?.error_ar || "فشل حجز المخزون",
                message: "بعض المنتجات غير متوفرة بالكمية المطلوبة",
              },
              { status: 400 }
            );
          }

          reservedItems.push({
            variantId: variantIdToReserve,
            quantity: item.quantity,
            productId: resolvedItem?.productId || item.product.id,
          });

          console.log(
            `✅ Reserved ${item.quantity} units of variant ${item.variantId}`
          );
        } else {
          // Reserve product stock
          const { data: reserveResult, error: reserveError } =
            await supabase.rpc("reserve_product_stock", {
              p_product_id: item.product.id,
              p_quantity: item.quantity,
            });

          if (reserveError || !reserveResult?.success) {
            console.error(
              "❌ Failed to reserve product stock:",
              reserveError || reserveResult
            );

            // Rollback all reserved items
            for (const reserved of reservedItems) {
              if (reserved.variantId) {
                await supabase.rpc("reserve_variant_stock", {
                  p_variant_id: reserved.variantId,
                  p_quantity: -reserved.quantity,
                });
              } else {
                await supabase.rpc("reserve_product_stock", {
                  p_product_id: reserved.productId,
                  p_quantity: -reserved.quantity,
                });
              }
            }

            return NextResponse.json(
              {
                error: reserveResult?.error_ar || "فشل حجز المخزون",
                message: "بعض المنتجات غير متوفرة بالكمية المطلوبة",
              },
              { status: 400 }
            );
          }

          reservedItems.push({
            productId: resolvedItem?.productId || item.product.id,
            quantity: item.quantity,
          });

          console.log(
            `✅ Reserved ${item.quantity} units of product ${item.product.id}`
          );
        }
      } catch (error) {
        console.error("❌ Error reserving stock:", error);

        // Rollback
        for (const reserved of reservedItems) {
          if (reserved.variantId) {
            await supabase.rpc("reserve_variant_stock", {
              p_variant_id: reserved.variantId,
              p_quantity: -reserved.quantity,
            });
          } else {
            await supabase.rpc("reserve_product_stock", {
              p_product_id: reserved.productId,
              p_quantity: -reserved.quantity,
            });
          }
        }

        return NextResponse.json(
          { error: "فشل حجز المخزون", message: "حدث خطأ أثناء معالجة الطلب" },
          { status: 500 }
        );
      }
    }

    console.log("✅ All stock reserved successfully");

    // ============================================
    // 9. CREATE ORDER
    // ============================================
    console.log("\n📝 Creating order...");

    const orderData = {
      user_id: user.id,
      total_price: totalPrice + deliveryFee + platformCommission,
      delivery_fee: deliveryFee,
      platform_commission: platformCommission,
      address_text: deliveryAddress.trim(),
      lat: parseFloat(deliveryLat.toString()),
      lng: parseFloat(deliveryLng.toString()),
      notes: notes?.trim() || null,
      status: "pending",
      points_used: pointsToDeduct,
      cash_amount: cashAmount + deliveryFee + platformCommission,
      payment_method: paymentMethod,
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error("❌ Order creation failed:", orderError);

      // Rollback stock
      for (const reserved of reservedItems) {
        if (reserved.variantId) {
          await supabase.rpc("reserve_variant_stock", {
            p_variant_id: reserved.variantId,
            p_quantity: -reserved.quantity,
          });
        } else {
          await supabase.rpc("reserve_product_stock", {
            p_product_id: reserved.productId,
            p_quantity: -reserved.quantity,
          });
        }
      }

      return NextResponse.json(
        {
          error: "فشل إنشاء الطلب",
          details: orderError.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ Order created:", order.id);

    // ============================================
    // 10. CREATE ORDER ITEMS
    // ============================================
    console.log("\n📦 Creating order items...");

    const orderItems = items.map((item, index) => {
      // 🔥 FIX: Get the correct product ID from our resolved mapping
      const resolvedItem = itemVariantMap.get(index);
      const productId = resolvedItem?.productId || item.product.id;
      const variantId = resolvedItem?.variantId || item.variantId || null;

      return {
        order_id: order.id,
        product_id: productId,
        qty: item.quantity,
        price_at_order: item.product.price,
        payment_method: item.paymentMethod || "cash",
        variant_id: variantId,
      };
    });

    const { data: createdItems, error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems)
      .select();

    if (itemsError) {
      console.error("❌ Order items creation failed:", itemsError);

      // ROLLBACK: Delete order and return stock
      await supabase.from("orders").delete().eq("id", order.id);

      for (const reserved of reservedItems) {
        if (reserved.variantId) {
          await supabase.rpc("reserve_variant_stock", {
            p_variant_id: reserved.variantId,
            p_quantity: -reserved.quantity,
          });
        } else {
          await supabase.rpc("reserve_product_stock", {
            p_product_id: reserved.productId,
            p_quantity: -reserved.quantity,
          });
        }
      }

      return NextResponse.json(
        {
          error: "فشل إضافة المنتجات للطلب",
          message: "تم إلغاء الطلب",
          details: itemsError.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ Order items created:", createdItems?.length || 0);

    // ============================================
    // 11. DEDUCT POINTS (if applicable)
    // ============================================
    if (pointsToDeduct > 0) {
      console.log("\n💎 Deducting points:", pointsToDeduct);

      const { data: deductResult, error: deductError } = await supabase.rpc(
        "deduct_points_mixed_payment",
        {
          p_user_id: user.id,
          p_order_id: order.id,
          p_points_to_deduct: pointsToDeduct,
        }
      );

      if (deductError || !deductResult) {
        console.error("❌ Points deduction failed:", deductError);

        // ROLLBACK
        await supabase.from("order_items").delete().eq("order_id", order.id);
        await supabase.from("orders").delete().eq("id", order.id);

        for (const reserved of reservedItems) {
          if (reserved.variantId) {
            await supabase.rpc("reserve_variant_stock", {
              p_variant_id: reserved.variantId,
              p_quantity: -reserved.quantity,
            });
          } else {
            await supabase.rpc("reserve_product_stock", {
              p_product_id: reserved.productId,
              p_quantity: -reserved.quantity,
            });
          }
        }

        return NextResponse.json(
          {
            error: "فشل خصم النقاط",
            message: "تم إلغاء الطلب",
            details: deductError?.message,
          },
          { status: 500 }
        );
      }

      console.log("✅ Points deducted successfully");
    }

    // ============================================
    // 12. 🔥 REVALIDATE CACHE - CRITICAL FOR STOCK UPDATES
    // ============================================
    console.log("\n🔄 Revalidating cache for stock updates...");
    try {
      // Revalidate affected product pages
      revalidatePath("/", "layout");
      revalidatePath("/products");
      revalidatePath("/products/[id]", "page");

      // Revalidate specific product pages for ordered items
      const affectedProductIds = [
        ...new Set(
          items.map((item) => {
            // Use master product ID if variant exists
            if (item.variantId) {
              const variant = uniqueProducts
                .flatMap((p: any) => p.product_variants || [])
                .find((v: any) => v.id === item.variantId);
              return variant?.master_product_id || item.product.id;
            }
            return item.product.id;
          })
        ),
      ];
      for (const productId of affectedProductIds) {
        revalidatePath(`/products/${productId}`);
      }

      console.log(
        "✅ Cache revalidated - stock updates will appear immediately"
      );
    } catch (revalidateError) {
      console.error(
        "⚠️ Cache revalidation warning (non-critical):",
        revalidateError
      );
      // Non-critical - order is already successful
    }

    // ============================================
    // 13. SUCCESS RESPONSE
    // ============================================
    const duration = Date.now() - startTime;
    const potentialPoints =
      cashAmount > 0 ? calculateLoyaltyPoints(cashAmount) : 0;

    console.log("\n===========================================");
    console.log("🎉 CHECKOUT COMPLETED SUCCESSFULLY");
    console.log("Order ID:", order.id);
    console.log("Duration:", duration, "ms");
    console.log("===========================================\n");

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        total_price: order.total_price,
        status: order.status,
        created_at: order.created_at,
      },
      potentialPoints,
      paymentInfo: {
        pointsUsed: pointsToDeduct,
        cashAmount: cashAmount + deliveryFee + platformCommission,
        deliveryFee,
        platformCommission,
        totalAmount: totalPrice + deliveryFee + platformCommission,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\n===========================================");
    console.error("❌ CHECKOUT FAILED");
    console.error("Duration:", duration, "ms");
    console.error("Error:", error);
    console.error("===========================================\n");

    return NextResponse.json(
      {
        error: "حدث خطأ غير متوقع",
        message: error instanceof Error ? error.message : "خطأ غير معروف",
      },
      { status: 500 }
    );
  }
}
