-- 0026 — Users choose their own @handle (Luca's decision, 15 Nov 2026), within rules.
-- The handle stays the ONLY public identity (principle 1); the generated animale.colore is the default.

-- ---------------------------------------------------------------- format: the single rule
-- 3-20 chars of a-z 0-9 . _ ; starts with a letter (so never only digits); ends with a letter or digit;
-- no "..". The client mirrors it in src/features/profile/domain/handle.ts with the same test cases.
create or replace function private.is_valid_handle(p_handle text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p_handle ~ '^[a-z][a-z0-9._]{1,18}[a-z0-9]$' and position('..' in p_handle) = 0, false)
$$;
comment on function private.is_valid_handle(text) is 'Format rule of the public @handle (pure, no data access).';

create or replace function private.normalize_handle(p_handle text) returns text
language sql immutable set search_path = '' as $$
  select lower(btrim(coalesce(p_handle, '')))
$$;

-- Handles already generated as animale.colore[digits] stay valid even if the longest ones exceed 20 chars
-- (the old shape is accepted by the table check); new generated handles are kept within 20 below.
alter table public.profiles drop constraint profiles_handle_check;
alter table public.profiles add constraint profiles_handle_format
  check (private.is_valid_handle(handle) or handle ~ '^[a-z]+\.[a-z]+[0-9]*$');

create or replace function public.generate_handle() returns text
language plpgsql volatile security definer set search_path = public, private as $$
declare
  v_handle text;
  v_attempt int := 0;
begin
  loop
    v_handle := (select word from private.handle_animals order by random() limit 1)
      || '.' || (select word from private.handle_colors order by random() limit 1);
    -- after many collisions (space nearly full) fall back to a numeric suffix
    if v_attempt >= 20 then
      v_handle := v_handle || (10 + floor(random() * 990))::int;
    end if;
    v_attempt := v_attempt + 1;
    -- the user-chosen format allows at most 20 characters: draw again rather than truncate
    continue when char_length(v_handle) > 20;
    exit when not exists (select 1 from public.profiles where handle = v_handle);
  end loop;
  return v_handle;
end $$;
comment on function public.generate_handle() is
  'Privacy: returns a random animale.colore handle (max 20 chars), the only public identity; reveals nothing about the user.';

-- ---------------------------------------------------------------- blocklist
create table private.handle_blocklist (
  term text primary key check (term ~ '^[a-z]+$'),
  kind text not null check (kind in ('reserved', 'banned'))
);
comment on table private.handle_blocklist is
  'reserved: exact match or prefix of the handle stripped of . _ and digits. banned: substring of it. '
  'Minimal seed (terms of 4+ letters to avoid false positives): extend it in prompt 16 (moderation).';
insert into private.handle_blocklist (term, kind) values
  ('rightplace', 'reserved'), ('admin', 'reserved'), ('support', 'reserved'), ('help', 'reserved'),
  ('staff', 'reserved'), ('moderator', 'reserved'), ('mod', 'reserved'), ('official', 'reserved'),
  ('team', 'reserved'), ('system', 'reserved'), ('root', 'reserved'), ('null', 'reserved'),
  ('undefined', 'reserved'),
  ('fuck', 'banned'), ('shit', 'banned'), ('cunt', 'banned'), ('nigger', 'banned'), ('faggot', 'banned'),
  ('bitch', 'banned'), ('whore', 'banned'), ('retard', 'banned'), ('hitler', 'banned'),
  ('cazzo', 'banned'), ('merda', 'banned'), ('stronzo', 'banned'), ('puttana', 'banned'),
  ('troia', 'banned'), ('vaffanculo', 'banned'), ('frocio', 'banned'), ('minchia', 'banned');

create or replace function private.handle_blocked(p_handle text) returns boolean
language sql stable set search_path = '' as $$
  with s as (select regexp_replace(lower(p_handle), '[._0-9]', '', 'g') as v)
  select exists (
    select 1 from private.handle_blocklist b, s
     where (b.kind = 'reserved' and s.v like b.term || '%')
        or (b.kind = 'banned' and position(b.term in s.v) > 0)
  )
$$;
comment on function private.handle_blocked(text) is 'True when the handle contains a reserved name or a banned word.';

-- ---------------------------------------------------------------- RPCs
create or replace function public.is_handle_available(p_handle text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_handle text := private.normalize_handle(p_handle);
begin
  if not private.is_valid_handle(v_handle) then return 'invalid'; end if;
  if private.handle_blocked(v_handle) then return 'not_allowed'; end if;
  if exists (select 1 from public.profiles where handle = v_handle and id <> v_me) then return 'taken'; end if;
  return 'available';
end $$;
comment on function public.is_handle_available(text) is
  'Privacy: says only whether a handle can be claimed, which handle search already reveals; authenticated only.';

create or replace function public.set_handle(p_handle text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_handle text := private.normalize_handle(p_handle);
  v_current text;
  v_changed_at timestamptz;
begin
  if not private.is_valid_handle(v_handle) then
    raise exception 'INVALID_HANDLE' using errcode = 'P0001';
  end if;
  if private.handle_blocked(v_handle) then
    raise exception 'HANDLE_NOT_ALLOWED' using errcode = 'P0001';
  end if;
  select handle, handle_changed_at into v_current, v_changed_at from public.profiles where id = v_me for update;
  if v_current = v_handle then return v_handle; end if;
  -- profiles has no "completed" column and the handle step comes right after complete_profile, so the limit
  -- applies from the first change on: handle_changed_at is null only until the first choice.
  if v_changed_at is not null and v_changed_at > now() - interval '30 days' then
    raise exception 'HANDLE_CHANGE_TOO_SOON' using errcode = 'P0001';
  end if;
  begin
    update public.profiles set handle = v_handle, handle_changed_at = now() where id = v_me;
  exception when unique_violation then
    raise exception 'HANDLE_TAKEN' using errcode = 'P0001';
  end;
  return v_handle;
end $$;
comment on function public.set_handle(text) is
  'Privacy: the handle is the only public identity (the client warns not to use a real name); one change every 30 days, '
  'reserved and banned words refused, uniqueness case-insensitive because handles are stored lowercase.';

create or replace function public.regenerate_handle() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_changed_at timestamptz;
  v_handle text;
begin
  select handle_changed_at into v_changed_at from public.profiles where id = v_me for update;
  if v_changed_at is not null and v_changed_at > now() - interval '30 days' then
    raise exception 'HANDLE_CHANGE_TOO_SOON' using errcode = 'P0001';
  end if;
  v_handle := public.generate_handle();
  update public.profiles set handle = v_handle, handle_changed_at = now() where id = v_me;
  return v_handle;
end $$;
comment on function public.regenerate_handle() is
  'Privacy: swaps the caller''s public handle for a random animale.colore, at most once every 30 days; no personal data involved.';

-- is_valid_handle backs a table check that runs for every profile update made by a client, so authenticated needs it
-- (pure function, no data access); the rest stays private.
revoke all on function private.normalize_handle(text), private.handle_blocked(text) from public, anon, authenticated;
revoke all on function private.is_valid_handle(text) from public, anon;
grant execute on function private.is_valid_handle(text) to authenticated;
revoke all on table private.handle_blocklist from public, anon, authenticated;
revoke all on function public.is_handle_available(text), public.set_handle(text) from public, anon;
grant execute on function public.is_handle_available(text), public.set_handle(text) to authenticated, service_role;
revoke all on function public.regenerate_handle() from public, anon;
grant execute on function public.regenerate_handle() to authenticated, service_role;
