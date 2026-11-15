-- 0028 — Every user, existing accounts included, can change the @handle once right after onboarding (Luca's decision):
-- the backfill of 0027 started their 30-day limit at handle_confirmed_at, which locked them out.
-- profiles.handle_free_change_used tracks that single free change; afterwards the 30-day limit applies as before.

alter table public.profiles add column handle_free_change_used boolean not null default false;
comment on column public.profiles.handle_free_change_used is
  'false = the one free @handle change after onboarding is still available (no 30-day wait); set by set_handle/regenerate_handle. Own row only.';

create or replace function public.set_handle(p_handle text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_handle text := private.normalize_handle(p_handle);
  v_current text;
  v_changed_at timestamptz;
  v_confirmed_at timestamptz;
  v_free_used boolean;
begin
  if not private.is_valid_handle(v_handle) then
    raise exception 'INVALID_HANDLE' using errcode = 'P0001';
  end if;
  if private.handle_blocked(v_handle) then
    raise exception 'HANDLE_NOT_ALLOWED' using errcode = 'P0001';
  end if;
  select handle, handle_changed_at, handle_confirmed_at, handle_free_change_used
    into v_current, v_changed_at, v_confirmed_at, v_free_used
    from public.profiles where id = v_me for update;
  if v_current = v_handle then return v_handle; end if;
  -- onboarding: free. After it: one free change, then one every 30 days.
  if v_confirmed_at is not null and v_free_used
     and v_changed_at is not null and v_changed_at > now() - interval '30 days' then
    raise exception 'HANDLE_CHANGE_TOO_SOON' using errcode = 'P0001';
  end if;
  begin
    update public.profiles
       set handle = v_handle,
           handle_changed_at = case when v_confirmed_at is null then handle_changed_at else now() end,
           handle_free_change_used = handle_free_change_used or v_confirmed_at is not null
     where id = v_me;
  exception when unique_violation then
    raise exception 'HANDLE_TAKEN' using errcode = 'P0001';
  end;
  return v_handle;
end $$;
comment on function public.set_handle(text) is
  'Privacy: the handle is the only public identity (the client warns not to use a real name); free until confirm_handle(), '
  'then one free change, then one every 30 days; reserved and banned words refused, uniqueness case-insensitive because handles are stored lowercase.';

create or replace function public.regenerate_handle() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_changed_at timestamptz;
  v_confirmed_at timestamptz;
  v_free_used boolean;
  v_handle text;
begin
  select handle_changed_at, handle_confirmed_at, handle_free_change_used
    into v_changed_at, v_confirmed_at, v_free_used
    from public.profiles where id = v_me for update;
  if v_confirmed_at is not null and v_free_used
     and v_changed_at is not null and v_changed_at > now() - interval '30 days' then
    raise exception 'HANDLE_CHANGE_TOO_SOON' using errcode = 'P0001';
  end if;
  v_handle := public.generate_handle();
  update public.profiles
     set handle = v_handle,
         handle_changed_at = case when v_confirmed_at is null then handle_changed_at else now() end,
         handle_free_change_used = handle_free_change_used or v_confirmed_at is not null
   where id = v_me;
  return v_handle;
end $$;
comment on function public.regenerate_handle() is
  'Privacy: swaps the caller''s public handle for a random animale.colore, free until confirm_handle(), then one free change, then at most once every 30 days; no personal data involved.';
