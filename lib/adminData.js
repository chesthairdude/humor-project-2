import { createClient } from "@/lib/supabase/server";

export async function fetchRows(table, limit = 100) {
  const supabase = await createClient();

  let query = supabase.from(table).select("*").limit(limit);
  let result = await query.order("created_at", { ascending: false });

  if (result.error) {
    result = await query;
  }

  if (result.error) {
    return { rows: [], error: result.error.message };
  }

  return { rows: result.data ?? [], error: null };
}

export async function countRows(table) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count ?? 0, error: null };
}

export async function requireSuperadmin() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, isSuperadmin: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_superadmin, username, email")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    isSuperadmin: Boolean(profile?.is_superadmin),
    profile
  };
}
