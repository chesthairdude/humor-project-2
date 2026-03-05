"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ next = "/admin" }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onGoogleSignIn() {
    setError("");
    setLoading(true);
    console.log("[AUTH] Login attempt started", { provider: "google" });

    const supabase = createClient();
    const safeNext = next.startsWith("/") ? next : "/admin";
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", safeNext);

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() }
    });
    console.log("[AUTH] signInWithOAuth result", {
      provider: "google",
      redirectTo: callbackUrl.toString(),
      error: signInError?.message
    });

    if (signInError) {
      console.log("[AUTH] About to stay on login due to OAuth error");
      setLoading(false);
      setError(signInError.message);
    }
  }

  return (
    <div className="inline">
      <button type="button" onClick={onGoogleSignIn} disabled={loading}>
        {loading ? "Redirecting..." : "Continue with Google"}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
