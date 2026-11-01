-- 0001 — Schema: tables, constraints, indexes, updated_at triggers.
-- Privacy rules (CLAUDE.md principles 1–7, 11) are enforced by the following migrations:
-- RLS (0004), security definer RPCs (0005–0008) and pg_cron TTL jobs (0009).

create extension if not exists postgis with schema extensions;
create extension if not exists pg_cron;

-- Not exposed by PostgREST: internal helpers, jobs and tables no client may touch.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- places

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  country text not null check (char_length(country) = 2),
  center extensions.geography(point, 4326) not null,
  default_zoom smallint not null default 13 check (default_zoom between 3 and 20),
  timezone text not null,
  taxi_phone text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id),
  google_place_id text not null unique,
  name text not null check (char_length(name) between 1 and 120),
  kind text not null check (kind in ('club', 'rooftop', 'bar', 'live', 'other')),
  location extensions.geography(point, 4326) not null,
  address text,
  opening_hours jsonb,
  is_active boolean not null default true,
  places_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index venues_city_idx on public.venues (city_id) where is_active;
create index venues_location_idx on public.venues using gist (location);

-- ---------------------------------------------------------------- people

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z]+\.[a-z]+[0-9]*$'),
  handle_changed_at timestamptz,
  birth_date date,
  gender text check (gender in ('female', 'male', 'other')),
  city_id uuid references public.cities (id),
  locale text not null default 'it' check (locale in ('it', 'en')),
  location_opt_in boolean not null default false,
  contacts_opt_in boolean not null default false,
  is_creator boolean not null default false,
  coarse_location extensions.geography(point, 4326),
  coarse_location_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index profiles_coarse_location_idx on public.profiles using gist (coarse_location);
comment on column public.profiles.birth_date is 'Only used to compute is_adult/age_band. Never returned to other users.';
comment on column public.profiles.coarse_location is 'Rounded to a ~500 m grid, opt-in only, wiped after 3 hours.';

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id, status);
comment on table public.follows is '"Follows" always means status = accepted (principle 6); pending unlocks nothing.';

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

-- ---------------------------------------------------------------- typical layer (principle 11)

create table public.venue_typical_busyness (
  venue_id uuid not null references public.venues (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  hour smallint not null check (hour between 0 and 23),
  level smallint not null check (level between 0 and 3),
  source text not null check (source in ('manual', 'history')),
  updated_at timestamptz not null default now(),
  -- source is part of the key: a history row overrides the manual one without destroying it
  primary key (venue_id, weekday, hour, source)
);

create table public.night_hour_stats (
  venue_id uuid not null references public.venues (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  hour smallint not null check (hour between 0 and 23),
  samples int not null,
  avg_declared numeric not null,
  updated_at timestamptz not null default now(),
  primary key (venue_id, weekday, hour)
);
comment on table public.night_hour_stats is 'Aggregates per venue/weekday/hour only. Never per user.';

-- Per-night declared counts, kept after the declarations themselves are deleted (7 days).
create table private.night_attendance (
  venue_id uuid not null references public.venues (id) on delete cascade,
  night_date date not null,
  declared int not null check (declared >= 0),
  primary key (venue_id, night_date)
);

-- ---------------------------------------------------------------- nights and declarations

create table public.events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  venue_id uuid not null references public.venues (id),
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 1000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  target_age_bands text[] not null default '{}' check (target_age_bands <@ array['18-24', '25-34', '35-44', '45+']),
  target_genders text[] not null default '{}' check (target_genders <@ array['female', 'male', 'other']),
  is_sponsored boolean not null default false,
  sponsored_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index events_venue_idx on public.events (venue_id, starts_at);
create index events_creator_idx on public.events (creator_id, starts_at desc);

create table public.nights (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  night_date date not null,
  unique (venue_id, night_date)
);

create table public.declarations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  night_id uuid references public.nights (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  intent text not null check (intent in ('going', 'maybe')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, night_id),
  unique (user_id, event_id),
  check (num_nonnulls(night_id, event_id) = 1)
);
create index declarations_night_idx on public.declarations (night_id);
create index declarations_event_idx on public.declarations (event_id);
create index declarations_user_active_idx on public.declarations (user_id, expires_at);

-- ---------------------------------------------------------------- chat (TTL 2 days)

create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  night_id uuid unique references public.nights (id) on delete cascade,
  event_id uuid unique references public.events (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(night_id, event_id) = 1)
);
create index chat_rooms_expires_idx on public.chat_rooms (expires_at);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('text', 'photo')),
  text text check (char_length(text) between 1 and 1000),
  photo_path text,
  created_at timestamptz not null default now(),
  check ((kind = 'text' and text is not null) or (kind = 'photo' and photo_path is not null))
);
create index chat_messages_room_idx on public.chat_messages (room_id, created_at);

-- ---------------------------------------------------------------- posts (TTL 7 days)

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  night_id uuid references public.nights (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  photo_path text,
  caption text check (char_length(caption) <= 500),
  visible_from timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (photo_path is not null or caption is not null)
);
create index posts_window_idx on public.posts (visible_from, expires_at);
create index posts_user_idx on public.posts (user_id, visible_from desc);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments (post_id, created_at);

-- ---------------------------------------------------------------- discovery and contacts

create table public.search_history (
  user_id uuid not null references public.profiles (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  searched_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);
create index search_history_recent_idx on public.search_history (user_id, searched_at desc);

-- Lives at most 10 minutes (and is emptied inside match_contacts itself).
create table public.contact_hashes_tmp (
  user_id uuid not null references public.profiles (id) on delete cascade,
  hash text not null check (hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, hash)
);

create table public.phone_hashes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  hash text not null unique check (hash ~ '^[0-9a-f]{64}$')
);

-- ---------------------------------------------------------------- moderation, billing, push

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_kind text not null check (target_kind in ('post', 'message', 'user', 'event')),
  target_id uuid not null,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_open_idx on public.reports (created_at) where resolved_at is null;

create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  provider text not null default 'revenuecat' check (provider in ('revenuecat')),
  product_id text not null,
  status text not null,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table public.push_tokens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

create table private.account_deletion_requests (
  user_id uuid primary key,
  requested_at timestamptz not null default now()
);

-- Storage objects cannot be deleted with SQL on Supabase: an Edge Function drains this queue.
create table private.storage_deletion_queue (
  id bigserial primary key,
  bucket_id text not null,
  object_path text not null,
  queued_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- updated_at

create trigger venues_updated_at before update on public.venues
  for each row execute function private.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger events_updated_at before update on public.events
  for each row execute function private.set_updated_at();
create trigger declarations_updated_at before update on public.declarations
  for each row execute function private.set_updated_at();
create trigger venue_typical_busyness_updated_at before update on public.venue_typical_busyness
  for each row execute function private.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function private.set_updated_at();
create trigger push_tokens_updated_at before update on public.push_tokens
  for each row execute function private.set_updated_at();
