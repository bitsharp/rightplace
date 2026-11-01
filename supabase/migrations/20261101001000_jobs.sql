-- 0010 — TTL and maintenance jobs (principle 5: deletion is a server job, not a UI promise).
-- pg_cron runs in UTC: 06:00 UTC is 07:00 in Rome in winter and 08:00 in summer.

-- Expired night chats (2 days after the night) and posts (7 days after publication).
create or replace function private.purge_expired_content() returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into private.storage_deletion_queue (bucket_id, object_path)
  select 'chat-photos', m.photo_path
    from public.chat_messages m join public.chat_rooms r on r.id = m.room_id
   where r.expires_at < now() and m.photo_path is not null
  union all
  select 'posts', p.photo_path from public.posts p where p.expires_at < now() and p.photo_path is not null;

  delete from public.chat_rooms where expires_at < now();  -- messages cascade
  delete from public.posts where expires_at < now();       -- likes and comments cascade
end $$;

-- Principle 4: submitted contact hashes live at most 10 minutes.
create or replace function private.purge_contact_hashes() returns void
language sql security definer set search_path = public as $$
  delete from public.contact_hashes_tmp where created_at < now() - interval '10 minutes'
$$;

-- Principle 3: no location history; a coarse position is forgotten after 3 hours.
create or replace function private.expire_coarse_locations() returns void
language sql security definer set search_path = public as $$
  update public.profiles set coarse_location = null, coarse_location_at = null
   where coarse_location_at < now() - interval '3 hours'
$$;

-- Keeps per-night head counts (no user ids) before declarations are deleted.
create or replace function private.snapshot_night_attendance() returns void
language sql security definer set search_path = public as $$
  insert into private.night_attendance (venue_id, night_date, declared)
  select venue_id, night_date, count(*)::int from (
    select n.venue_id, n.night_date
      from public.declarations d join public.nights n on n.id = d.night_id
     where d.expires_at < now()
    union all
    select e.venue_id, public.night_date_at(v.city_id, e.starts_at)
      from public.declarations d join public.events e on e.id = d.event_id join public.venues v on v.id = e.venue_id
     where d.expires_at < now()
  ) expired
   group by venue_id, night_date
  on conflict (venue_id, night_date) do update set declared = greatest(private.night_attendance.declared, excluded.declared)
$$;

create or replace function private.daily_cleanup() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform private.snapshot_night_attendance();
  delete from public.declarations where expires_at < now() - interval '7 days';
  delete from public.search_history h
   using (select user_id, venue_id, row_number() over (partition by user_id order by searched_at desc) as rank
            from public.search_history) ranked
   where h.user_id = ranked.user_id and h.venue_id = ranked.venue_id and ranked.rank > 20;
  delete from private.night_attendance where night_date < current_date - 120;
end $$;

create or replace function private.expire_sponsorships() returns void
language sql security definer set search_path = public as $$
  update public.events set is_sponsored = false where is_sponsored and sponsored_until < now()
$$;

-- Principle 11: the "typical" layer learns from our own history, aggregated and only with k ≥ 3.
-- A declaration says "I'm going tonight", not at what time: each night's count is attributed to the
-- core night hours 21:00–02:59 (21–23 on the night's weekday, 0–2 on the following one).
create or replace function private.refresh_typical_from_history() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform private.snapshot_night_attendance();

  delete from public.night_hour_stats;
  insert into public.night_hour_stats (venue_id, weekday, hour, samples, avg_declared)
  select a.venue_id,
         extract(dow from a.night_date + case when h.hour < 6 then 1 else 0 end)::smallint,
         h.hour::smallint, count(*)::int, avg(a.declared)
    from private.night_attendance a
    cross join (values (21), (22), (23), (0), (1), (2)) as h(hour)
   where a.night_date >= current_date - 56 and a.declared > 0
   group by 1, 2, 3;

  delete from public.venue_typical_busyness where source = 'history';
  insert into public.venue_typical_busyness (venue_id, weekday, hour, level, source)
  select venue_id, weekday, hour, public.level_from_avg(avg_declared), 'history'
    from public.night_hour_stats
   where samples >= 3 and avg_declared >= 3;
end $$;

-- cron.schedule upserts by job name, so re-running this migration is harmless.
select cron.schedule('purge-expired-content', '*/10 * * * *', 'select private.purge_expired_content()');
select cron.schedule('purge-contact-hashes', '*/10 * * * *', 'select private.purge_contact_hashes()');
select cron.schedule('expire-coarse-locations', '0 * * * *', 'select private.expire_coarse_locations()');
select cron.schedule('daily-cleanup', '0 6 * * *', 'select private.daily_cleanup()');
select cron.schedule('expire-sponsorships', '0 5 * * 1', 'select private.expire_sponsorships()');
select cron.schedule('refresh-typical-from-history', '0 6 * * 1', 'select private.refresh_typical_from_history()');
