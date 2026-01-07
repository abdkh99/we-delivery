import { createBrowserClient } from "@supabase/ssr";

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
    } as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(url, key);
}
