// =====================================================
// Rate Limiting Utilities
// Prevent brute-force and abuse attacks
// =====================================================

import { createClient } from "@/lib/supabase/server";

/**
 * Simple in-memory rate limiter
 * For production, use Redis or similar
 */
class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();

  /**
   * Check if request is allowed
   * @param key - unique identifier (e.g., IP address, user ID)
   * @param limit - max requests allowed
   * @param windowMs - time window in milliseconds
   */
  async check(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests for this key
    const requests = this.requests.get(key) || [];

    // Filter out old requests outside the window
    const recentRequests = requests.filter((time) => time > windowStart);

    // Check if limit exceeded
    if (recentRequests.length >= limit) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup(windowStart);
    }

    return true;
  }

  private cleanup(before: number) {
    for (const [key, requests] of this.requests.entries()) {
      const recentRequests = requests.filter((time) => time > before);
      if (recentRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentRequests);
      }
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string) {
    this.requests.delete(key);
  }
}

// Global rate limiter instance
const rateLimiter = new InMemoryRateLimiter();

/**
 * Rate limit presets
 */
export const RateLimits = {
  // Authentication endpoints
  AUTH: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes

  // API endpoints
  API_STRICT: { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  API_NORMAL: { limit: 30, windowMs: 60 * 1000 }, // 30 requests per minute
  API_RELAXED: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute

  // Admin endpoints
  ADMIN: { limit: 50, windowMs: 60 * 1000 }, // 50 requests per minute
};

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
  identifier: string,
  preset: { limit: number; windowMs: number } = RateLimits.API_NORMAL
): Promise<{ allowed: boolean; remaining?: number }> {
  const allowed = await rateLimiter.check(
    identifier,
    preset.limit,
    preset.windowMs
  );

  return { allowed };
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: Request): string {
  // Try various headers
  const headers = request.headers;
  
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) {
    return xRealIp;
  }

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return "unknown";
}

/**
 * Log login attempt to database
 */
export async function logLoginAttempt(params: {
  username: string;
  success: boolean;
  ipAddress: string;
  errorMessage?: string;
  userAgent?: string;
}) {
  try {
    const supabase = await createClient();

    await supabase.from("login_attempts").insert({
      username: params.username,
      ip_address: params.ipAddress,
      success: params.success,
      error_message: params.errorMessage || null,
      user_agent: params.userAgent || null,
    });
  } catch (error) {
    console.error("Failed to log login attempt:", error);
  }
}

/**
 * Check if IP is blocked due to too many failed attempts
 */
export async function isIpBlocked(ipAddress: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("is_ip_rate_limited", {
      p_ip_address: ipAddress,
      p_window_minutes: 15,
      p_max_attempts: 5,
    });

    if (error) {
      console.error("Error checking IP block status:", error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error("Failed to check IP block status:", error);
    return false;
  }
}

/**
 * Reset rate limit for identifier
 */
export function resetRateLimit(identifier: string) {
  rateLimiter.reset(identifier);
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (request: Request, ...args: any[]) => Promise<Response>,
  preset: { limit: number; windowMs: number } = RateLimits.API_NORMAL
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (request: Request, ...args: any[]): Promise<Response> => {
    const ip = getClientIp(request);
    const { allowed } = await checkRateLimit(ip, preset);

    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil(preset.windowMs / 1000).toString(),
          },
        }
      );
    }

    return handler(request, ...args);
  };
}
