import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/admin";
  const safeNext = next.startsWith("/") ? next : "/admin";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("OAuth code exchange error:", error.message);
      return NextResponse.redirect(new URL("/login?error=oauth_exchange_failed", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
