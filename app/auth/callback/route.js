import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") ? next : "/admin";
  console.log("[CALLBACK] code exists:", Boolean(code));
  console.log("[CALLBACK] next param:", next);

  if (!code) {
    console.log("[CALLBACK] Code missing or exchange failed");
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  console.log("[CALLBACK] session exchange result:", {
    userId: data?.user?.id,
    error: error?.message
  });

  if (error || !data?.user) {
    console.log("[CALLBACK] Code missing or exchange failed");
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", data.user.id)
    .single();

  console.log("[CALLBACK] profile fetch:", {
    profile,
    error: profileError?.message
  });

  if (profileError || !profile?.is_superadmin) {
    console.log("[CALLBACK] Not superadmin - blocking");
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=unauthorized", origin));
  }

  console.log("[CALLBACK] Superadmin confirmed - redirecting to:", safeNext);
  return NextResponse.redirect(new URL(safeNext, origin));
}
