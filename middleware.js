import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function middleware(request) {
  console.log("[MIDDLEWARE] Request path:", request.nextUrl.pathname);
  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();
  console.log("[MIDDLEWARE] Has session:", Boolean(user));

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    console.log("[MIDDLEWARE] Redirecting to:", loginUrl.toString());
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Middleware profile fetch error:", profileError.message, { userId: user.id });
  }

  if (!profile) {
    console.error("Middleware profile missing for user:", user.id);
  }
  console.log("[MIDDLEWARE] Profile fetch result", {
    userId: user.id,
    isSuperadmin: Boolean(profile?.is_superadmin),
    error: profileError?.message
  });

  if (!profile?.is_superadmin) {
    const deniedUrl = new URL("/login", request.url);
    deniedUrl.searchParams.set("error", "superadmin_required");
    console.log("[MIDDLEWARE] Redirecting to:", deniedUrl.toString());
    return NextResponse.redirect(deniedUrl);
  }

  console.log("[MIDDLEWARE] Redirecting to: none (allow request)");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"]
};
