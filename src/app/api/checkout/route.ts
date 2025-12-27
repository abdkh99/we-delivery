// ==========================================
// FIXED CHECKOUT API - Better Auth Handling
// ==========================================

import { createClient } from "@/lib/supabase/server";
import { getServiceSupabaseClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Utility functions
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
  const COMMISSION_RATE = 0.05;
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
    console.log("🚀 CHECKOUT API STARTED");
    console.log("===========================================\n");

    // 1. فحص الـ cookies أولاً
    console.log("🍪 Checking cookies...");
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log("Total cookies:", allCookies.length);
    
    const authCookies = allCookies.filter(c => 
      c.name.includes('sb-') || c.name.includes('auth')
    );
    console.log("Auth-related cookies:", authCookies.map(c => c.name).join(", "));

    if (authCookies.length === 0) {
      console.error("❌ No auth cookies found!");
      return NextResponse.json(
        { 
          error: "الجلسة غير موجودة", 
          message: "يرجى تسجيل الخروج ثم الدخول مرة أخرى",
          debug: "NO_AUTH_COOKIES"
        },
        { status: 401 }
      );
    }

    // 2. التحقق من المصادقة
    console.log("🔐 Authenticating user...");
    const userSupabase = await createClient();
    
    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser();

    if (authError) {
      console.error("❌ Auth error:", authError.message);
      console.error("   Error code:", authError.status);
      return NextResponse.json(
        { 
          error: "خطأ في المصادقة", 
          message: authError.message,
          debug: "AUTH_ERROR"
        },
        { status: 401 }
      );
    }

    if (!user) {
      console.error("❌ No user found");
      return NextResponse.json(
        { 
          error: "المستخدم غير موجود", 
          message: "يرجى تسجيل الخروج ثم الدخول مرة أخرى",
          debug: "NO_USER"
        },
        { status: 401 }
      );
    }

    console.log("✅ User authenticated:", user.id);
    console.log("   Email:", user.email);

    // 3. استخدام service role client لباقي العمليات
    const supabase = getServiceSupabaseClient({ required: true });
    if (!supabase) {
      console.error("❌ Service role client not available");
      return NextResponse.json(
        { error: "خطأ في الخادم - service role غير متوفر" },
        { status: 500 }
      );
    }

    // 4. تحليل البيانات
    let body;
    try {
      body = await request.json();
      console.log("📦 Request received with", body.items?.length || 0, "items");
      console.log("📋 Items:", JSON.stringify(body.items, null, 2));
    } catch (e) {
      console.error("❌ Invalid JSON body");
      return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
    }

    const { items, deliveryAddress, deliveryLat, deliveryLng, notes } = body;

    // 5. التحقق الأساسي
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error("❌ No items in cart");
      return NextResponse.json({ error: "السلة فارغة" }, { status: 400 });
    }

    if (!deliveryAddress?.trim() || !deliveryLat || !deliveryLng) {
      console.error("❌ Missing delivery info");
      return NextResponse.json(
        { error: "يرجى تحديد عنوان التوصيل" },
        { status: 400 }
      );
    }

    console.log("✅ Basic validation passed");

    // 6. التحقق من المنتجات
    console.log("\n🔍 Verifying products...");
    const productIds = items.map((item) => item?.product?.id).filter((id) => id);

    if (productIds.length === 0) {
      console.error("❌ No valid product IDs");
      return NextResponse.json(
        { error: "معلومات المنتجات غير صحيحة" },
        { status: 400 }
      );
    }

    const { data: dbProducts, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, stock_estimate, is_active")
      .in("id", productIds);

    if (productsError) {
      console.error("❌ Database error:", productsError);
      return NextResponse.json(
        { error: "خطأ في قاعدة البيانات", details: productsError.message },
        { status: 500 }
      );
    }

    if (!dbProducts || dbProducts.length !== productIds.length) {
      console.error("❌ Some products not found");
      return NextResponse.json(
        { error: "بعض المنتجات غير متوفرة" },
        { status: 400 }
      );
    }

    const inactiveProducts = dbProducts.filter((p) => !p.is_active);
    if (inactiveProducts.length > 0) {
      console.error("❌ Inactive products:", inactiveProducts.map((p) => p.name));
      return NextResponse.json(
        { error: "بعض المنتجات غير متوفرة حالياً" },
        { status: 400 }
      );
    }

    console.log("✅ All products verified and active");

    // 7. التحقق من المخزون (مع دعم كامل للـ variants)
    console.log("\n📊 Checking stock...");
    for (const item of items) {
      const dbProduct = dbProducts.find((p) => p.id === item.product.id);
      if (!dbProduct) {
        console.error("❌ Product not found:", item.product.id);
        continue;
      }

      console.log(`\n🔍 Checking item: ${dbProduct.name}`);
      console.log(`   - Has variantId: ${!!item.variantId}`);
      console.log(`   - Requested quantity: ${item.quantity}`);

      // ✅ إذا كان المنتج له variant، تحقق من مخزون الـ variant فقط
      if (item.variantId) {
        console.log(`   - Checking variant: ${item.variantId}`);
        
        const { data: variant, error: variantError } = await supabase
          .from("product_variants")
          .select("id, variant_name, stock_estimate, is_active")
          .eq("id", item.variantId)
          .single();

        if (variantError || !variant) {
          console.error(`❌ Variant not found: ${item.variantId}`, variantError);
          return NextResponse.json(
            {
              error: "نكهة المنتج غير متوفرة",
              message: `${dbProduct.name} - النكهة المطلوبة غير موجودة`,
            },
            { status: 400 }
          );
        }

        console.log(`   - Variant found: ${variant.variant_name}`);
        console.log(`   - Variant stock: ${variant.stock_estimate}`);
        console.log(`   - Variant active: ${variant.is_active}`);

        if (!variant.is_active) {
          console.error(`❌ Variant inactive: ${variant.variant_name}`);
          return NextResponse.json(
            {
              error: "نكهة المنتج غير متوفرة",
              message: `${dbProduct.name} - ${variant.variant_name} غير متوفرة حالياً`,
            },
            { status: 400 }
          );
        }

        if (item.quantity > (variant.stock_estimate || 0)) {
          console.error(`❌ Insufficient variant stock: ${variant.variant_name}`);
          console.error(`   - Requested: ${item.quantity}, Available: ${variant.stock_estimate}`);
          return NextResponse.json(
            {
              error: "كمية غير متوفرة",
              message: `${dbProduct.name} - ${variant.variant_name} - المتوفر: ${variant.stock_estimate || 0}`,
            },
            { status: 400 }
          );
        }

        console.log(`✅ Variant stock OK: ${variant.variant_name}`);
      } else {
        // ✅ منتج عادي بدون variant - تحقق من مخزون المنتج الرئيسي
        console.log(`   - Regular product, checking main stock`);
        console.log(`   - Product stock: ${dbProduct.stock_estimate}`);
        
        if (item.quantity > dbProduct.stock_estimate) {
          console.error(`❌ Insufficient stock: ${dbProduct.name}`);
          console.error(`   - Requested: ${item.quantity}, Available: ${dbProduct.stock_estimate}`);
          return NextResponse.json(
            {
              error: "كمية غير متوفرة",
              message: `${dbProduct.name} - المتوفر: ${dbProduct.stock_estimate}`,
            },
            { status: 400 }
          );
        }

        console.log(`✅ Product stock OK`);
      }
    }

    console.log("\n✅ Stock available for all items");

    // 8. حساب الإجماليات
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

    // 9. التحقق من الدفع
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

    // 10. إنشاء الطلب
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
      status: "pending" as const,
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
      return NextResponse.json(
        {
          error: "فشل إنشاء الطلب",
          details: orderError.message,
          hint: orderError.hint,
          code: orderError.code,
        },
        { status: 500 }
      );
    }

    console.log("✅ Order created:", order.id);

    // 11. إنشاء عناصر الطلب
    console.log("\n📦 Creating order items...");
    const orderItems = items.map((item) => {
      const dbProduct = dbProducts.find((p) => p.id === item.product.id);
      return {
        order_id: order.id,
        product_id: item.product.id,
        qty: item.quantity,
        price_at_order: dbProduct?.price || item.product.price,
        payment_method: item.paymentMethod || "cash",
        variant_id: item.variantId || null,
      };
    });

    const { data: createdItems, error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems)
      .select();

    if (itemsError) {
      console.error("❌ Order items creation failed:", itemsError);
      // ROLLBACK
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        {
          error: "فشل إضافة المنتجات للطلب",
          details: itemsError.message,
          hint: itemsError.hint,
        },
        { status: 500 }
      );
    }

    console.log("✅ Order items created:", createdItems?.length || 0);

    // 12. خصم النقاط
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
        return NextResponse.json(
          {
            error: "فشل خصم النقاط",
            details: deductError?.message,
          },
          { status: 500 }
        );
      }

      console.log("✅ Points deducted successfully");
    }

    // 13. تحديث المخزون
    console.log("\n📊 Updating stock...");
    for (const item of items) {
      const dbProduct = dbProducts.find((p) => p.id === item.product.id);
      if (!dbProduct) continue;

      // ✅ تحديث مخزون الـ variant إذا وُجد
      if (item.variantId) {
        const { data: variant } = await supabase
          .from("product_variants")
          .select("stock_estimate, variant_name")
          .eq("id", item.variantId)
          .single();

        if (variant) {
          const newVariantStock = Math.max(
            0,
            (variant.stock_estimate || 0) - item.quantity
          );
          await supabase
            .from("product_variants")
            .update({ stock_estimate: newVariantStock })
            .eq("id", item.variantId);
          
          console.log(`✅ Deducted ${item.quantity} from variant ${variant.variant_name} (new stock: ${newVariantStock})`);
        }
      } else {
        // ✅ تحديث مخزون المنتج العادي
        const newStock = Math.max(0, dbProduct.stock_estimate - item.quantity);
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock_estimate: newStock })
          .eq("id", item.product.id);

        if (stockError) {
          console.warn("⚠️ Stock update warning:", stockError.message);
        } else {
          console.log(`✅ Deducted ${item.quantity} from product ${dbProduct.name} (new stock: ${newStock})`);
        }
      }
    }

    console.log("✅ Stock updated");

    // 14. النجاح!
    const duration = Date.now() - startTime;
    const potentialPoints = cashAmount > 0 ? calculateLoyaltyPoints(cashAmount) : 0;

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
