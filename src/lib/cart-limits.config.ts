// ==========================================
// CART LIMITS CONFIGURATION
// Save as: src/lib/cart-limits.config.ts
// ==========================================

/**
 * Cart limits for COD (Cash on Delivery) e-commerce store
 * 
 * These limits help prevent:
 * - COD fraud and abuse
 * - Stock exhaustion
 * - Unrealistic orders
 * - Delivery complications
 */

export const CART_LIMITS = {
  /**
   * Maximum number of TOTAL items in cart (across all products)
   * Recommended: 30 for COD stores
   */
  MAX_TOTAL_ITEMS: 30,

  /**
   * Maximum quantity per single product/variant
   * Recommended: 5 for COD to prevent bulk abuse
   * Previous value was 100 (too high for COD)
   */
  MAX_QUANTITY_PER_PRODUCT: 5,

  /**
   * Maximum total order value in SYP (Syrian Pounds)
   * 10,000,000 SYP ≈ $200 USD (at ~50,000 SYP/$1)
   * Recommended: Adjust based on your average order value
   */
  MAX_ORDER_VALUE_SYP: 10_000_000,

  /**
   * Minimum order value (optional, typically 0 for flexibility)
   */
  MIN_ORDER_VALUE_SYP: 0,
} as const;

/**
 * User-facing error messages in Arabic
 */
export const CART_LIMIT_MESSAGES = {
  MAX_TOTAL_ITEMS: `لا يمكن إضافة أكثر من ${CART_LIMITS.MAX_TOTAL_ITEMS} منتج إلى السلة`,
  MAX_QUANTITY_PER_PRODUCT: `لا يمكن طلب أكثر من ${CART_LIMITS.MAX_QUANTITY_PER_PRODUCT} وحدات من المنتج الواحد`,
  MAX_ORDER_VALUE: `قيمة الطلب تتجاوز الحد الأقصى المسموح (${(CART_LIMITS.MAX_ORDER_VALUE_SYP / 1000).toLocaleString()} ألف ليرة)`,
  MIN_ORDER_VALUE: `قيمة الطلب أقل من الحد الأدنى المطلوب`,
  STOCK_EXCEEDED: 'الكمية المطلوبة تتجاوز المخزون المتاح',
  INVALID_QUANTITY: 'الكمية المدخلة غير صحيحة',
} as const;

/**
 * Validate if adding an item exceeds cart limits
 */
export function validateCartLimits(
  currentTotalItems: number,
  currentItemQuantity: number,
  quantityToAdd: number,
  currentTotalPrice: number,
  itemPrice: number
): {
  isValid: boolean;
  error?: string;
} {
  // Check max total items
  if (currentTotalItems >= CART_LIMITS.MAX_TOTAL_ITEMS) {
    return {
      isValid: false,
      error: CART_LIMIT_MESSAGES.MAX_TOTAL_ITEMS,
    };
  }

  // Check max quantity per product
  const newQuantity = currentItemQuantity + quantityToAdd;
  if (newQuantity > CART_LIMITS.MAX_QUANTITY_PER_PRODUCT) {
    return {
      isValid: false,
      error: CART_LIMIT_MESSAGES.MAX_QUANTITY_PER_PRODUCT,
    };
  }

  // Check max order value
  const projectedTotal = currentTotalPrice + (itemPrice * quantityToAdd);
  if (projectedTotal > CART_LIMITS.MAX_ORDER_VALUE_SYP) {
    return {
      isValid: false,
      error: CART_LIMIT_MESSAGES.MAX_ORDER_VALUE,
    };
  }

  return { isValid: true };
}

/**
 * Validate complete cart before checkout
 */
export function validateCartForCheckout(
  totalItems: number,
  totalPrice: number
): {
  isValid: boolean;
  error?: string;
} {
  // Check total items
  if (totalItems > CART_LIMITS.MAX_TOTAL_ITEMS) {
    return {
      isValid: false,
      error: CART_LIMIT_MESSAGES.MAX_TOTAL_ITEMS,
    };
  }

  // Check order value
  if (totalPrice > CART_LIMITS.MAX_ORDER_VALUE_SYP) {
    return {
      isValid: false,
      error: CART_LIMIT_MESSAGES.MAX_ORDER_VALUE,
    };
  }

  if (totalPrice < CART_LIMITS.MIN_ORDER_VALUE_SYP) {
    return {
      isValid: false,
      error: CART_LIMIT_MESSAGES.MIN_ORDER_VALUE,
    };
  }

  return { isValid: true };
}
