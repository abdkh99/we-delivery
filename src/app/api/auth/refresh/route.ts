import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Refresh Supabase session cookies.
 *
 * Used by `src/lib/fetcher.ts` when a request returns 401.
 * If the access token is expired but a refresh token is present in cookies,
 * calling `getUser()` will trigger a refresh and update cookies via `@supabase/ssr`.
 */
export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
