-- Link OWNERR OS founder submissions to Supabase Auth users (source of truth for analytics hydration).

alter table public.founder_submissions
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create index if not exists founder_submissions_auth_user_created_idx
  on public.founder_submissions (auth_user_id, created_at desc)
  where auth_user_id is not null;

create policy "Users read own founder submissions by auth"
  on public.founder_submissions for select
  using (auth_user_id is not null and auth_user_id = auth.uid());

create policy "Users update own founder submissions by auth"
  on public.founder_submissions for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());
