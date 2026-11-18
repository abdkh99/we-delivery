import { createBrowserClient } from "@supabase/ssr";

/**
 * Enhanced fetch with timeout for slow connections
 */
function createFetchWithTimeout(timeout: number = 30000) {
  return async (url: RequestInfo | URL, options: RequestInit = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى");
      }
      throw error;
    }
  };
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Fail loudly: a silent mock client made the site render empty pages
    // (no products, "Supabase not configured") instead of showing the real problem.
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Set them in .env.local (local) or Vercel > Settings > Environment Variables, then redeploy."
    );
  }

  // 🔥 FIX: Create client with custom fetch that has timeout
  // This helps with slow internet connections
  return createBrowserClient(url, key, {
    global: {
      fetch: createFetchWithTimeout(30000), // 30 seconds timeout
    },
  });
}
