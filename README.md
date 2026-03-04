# Humor Project 2 - Admin Area

A fresh Next.js admin app for Supabase with strict superadmin-only access.

## What is implemented

- `/admin` dashboard with creative health stats:
  - row counts (`profiles`, `images`, `captions`)
  - caption coverage signal
  - creator density signal
  - freshness signal from recent activity timestamps
- `/admin/users` read-only view of `profiles`
- `/admin/captions` read-only view of `captions`
- `/admin/images` CRUD management for `images` using JSON payloads

## Security model

All admin routes are protected in two layers:

- `middleware.js` gates `/admin/:path*`
  - requires authenticated Supabase session
  - requires `profiles.is_superadmin === true`
- `app/admin/layout.js` repeats the same superadmin check server-side

No RLS policies are changed by this project.

## Setup

1. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

2. Install and run:

```bash
npm install
npm run dev
```

3. Visit `/login`, sign in, then access `/admin`.

## Solving the superadmin lockout

If your account is not yet superadmin, bootstrap it without changing RLS policies:

```bash
BOOTSTRAP_ADMIN_EMAIL=you@example.com npm run promote:superadmin
```

This script uses `SUPABASE_SERVICE_ROLE_KEY` to upsert your profile with `is_superadmin: true`.
