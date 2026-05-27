-- unemployed_profiles already exists as a TABLE (20260526120000 / 20260527130000).
-- Do not create a view with the same name. Backfill rows for users in unemployed_users only.

insert into public.unemployed_profiles (auth_user_id, metadata)
select
  u.auth_user_id,
  jsonb_build_object('unemployed_user_id', u.id::text)
from public.unemployed_users u
where u.auth_user_id is not null
  and not exists (
    select 1
    from public.unemployed_profiles p
    where p.auth_user_id = u.auth_user_id
  );
