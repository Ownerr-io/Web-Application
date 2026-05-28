# Supabase setup (OWNERR OS founder viral loop)

Project URL: **https://bnzvpkgffeappfxatuyu.supabase.co**

Environment files (repo root):

- `.env.example` — template (safe to commit)
- `.env.local` — local secrets (gitignored)
- `.env.production` — production template (gitignored; copy values into Vercel)

1. Copy `.env.example` → `.env.local` and fill **Database password**, **anon key**, and **service role key** from the Supabase dashboard.
2. Put the **connection string** (URI) into `DATABASE_URL` in `.env.local`.
3. Run the migration in [migrations/20260521120000_founder_viral_system.sql](./migrations/20260521120000_founder_viral_system.sql) via the SQL editor or `supabase db push`.
4. Founder flows use **Supabase RPC** (`founder_track_referral`, `founder_analytics_summary`, etc.). Set admin analytics key in Postgres:
   - `update public.founder_admin_secrets set secret = 'your-key' where id = 1;`
5. Push schema (pick one):
   - **SQL migrations (works with `.env.local`):** `npm run db:migrate`
   - **Supabase CLI:** `supabase login` → `npm run supabase:link` → `npm run supabase:push`
   - **Drizzle sync from TypeScript schema:** `npm run db:push` (loads `DATABASE_URL` from `.env.local`)

`VITE_SUPABASE_URL` (`https://bnzvpkgffeappfxatuyu.supabase.co`) is for the browser REST client. **`db push` / migrations need `DATABASE_URL`** — Postgres URI from **Project Settings → Database → Connection string (URI)**, usually:

`postgresql://postgres:YOUR_PASSWORD@db.bnzvpkgffeappfxatuyu.supabase.co:5432/postgres`

**Local dev:** `npm run dev` (Vite only). No Express API required.

## `supabase link` — “does not have the necessary privileges”

The CLI only links projects **your logged-in Supabase account can see**.

1. See which projects your CLI user has:
   ```bash
   supabase projects list
   ```
2. If `bnzvpkgffeappfxatuyu` is **not** in that table, either:
   - Log in with the account that owns that project: `supabase login` (browser), then retry `npm run supabase:link`, or
   - Ask the project owner to add your email in **Organization → Team**, or
   - Use the project ref you **do** own (e.g. `vjuycltypkgrpmbnhbpu`) and point `.env.local` `DATABASE_URL` / `VITE_SUPABASE_URL` at that project’s settings.
3. You do **not** need `supabase link` if migrations already work via Postgres:
   ```bash
   npm run db:migrate
   ```
   That uses `DATABASE_URL` only (same as the SQL editor / connection string).

Frontend (Vite loads env from repo root via `envDir`):

- `VITE_SUPABASE_URL` — `https://bnzvpkgffeappfxatuyu.supabase.co`
- `VITE_SUPABASE_ANON_KEY` — Project Settings → API
- `VITE_PUBLIC_SITE_URL` — production site origin for referral / OG URLs

Referral URLs: `{PUBLIC_SITE_URL}/join?ref={code}`

## OWNERR Unemployed Network (`/unemployed`)

No Express routes — auth, points, referrals, and MCQ run through **Supabase Auth + RPC**.

1. Apply [migrations/20260522120000_unemployed_network.sql](./migrations/20260522120000_unemployed_network.sql) (`npm run db:migrate` or SQL editor).
2. Frontend env (repo root, loaded by Vite):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_PUBLIC_SITE_URL` — used for referral/share OG URLs
3. Supabase Auth → URL configuration: add redirect URLs for `{origin}/unemployed/dashboard` (Google OAuth).
4. Enable **Email** and **Google** providers in Supabase Auth.
5. Referral landing: `{origin}/unemployed?ref={referral_code}` (stored in `localStorage` until signup).
6. Public share pages: `{origin}/share/unemployed/{username}` (client-side OG tags; crawlers may need a future Edge Function for dynamic previews).

Product routes: `/unemployed`, `/unemployed/login`, `/unemployed/onboarding`, `/unemployed/dashboard`, `/unemployed/leaderboard`.
