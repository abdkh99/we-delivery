import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * API endpoint to refresh user session
 * Used by fetcher when encountering 401 errors
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      return NextResponse.json(
        { error: "فشل تحديث الجلسة", message: error?.message },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        access_token: data.session.access_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (error) {
    console.error("Session refresh error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الجلسة" },
      { status: 500 }
    );
  }
}
