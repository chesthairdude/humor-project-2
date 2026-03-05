import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/admin";
  const safeNext = next.startsWith("/") ? next : "/admin";
  console.log("[AUTH] Callback received", {
    hasCode: Boolean(code),
    next,
    safeNext
  });

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    console.log("[AUTH] exchangeCodeForSession result", {
      error: error?.message
    });
    if (error) {
      console.error("OAuth code exchange error:", error.message);
      console.log("[AUTH] About to redirect to:", "/login?error=oauth_exchange_failed");
      return NextResponse.redirect(new URL("/login?error=oauth_exchange_failed", requestUrl.origin));
    }
  }

  console.log("[AUTH] About to redirect to:", safeNext);
  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
