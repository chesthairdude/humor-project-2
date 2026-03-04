import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL;

if (!url || !serviceRoleKey || !email) {
  console.error(
    "Missing env vars. Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOOTSTRAP_ADMIN_EMAIL"
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

let page = 1;
const perPage = 200;
let user = null;

while (!user) {
  const { data: userResult, error: userError } = await admin.auth.admin.listUsers({
    page,
    perPage
  });

  if (userError) {
    console.error("Failed to list users:", userError.message);
    process.exit(1);
  }

  user = userResult.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
  if (user || userResult.users.length < perPage) break;
  page += 1;
}

if (!user) {
  console.error(`No auth user found for email: ${email}`);
  process.exit(1);
}

const { error: upsertError } = await admin.from("profiles").upsert(
  {
    id: user.id,
    email: user.email,
    is_superadmin: true
  },
  { onConflict: "id" }
);

if (upsertError) {
  console.error("Failed to promote profile:", upsertError.message);
  process.exit(1);
}

console.log(`Promoted ${email} (${user.id}) to superadmin.`);
