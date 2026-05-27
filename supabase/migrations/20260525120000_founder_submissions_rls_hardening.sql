-- Lock down founder_submissions and founder_referral_events RLS.
-- App reads/writes submissions and events via API (DATABASE_URL / service role bypasses RLS).
-- Browser Supabase client: authenticated users may only read/update their own linked rows.

-- founder_submissions: remove permissive and duplicate policies
drop policy if exists "Public read founder submissions" on public.founder_submissions;
drop policy if exists "Service insert founder submissions" on public.founder_submissions;
drop policy if exists "Service update founder analytics" on public.founder_submissions;
drop policy if exists "Users read own founder submissions by auth" on public.founder_submissions;
drop policy if exists "Users update own founder submissions by auth" on public.founder_submissions;

create policy "founder_submissions_select_own"
  on public.founder_submissions
  for select
  to authenticated
  using (auth_user_id = auth.uid());

create policy "founder_submissions_update_own"
  on public.founder_submissions
  for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Defense in depth if a future client inserts via Supabase (primary path is API + service role).
create policy "founder_submissions_insert_own"
  on public.founder_submissions
  for insert
  to authenticated
  with check (auth_user_id = auth.uid());

-- founder_referral_events: no anon/authenticated table access (tracking via API only)
drop policy if exists "Public insert referral events" on public.founder_referral_events;
drop policy if exists "Public read referral events" on public.founder_referral_events;
