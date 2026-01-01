// ==========================================
// VALIDATION LIBRARY - ENHANCED WITH CART LIMITS
// Replace: src/lib/validation.ts
// ==========================================

import { CART_LIMITS, CART_LIMIT_MESSAGES } from "./cart-limits.config";

/**
 * Validate and sanitize address
 */
export function validateAddress(address: string): {
  isValid: boolean;
  sanitized?: string;
  error?: string;
} {
  if (!address || typeof address !== "string") {
    return { isValid: false, error: "عنوان التوصيل مطلوب" };
  }

  const trimmed = address.trim();

  if (trimmed.length < 10) {
    return {
      isValid: false,
      error: "عنوان التوصيل قصير جداً (10 أحرف على الأقل)",
    };
  }

  if (trimmed.length > 200) {
    return {
      isValid: false,
      error: "عنوان التوصيل طويل جداً (200 حرف كحد أقصى)",
    };
  }

  // Sanitize: remove special characters that could be dangerous
  const sanitized = trimmed
    .replace(/[<>'"]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "");

  return { isValid: true, sanitized };
}

/**
 * Validate coordinates
 */
export function validateCoordinates(
  lat: number,
  lng: number
): {
  isValid: boolean;
  error?: string;
} {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return { isValid: false, error: "الإحداثيات غير صحيحة" };
  }

  if (isNaN(lat) || isNaN(lng)) {
    return { isValid: false, error: "الإحداثيات غير صحيحة" };
  }

  if (lat < -90 || lat > 90) {
    return { isValid: false, error: "خط العرض غير صحيح" };
  }

  if (lng < -180 || lng > 180) {
    return { isValid: false, error: "خط الطول غير صحيح" };
  }

  return { isValid: true };
}

/**
 * Validate and sanitize notes
 */
export function validateNotes(notes?: string): {
  isValid: boolean;
  sanitized?: string;
  error?: string;
} {
  if (!notes) {
    return { isValid: true, sanitized: "" };
  }

  if (typeof notes !== "string") {
    return { isValid: false, error: "الملاحظات غير صحيحة" };
  }

  const trimmed = notes.trim();

  if (trimmed.length > 500) {
    return { isValid: false, error: "الملاحظات طويلة جداً (500 حرف كحد أقصى)" };
  }

  // Sanitize
  const sanitized = trimmed
    .replace(/[<>'"]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "");

  return { isValid: true, sanitized };
}

/**
 * Validate phone number (Syrian format)
 */
export function validatePhone(phone: string): {
  isValid: boolean;
  error?: string;
} {
  if (!phone || typeof phone !== "string") {
    return { isValid: false, error: "رقم الهاتف مطلوب" };
  }

  // Remove spaces, dashes, etc.
  const cleaned = phone.replace(/[\s\-()]/g, "");

  // Syrian phone format: 09xxxxxxxx (10 digits starting with 09)
  const phoneRegex = /^09\d{8}$/;

  if (!phoneRegex.test(cleaned)) {
    return { isValid: false, error: "رقم الهاتف يجب أن يكون بصيغة 09xxxxxxxx" };
  }

  return { isValid: true };
}

/**
 * Validate email
 */
export function validateEmail(email: string): {
  isValid: boolean;
  error?: string;
} {
  if (!email || typeof email !== "string") {
    return { isValid: false, error: "البريد الإلكتروني مطلوب" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { isValid: false, error: "صيغة البريد الإلكتروني غير صحيحة" };
  }

  return { isValid: true };
}

/**
 * Validate price
 */
export function validatePrice(price: number): {
  isValid: boolean;
  error?: string;
} {
  if (typeof price !== "number" || isNaN(price)) {
    return { isValid: false, error: "السعر غير صحيح" };
  }

  if (price < 0) {
    return { isValid: false, error: "السعر يجب أن يكون أكبر من أو يساوي صفر" };
  }

  if (price > 100000000) {
    return { isValid: false, error: "السعر كبير جداً" };
  }

  return { isValid: true };
}

/**
 * Validate quantity - UPDATED with cart limits
 * Uses the configurable MAX_QUANTITY_PER_PRODUCT from cart-limits.config
 */
export function validateQuantity(qty: number): {
  isValid: boolean;
  error?: string;
} {
  if (typeof qty !== "number" || isNaN(qty) || !Number.isInteger(qty)) {
    return { isValid: false, error: "الكمية غير صحيحة" };
  }

  if (qty < 1) {
    return { isValid: false, error: "الكمية يجب أن تكون 1 على الأقل" };
  }

  // Use the configurable limit instead of hardcoded 100
  if (qty > CART_LIMITS.MAX_QUANTITY_PER_PRODUCT) {
    return { 
      isValid: false, 
      error: CART_LIMIT_MESSAGES.MAX_QUANTITY_PER_PRODUCT 
    };
  }

  return { isValid: true };
}

/**
 * NEW: Validate cart totals before checkout
 */
export function validateCartTotals(
  totalItems: number,
  totalPrice: number
): {
  isValid: boolean;
  error?: string;
} {
  // Check total items limit
  if (totalItems > CART_LIMITS.MAX_TOTAL_ITEMS) {
    return {
      isValid: false,
      error: CART_LIMIT_MESSAGES.MAX_TOTAL_ITEMS,
    };
  }

  // Check max order value
  if (totalPrice > CART_LIMITS.MAX_ORDER_VALUE_SYP) {
    return {
      isValid: false,
      error: CART_LIMIT_MESSAGES.MAX_ORDER_VALUE,
    };
  }

  // Check min order value (if applicable)
  if (totalPrice < CART_LIMITS.MIN_ORDER_VALUE_SYP) {
    return {
      isValid: false,
      error: CART_LIMIT_MESSAGES.MIN_ORDER_VALUE,
    };
  }

  return { isValid: true };
}

/**
 * Sanitize general input
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[<>'"]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .slice(0, 1000);
}

/**
 * Validate image file for upload
 */
export function validateImageFile(file: File): {
  isValid: boolean;
  error?: string;
} {
  if (!file) {
    return { isValid: false, error: "الملف مطلوب" };
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { isValid: false, error: "حجم الملف كبير جداً (الحد الأقصى 5 ميغابايت)" };
  }

  // Check file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: "نوع الملف غير مدعوم (يجب أن يكون JPEG أو PNG أو WebP)",
    };
  }

  return { isValid: true };
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFileName(originalName: string, prefix?: string): string {
  // Get file extension
  const ext = originalName.split(".").pop()?.toLowerCase() || "jpg";

  // Generate timestamp
  const timestamp = Date.now();

  // Generate random string
  const random = Math.random().toString(36).substring(2, 10);

  // Combine with optional prefix
  const safeName = prefix
    ? `${prefix}_${timestamp}_${random}.${ext}`
    : `${timestamp}_${random}.${ext}`;

  // Remove any dangerous characters
  return safeName.replace(/[^a-zA-Z0-9._-]/g, "");
}
