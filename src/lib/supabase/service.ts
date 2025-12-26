import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let cachedClient: SupabaseClient<Database> | null = null;

interface ServiceClientOptions {
  required?: boolean;
}

export function getServiceSupabaseClient(
  options: ServiceClientOptions = {}
): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    if (options.required) {
      throw new Error(
        "Supabase service role key is missing. Set SUPABASE_SERVICE_ROLE_KEY in your environment."
      );
    }
    console.warn(
      "[currency] Service role client not configured. Set SUPABASE_SERVICE_ROLE_KEY to enable automatic pricing sync."
    );
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient<Database>(url, serviceKey, {
      auth: { persistSession: false },
    });
  }

  return cachedClient;
}

