import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn(
      "Supabase URL and Key are not configured. Please set up your .env.local file."
    );
    // Return a mock client for development that supports common chain methods
    const mockFrom = () => {
      // Small, local types for the chainable interface
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {
        _selected: false,
        select(selectStr?: string) {
          this._selected = true;
          this._selectStr = selectStr;
          return this;
        },
        eq(column: string, value: unknown) {
          this._eq = { column, value };
          return this;
        },
        order(column: string, opts?: unknown) {
          this._order = { column, opts };
          return this;
        },
        async then(
          resolve: (value: unknown) => unknown,
          reject: (reason?: unknown) => unknown
        ) {
          // Support awaiting the chain directly
          try {
            const result = { data: [], error: null };
            // resolve may return a value or promise
            return resolve(result);
          } catch (e) {
            return reject(e as unknown);
          }
        },
        // also support calling as a function that returns a Promise
        async execute() {
          return { data: [], error: null };
        },
      };

      // Provide methods that return a promise when invoked directly
      return {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        select: (_sel?: string) => Promise.resolve({ data: [], error: null }),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        insert: (_payload?: unknown) =>
          Promise.resolve({
            data: null,
            error: { message: "Supabase not configured" },
          }),
        update: () => ({
          eq: () =>
            Promise.resolve({ error: { message: "Supabase not configured" } }),
        }),
        // chained interface
        ...chain,
      };
    };

    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        exchangeCodeForSession: () =>
          Promise.resolve({
            data: { user: null, session: null },
            error: { message: "Supabase not configured" },
          }),
      },
      from: mockFrom,
      rpc: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
    };
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
