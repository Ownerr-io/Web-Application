-- Allow authenticated users to manage their own app memberships (Supabase BaaS; no separate API).

drop policy if exists "user_app_access_insert_own" on public.user_app_access;
create policy "user_app_access_insert_own"
  on public.user_app_access
  for insert
  to authenticated
  with check (auth_user_id = auth.uid());

drop policy if exists "user_app_access_update_own" on public.user_app_access;
create policy "user_app_access_update_own"
  on public.user_app_access
  for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());
