// src/app/api/admin/currency/route.ts
// API لإدارة سعر الصرف من لوحة الأدمن

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateProductPrices } from "@/lib/currency-admin";

/**
 * GET: جلب سعر الصرف الحالي مع التفاصيل
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // التحقق من صلاحيات الأدمن
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json(
        { error: "غير مصرح - صلاحيات أدمن مطلوبة" },
        { status: 403 }
      );
    }

    // جلب السعر الحالي
    const { data: currentRate, error } = await supabase
      .from("currency_rates")
      .select("*")
      .eq("currency_pair", "USD_SYP")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("خطأ في جلب السعر:", error);
      return NextResponse.json({ error: "فشل جلب سعر الصرف" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      rate: currentRate,
    });
  } catch (error) {
    console.error("خطأ في GET currency:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

/**
 * POST: تحديث سعر الصرف يدوياً
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // التحقق من صلاحيات الأدمن
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role, name")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json(
        { error: "غير مصرح - صلاحيات أدمن مطلوبة" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rate, updateProducts } = body;

    // التحقق من صحة السعر
    if (!rate || typeof rate !== "number" || rate <= 0) {
      return NextResponse.json(
        { error: "السعر المدخل غير صحيح" },
        { status: 400 }
      );
    }

    // حفظ السعر الجديد
    const { data: newRate, error: insertError } = await supabase
      .from("currency_rates")
      .insert({
        base_currency: "USD",
        target_currency: "SYP",
        currency_pair: "USD_SYP",
        rate: rate,
        is_manual: true,
        updated_by: user.id,
        provider: `admin:${userData.name}`,
        fetched_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("خطأ في حفظ السعر:", insertError);
      return NextResponse.json({ error: "فشل حفظ سعر الصرف" }, { status: 500 });
    }

    // تحديث أسعار المنتجات إذا كان مطلوباً
    let productsUpdated = 0;
    if (updateProducts) {
      try {
        productsUpdated = await updateProductPrices(rate);
        console.log(`✅ تم تحديث ${productsUpdated} منتج`);
      } catch (error) {
        console.error("خطأ في تحديث أسعار المنتجات:", error);
        // لا نفشل الطلب بأكمله، فقط نسجل الخطأ
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث سعر الصرف بنجاح",
      rate: newRate,
      productsUpdated,
    });
  } catch (error) {
    console.error("خطأ في POST currency:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
