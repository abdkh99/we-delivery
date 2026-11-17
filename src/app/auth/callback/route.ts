import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// منع pre-rendering لهذا route handler
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user profile exists
      const { data: existingProfile } = await supabase
        .from("users")
        .select("id")
        .eq("id", data.user.id)
        .single();

      // Create profile if doesn't exist (for OAuth users)
      if (!existingProfile) {
        const userData = data.user.user_metadata;
        
        // Generate username from email or name
        let username = "";
        if (userData.email) {
          username = userData.email.split("@")[0].toLowerCase();
        } else if (userData.name) {
          username = userData.name.toLowerCase().replace(/\s+/g, "_");
        } else {
          username = `user_${data.user.id.substring(0, 8)}`;
        }

        // Ensure username is unique
        let finalUsername = username;
        let counter = 1;
        while (true) {
          const { data: existingUser } = await supabase
            .from("users")
            .select("username")
            .eq("username", finalUsername)
            .single();

          if (!existingUser) break;
          finalUsername = `${username}${counter}`;
          counter++;
        }

        await supabase.from("users").insert({
          id: data.user.id,
          name: userData.full_name || userData.name || finalUsername,
          username: finalUsername,
          phone: userData.phone || "",
          email: userData.email || "",
          role: "customer",
        });
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/`);
}
