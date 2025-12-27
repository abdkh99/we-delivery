import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn(
      "Supabase URL and Key are not configured. Please set up your .env.local file."
    );
    // Return a mock client for development
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () =>
          Promise.resolve({
            data: { user: null },
            error: { message: "Supabase not configured" },
          }),
        signUp: () =>
          Promise.resolve({
            data: { user: null },
            error: { message: "Supabase not configured" },
          }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        exchangeCodeForSession: () =>
          Promise.resolve({
            data: { user: null, session: null },
            error: { message: "Supabase not configured" },
          }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: null,
                error: { message: "Supabase not configured" },
              }),
          }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        insert: () =>
          Promise.resolve({
            data: null,
            error: { message: "Supabase not configured" },
          }),
        update: () => ({
          eq: () =>
            Promise.resolve({ error: { message: "Supabase not configured" } }),
        }),
      }),
    } as ReturnType<typeof createBrowserClient<Database>>;
  }

  // ✅ تكوين صحيح للـ client مع session persistence
  return createBrowserClient<Database>(url, key, {
    auth: {
      // ✅ استخدام localStorage للـ session storage
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'sb-auth-token',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    cookies: {
      get(name: string) {
        // Browser cookies handling
        if (typeof document === 'undefined') return undefined;
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [cookieName, ...cookieValue] = cookie.split('=');
          if (cookieName.trim() === name) {
            return cookieValue.join('=');
          }
        }
        return undefined;
      },
      set(name: string, value: string, options: { maxAge?: number; path?: string }) {
        if (typeof document === 'undefined') return;
        const cookieOptions = [
          `${name}=${value}`,
          `path=${options.path || '/'}`,
          options.maxAge ? `max-age=${options.maxAge}` : '',
          'SameSite=Lax',
        ]
          .filter(Boolean)
          .join('; ');
        document.cookie = cookieOptions;
      },
      remove(name: string, options: { path?: string }) {
        if (typeof document === 'undefined') return;
        document.cookie = `${name}=; path=${options.path || '/'}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      },
    },
  });
}
