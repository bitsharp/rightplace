-- The profile screen must show whether the caller already registered a phone hash, without ever
-- reading the hash back (principle 4): the answer is a single boolean about the caller only.

create or replace function public.has_phone_hash() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.phone_hashes where user_id = private.require_user())
$$;
comment on function public.has_phone_hash() is
  'Privacy: tells the caller only whether they registered a phone hash; never the hash or the number.';

revoke all on function public.has_phone_hash() from public, anon;
grant execute on function public.has_phone_hash() to authenticated, service_role;
