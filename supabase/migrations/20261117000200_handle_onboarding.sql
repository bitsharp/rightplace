-- 0027 — The @handle is free during onboarding (Luca's decision): the 30-day limit starts at "Continua", not at the first choice.
-- profiles.handle_confirmed_at is null until the user confirms the handle in the onboarding step.

alter table public.profiles add column handle_confirmed_at timestamptz;
comment on column public.profiles.handle_confirmed_at is
  'null = handle not confirmed yet (onboarding: free changes, no 30-day limit); set by confirm_handle(), which also starts the limit.';

-- Profiles that already went past onboarding: "completed" means complete_profile ran, i.e. birth_date is not null
-- (it is also what the client uses to leave the profile-setup step). Their handle counts as confirmed at the last
-- change, or at creation if they never changed it, so their current limit is unchanged.
update public.profiles
   set handle_confirmed_at = coalesce(handle_changed_at, created_at)
 where handle_confirmed_at is null and birth_date is not null;

create or replace function public.set_handle(p_handle text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_handle text := private.normalize_handle(p_handle);
  v_current text;
  v_changed_at timestamptz;
  v_confirmed_at timestamptz;
begin
  if not private.is_valid_handle(v_handle) then
    raise exception 'INVALID_HANDLE' using errcode = 'P0001';
  end if;
  if private.handle_blocked(v_handle) then
    raise exception 'HANDLE_NOT_ALLOWED' using errcode = 'P0001';
  end if;
  select handle, handle_changed_at, handle_confirmed_at into v_current, v_changed_at, v_confirmed_at
    from public.profiles where id = v_me for update;
  if v_current = v_handle then return v_handle; end if;
  -- until confirm_handle() the handle is free: no limit and the limit clock does not start
  if v_confirmed_at is not null and v_changed_at is not null and v_changed_at > now() - interval '30 days' then
    raise exception 'HANDLE_CHANGE_TOO_SOON' using errcode = 'P0001';
  end if;
  begin
    update public.profiles
       set handle = v_handle,
           handle_changed_at = case when v_confirmed_at is null then handle_changed_at else now() end
     where id = v_me;
  exception when unique_violation then
    raise exception 'HANDLE_TAKEN' using errcode = 'P0001';
  end;
  return v_handle;
end $$;
comment on function public.set_handle(text) is
  'Privacy: the handle is the only public identity (the client warns not to use a real name); free until confirm_handle(), '
  'then one change every 30 days; reserved and banned words refused, uniqueness case-insensitive because handles are stored lowercase.';

create or replace function public.regenerate_handle() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_changed_at timestamptz;
  v_confirmed_at timestamptz;
  v_handle text;
begin
  select handle_changed_at, handle_confirmed_at into v_changed_at, v_confirmed_at
    from public.profiles where id = v_me for update;
  if v_confirmed_at is not null and v_changed_at is not null and v_changed_at > now() - interval '30 days' then
    raise exception 'HANDLE_CHANGE_TOO_SOON' using errcode = 'P0001';
  end if;
  v_handle := public.generate_handle();
  update public.profiles
     set handle = v_handle,
         handle_changed_at = case when v_confirmed_at is null then handle_changed_at else now() end
   where id = v_me;
  return v_handle;
end $$;
comment on function public.regenerate_handle() is
  'Privacy: swaps the caller''s public handle for a random animale.colore, free until confirm_handle(), then at most once every 30 days; no personal data involved.';

create or replace function public.confirm_handle() returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := private.require_user();
begin
  -- idempotent: only the first call confirms and starts the 30-day limit
  update public.profiles
     set handle_confirmed_at = now(), handle_changed_at = now()
   where id = v_me and handle_confirmed_at is null;
end $$;
comment on function public.confirm_handle() is
  'Privacy: ends the free-choice window of the onboarding for the caller''s own handle and starts the 30-day limit; returns nothing, idempotent.';

revoke all on function public.confirm_handle() from public, anon;
grant execute on function public.confirm_handle() to authenticated, service_role;
