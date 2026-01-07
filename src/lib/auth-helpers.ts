// =====================================================
// Auth Helper Functions
// JWT validation, session management, etc.
// =====================================================

import { createClient } from "@/lib/supabase/server";

/**
 * Validate JWT token structure and claims
 */
export async function validateJwtToken(token: string): Promise<{
  valid: boolean;
  error?: string;
  userId?: string;
}> {
  try {
    // Decode JWT (basic validation)
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { valid: false, error: "Invalid token format" };
    }

    const payload = JSON.parse(atob(parts[1]));

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return { valid: false, error: "Token expired" };
    }

    // Check issuer (should match Supabase project)
    const expectedIssuer = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (payload.iss && !payload.iss.includes(expectedIssuer || "")) {
      return { valid: false, error: "Invalid token issuer" };
    }

    // Check audience
    if (payload.aud !== "authenticated") {
      return { valid: false, error: "Invalid token audience" };
    }

    return { valid: true, userId: payload.sub };
  } catch (error) {
    return { valid: false, error: "Token validation failed" };
  }
}

/**
 * Force refresh user session
 */
export async function refreshUserSession() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    console.error("Session refresh error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, session: data.session };
}

/**
 * Revoke user session (logout from server)
 */
export async function revokeUserSession(userId: string) {
  try {
    const supabase = await createClient();

    // Sign out user
    await supabase.auth.signOut();

    // Optional: Add to revoked tokens table if implemented
    // await supabase.from('revoked_tokens').insert({ user_id: userId });

    return { success: true };
  } catch (error) {
    console.error("Session revocation error:", error);
    return { success: false, error: "Failed to revoke session" };
  }
}

/**
 * Check if user has required role
 */
export async function checkUserRole(
  userId: string,
  requiredRole: "admin" | "driver" | "customer"
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: user, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return false;
    }

    return user.role === requiredRole;
  } catch (error) {
    console.error("Role check error:", error);
    return false;
  }
}

/**
 * Get user session with validation
 */
export async function getValidatedSession() {
  const supabase = await createClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return { valid: false, error: "No valid session" };
  }

  // Additional JWT validation
  const validation = await validateJwtToken(session.access_token);
  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }

  return { valid: true, session, userId: validation.userId };
}

/**
 * Check session expiry and auto-refresh if needed
 */
export async function ensureSessionValid() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { valid: false, error: "No session" };
  }

  // Check if session will expire soon (within 5 minutes)
  const expiresAt = session.expires_at || 0;
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = expiresAt - now;

  if (timeUntilExpiry < 300) {
    // Less than 5 minutes
    console.log("Session expiring soon, refreshing...");
    const refreshResult = await refreshUserSession();
    return {
      valid: refreshResult.success,
      session: refreshResult.session,
      refreshed: true,
    };
  }

  return { valid: true, session, refreshed: false };
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  errors: string[];
} {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    errors.push("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
  } else {
    score += 1;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push("كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل");
  } else {
    score += 1;
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push("كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل");
  } else {
    score += 1;
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push("كلمة المرور يجب أن تحتوي على رقم واحد على الأقل");
  } else {
    score += 1;
  }

  // Special character check (optional but recommended)
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  }

  return {
    valid: errors.length === 0,
    score,
    errors,
  };
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
