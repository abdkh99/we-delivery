// src/lib/utils.ts - محدث بنظام التقريب الذكي

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// ⚙️ إعدادات التقريب - غيّر هنا فقط!
// ============================================

/**
 * قيمة التقريب للعملة الحالية
 *
 * العملة القديمة: 500 (يعني 4,437 → 4,500)
 * العملة الجديدة: 1 أو 5 أو 10 (حسب العملة الجديدة)
 *
 * 👇 غيّر هذا الرقم فقط عند تغيير العملة!
 */
export const PRICE_ROUNDING_BASE = 500;

// ============================================
// 🧮 دوال التقريب
// ============================================

/**
 * تقريب السعر لأقرب قيمة محددة (للأعلى دائماً)
 *
 * @param price - السعر الأصلي
 * @returns السعر المقرب
 *
 * @example
 * roundPrice(4437) → 4500
 * roundPrice(2300) → 2500
 * roundPrice(1100) → 1500
 */
export function roundPrice(price: number): number {
  if (price <= 0) return PRICE_ROUNDING_BASE;
  return Math.ceil(price / PRICE_ROUNDING_BASE) * PRICE_ROUNDING_BASE;
}

/**
 * تحويل الدولار إلى ليرة سورية مع التقريب
 *
 * @param usdPrice - السعر بالدولار
 * @param exchangeRate - سعر الصرف
 * @returns السعر بالليرة السورية (مقرب)
 */
export function convertUsdToSyp(
  usdPrice: number,
  exchangeRate: number
): number {
  const rawPrice = usdPrice * exchangeRate;
  return roundPrice(rawPrice);
}

// ============================================
// 💰 تنسيق العملة
// ============================================

/**
 * تنسيق الأسعار بالليرة السورية
 *
 * @param amount - المبلغ
 * @returns المبلغ منسق (مثال: "4,500 ل.س")
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "0 ل.س";

  // تقريب السعر أولاً
  const rounded = roundPrice(amount);

  // تنسيق بالفواصل العربية
  const formatted = new Intl.NumberFormat("ar-SY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);

  return `${formatted} ل.س`;
}

/**
 * تنسيق الأرقام بدون رمز العملة
 */
export function formatNumber(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "0";

  const rounded = roundPrice(amount);

  return new Intl.NumberFormat("ar-SY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
}

// ============================================
// 📅 تنسيق التاريخ والوقت
// ============================================

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("ar-SY", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================
// 📦 حالة الطلب
// ============================================

export function formatOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "قيد الانتظار",
    confirmed: "مؤكد",
    on_delivery: "جاري التوصيل",
    delivered: "تم التسليم",
    cancelled: "ملغي",
  };
  return statusMap[status] || status;
}

// ============================================
// 🎁 نقاط الولاء
// ============================================

/**
 * حساب نقاط الولاء
 * 1 نقطة لكل 10,000 ليرة سورية
 *
 * 📝 للعملة الجديدة: غيّر 10000 إلى 10
 */
export function calculateLoyaltyPoints(amount: number): number {
  return Math.floor(amount / 10000);
}

// ============================================
// 🚚 رسوم التوصيل
// ============================================

/**
 * حساب رسوم التوصيل
 * التوصيل مجاناً للطلبات فوق 50,000 ليرة
 *
 * 📝 للعملة الجديدة:
 * - غيّر 50000 إلى 50
 * - غيّر 5000 إلى 5
 */
export function calculateDeliveryFee(
  distance: number,
  orderTotal: number
): number {
  // التوصيل مجاناً للطلبات الكبيرة
  if (orderTotal >= 50000) return 0;

  // رسوم توصيل ثابتة
  return 5000;
}

// ============================================
// 💼 عمولة المنصة
// ============================================

/**
 * حساب عمولة المنصة
 *
 * 📝 للعملة الجديدة:
 * - غيّر 100000 إلى 100
 * - غيّر 50000 إلى 50
 */
export function calculatePlatformCommission(orderSubtotal: number): number {
  if (orderSubtotal >= 100000) {
    return Math.round(orderSubtotal * 0.02); // 2% للطلبات الكبيرة
  } else if (orderSubtotal >= 50000) {
    return Math.round(orderSubtotal * 0.03); // 3% للطلبات المتوسطة
  } else {
    return Math.round(orderSubtotal * 0.05); // 5% للطلبات الصغيرة
  }
}

// ============================================
// 📍 استخراج المنطقة
// ============================================

export function extractRegion(address: string): string {
  if (!address) return "غير محدد";

  const regions = [
    "دمشق",
    "ريف دمشق",
    "حلب",
    "حمص",
    "حماة",
    "اللاذقية",
    "طرطوس",
    "السويداء",
    "درعا",
    "القنيطرة",
    "دير الزور",
    "الرقة",
    "إدلب",
    "الحسكة",
  ];

  const lowerAddress = address.toLowerCase();

  for (const region of regions) {
    if (lowerAddress.includes(region.toLowerCase())) {
      return region;
    }
  }

  return "غير محدد";
}

// ============================================
// 🔮 دوال للعملة الجديدة (مستقبلاً)
// ============================================

/**
 * تحويل من العملة القديمة إلى الجديدة
 *
 * @param oldPrice - السعر بالعملة القديمة
 * @param conversionRate - معدل التحويل (افتراضياً 1000)
 * @returns السعر بالعملة الجديدة
 *
 * @example
 * // إذا 1000 ليرة قديمة = 1 ليرة جديدة:
 * convertToNewCurrency(15000, 1000) → 15
 * convertToNewCurrency(4500, 1000) → 5
 */
export function convertToNewCurrency(
  oldPrice: number,
  conversionRate: number = 1000
): number {
  return Math.ceil(oldPrice / conversionRate);
}

// ============================================
// 📝 ملاحظات للعملة الجديدة
// ============================================

/**
 * عند تغيير العملة، اتبع هذه الخطوات:
 *
 * 1️⃣ غيّر PRICE_ROUNDING_BASE:
 *    من 500 إلى 1 (أو 5 أو 10)
 *
 * 2️⃣ غيّر في formatCurrency:
 *    من "ل.س" إلى "ل.س.ج"
 *
 * 3️⃣ غيّر في calculateLoyaltyPoints:
 *    من 10000 إلى 10
 *
 * 4️⃣ غيّر في calculateDeliveryFee:
 *    من 50000 إلى 50
 *    من 5000 إلى 5
 *
 * 5️⃣ غيّر في calculatePlatformCommission:
 *    من 100000 إلى 100
 *    من 50000 إلى 50
 *
 * 6️⃣ شغّل SQL للتحويل (راجع round-existing-prices.sql)
 */

// ============================================
// 🧪 دوال اختبار (للتطوير فقط)
// ============================================

/**
 * اختبار نظام التقريب
 * استخدم هذا للتأكد من أن كل شيء يعمل
 */
export function testRounding() {
  console.log("🧪 Testing rounding system:");
  console.log("4437 →", roundPrice(4437), "(expected: 4500)");
  console.log("2300 →", roundPrice(2300), "(expected: 2500)");
  console.log("1100 →", roundPrice(1100), "(expected: 1500)");
  console.log("999 →", roundPrice(999), "(expected: 1000)");
  console.log("501 →", roundPrice(501), "(expected: 1000)");
  console.log("\n💰 Testing currency formatting:");
  console.log("4437 →", formatCurrency(4437));
  console.log("2300 →", formatCurrency(2300));
  console.log("\n✅ Testing conversion:");
  console.log("$1 × 15234 →", convertUsdToSyp(1, 15234), "(expected: ~15500)");
}

// ============================================
// 🎯 نهاية الملف
// ============================================

/**
 * ملخص سريع:
 *
 * ✅ roundPrice(4437) → 4500
 * ✅ formatCurrency(4437) → "4,500 ل.س"
 * ✅ convertUsdToSyp(1, 15234) → 15500
 *
 * 🔧 للعملة الجديدة: غيّر PRICE_ROUNDING_BASE فقط!
 */
