// =====================================================
// Cart Limits Configuration
// SYP-based, admin-controlled with exchange rate safety
// =====================================================

import { SupabaseClient } from "@supabase/supabase-js";

export const CART_LIMITS = {
  // Fixed limits
  MAX_QUANTITY_PER_PRODUCT: 15,
  MAX_TOTAL_ITEMS: 30,
  
  // Default max order value in SYP (admin can change via commission_settings)
  DEFAULT_MAX_ORDER_VALUE: 1000000,
  
  // Exchange rate safety bounds (SYP per USD)
  // If rate is within this range, disable max order limit
  EXCHANGE_RATE_SAFE_MIN: 5000,
  EXCHANGE_RATE_SAFE_MAX: 50000,
};

export const CART_ERROR_MESSAGES = {
  MAX_QUANTITY_EXCEEDED: `الحد الأقصى للكمية ${CART_LIMITS.MAX_QUANTITY_PER_PRODUCT} وحدات`,
  MAX_ITEMS_EXCEEDED: `الحد الأقصى ${CART_LIMITS.MAX_TOTAL_ITEMS} منتج في السلة`,
  MAX_VALUE_EXCEEDED: "قيمة الطلب تتجاوز الحد المسموح",
};

/**
 * Get the active max order value from database
 * Returns null if limit should be disabled (exchange rate safety rule)
 */
export async function getActiveMaxOrderValue(
  supabase: SupabaseClient
): Promise<number | null> {
  try {
    // Fetch both settings and exchange rate in parallel
    const [settingsRes, rateRes] = await Promise.all([
      supabase
        .from("commission_settings")
        .select("max_order_amount")
        .eq("is_active", true)
        .order("max_order_amount", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("currency_rates")
        .select("rate")
        .eq("currency_pair", "USD_SYP")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // Get max order value (use default if not set)
    const maxOrderValue =
      settingsRes.data?.max_order_amount || CART_LIMITS.DEFAULT_MAX_ORDER_VALUE;

    // Get exchange rate
    const exchangeRate = rateRes.data?.rate;

    // Safety rule: if exchange rate is in "normal" range (5K-50K), disable limit
    // This prevents false rejections due to unreliable exchange rates
    if (
      exchangeRate &&
      exchangeRate >= CART_LIMITS.EXCHANGE_RATE_SAFE_MIN &&
      exchangeRate <= CART_LIMITS.EXCHANGE_RATE_SAFE_MAX
    ) {
      console.log(
        `💱 Exchange rate ${exchangeRate} is in safe range - order value limit DISABLED`
      );
      return null; // No limit
    }

    console.log(`📊 Max order value: ${maxOrderValue} SYP`);
    return maxOrderValue;
  } catch (error) {
    console.error("Error getting max order value:", error);
    // Return default limit on error
    return CART_LIMITS.DEFAULT_MAX_ORDER_VALUE;
  }
}

/**
 * Validate cart items against limits
 * Returns { valid: boolean, error?: string }
 */
export function validateCartLimits(
  items: Array<{ quantity: number }>,
  totalPrice?: number,
  maxOrderValue?: number | null
): { valid: boolean; error?: string } {
  // Check total items
  const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  if (totalItems > CART_LIMITS.MAX_TOTAL_ITEMS) {
    return { valid: false, error: CART_ERROR_MESSAGES.MAX_ITEMS_EXCEEDED };
  }

  // Check per-product quantity
  for (const item of items) {
    if (item.quantity > CART_LIMITS.MAX_QUANTITY_PER_PRODUCT) {
      return { valid: false, error: CART_ERROR_MESSAGES.MAX_QUANTITY_EXCEEDED };
    }
  }

  // Check order value (if limit is active)
  if (maxOrderValue && totalPrice && totalPrice > maxOrderValue) {
    return { valid: false, error: CART_ERROR_MESSAGES.MAX_VALUE_EXCEEDED };
  }

  return { valid: true };
}
