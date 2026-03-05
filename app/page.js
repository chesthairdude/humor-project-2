import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const code = params?.code;

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  redirect("/admin");
}
