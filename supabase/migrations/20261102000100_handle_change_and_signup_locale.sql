-- 0012 — Prompt 05: one-time handle change and sign-up locale.

-- The locale chosen on the sign-up screen travels in auth metadata, so the confirmation email
-- (sent before the profile is completed) can already use it.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_locale text := new.raw_user_meta_data ->> 'locale';
begin
  insert into public.profiles (id, handle, locale)
  values (new.id, public.generate_handle(), case when v_locale in ('it', 'en') then v_locale else 'it' end);
  return new;
end $$;

create or replace function public.regenerate_handle() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_handle text;
begin
  if (select handle_changed_at from public.profiles where id = v_me) is not null then
    raise exception 'HANDLE_ALREADY_CHANGED' using errcode = 'P0001';
  end if;
  v_handle := public.generate_handle();
  update public.profiles set handle = v_handle, handle_changed_at = now() where id = v_me;
  return v_handle;
end $$;
comment on function public.regenerate_handle() is
  'Privacy: swaps the caller''s public handle for another random animale.colore, once; no personal data involved.';

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function public.regenerate_handle() from public, anon;
grant execute on function public.regenerate_handle() to authenticated, service_role;
