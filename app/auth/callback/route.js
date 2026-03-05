import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    console.log("[CALLBACK] No code present");
    return NextResponse.redirect(new URL("/login?error=no_code", origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        }
      }
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  console.log("[CALLBACK] exchange result:", {
    userId: data?.user?.id,
    error: error?.message
  });

  if (error || !data?.user) {
    return NextResponse.redirect(new URL("/login?error=exchange_failed", origin));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", data.user.id)
    .single();

  console.log("[CALLBACK] profile:", { profile, error: profileError?.message });

  if (profileError || !profile?.is_superadmin) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=unauthorized", origin));
  }

  return NextResponse.redirect(new URL("/admin", origin));
}
