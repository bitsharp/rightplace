begin;
\ir helpers/setup.psql
select plan(118);

-- Local-time slots in a city's time zone: a night starts at 22:00 of `p_days` from today and the
-- end hour counts from local midnight of the start day (30 = 06:00 next day, the latest allowed).
create function tests.slot_start(p_tz text, p_days int) returns timestamptz language sql as $$
  select (((now() at time zone p_tz)::date + p_days)::timestamp + interval '22 hours') at time zone p_tz
$$;
create function tests.slot_end(p_tz text, p_days int, p_hour int default 26) returns timestamptz language sql as $$
  select (((now() at time zone p_tz)::date + p_days)::timestamp + make_interval(hours => p_hour)) at time zone p_tz
$$;
create function tests.make_event(p_creator uuid, p_venue uuid, p_starts timestamptz, p_ends timestamptz, p_name text default 'Serata')
returns uuid language sql as $$
  insert into public.events (creator_id, venue_id, name, starts_at, ends_at)
  values (p_creator, p_venue, p_name, p_starts, p_ends) returning id
$$;
create function tests.make_event_crowd(p_event uuid, p_count int, p_intent text default 'going', p_age int default 25, p_gender text default 'female')
returns void language plpgsql as $$
begin
  for i in 1..p_count loop
    insert into public.declarations (user_id, event_id, intent)
    values (tests.create_user(tests.unique_handle('crowd'), p_age, p_gender), p_event, p_intent);
  end loop;
end $$;

-- the slot helpers are called from inside statements that run as `authenticated`
grant usage on schema tests to authenticated;
grant execute on all functions in schema tests to authenticated;

select tests.create_user('lince.rosso') as creator \gset
select tests.create_user('volpe.blu') as fan \gset
select tests.create_user('orso.verde') as friend \gset
select tests.create_user('gatto.nero') as pending_friend \gset
update public.profiles set is_creator = true where id = :'creator';
select tests.make_venue('Arena Club') as milan \gset
select tests.make_venue('Bar Canarias', 'bar', 'las-palmas') as canary \gset
select tests.make_venue('Bar Madrid', 'bar', 'madrid') as inactive_city \gset
select tests.make_venue('Club Chiuso') as closed \gset
update public.venues set is_active = false where id = :'closed';

-- ---------------------------------------------------------------- create_event: who and what

select tests.authenticate_as(:'fan');
select throws_ok(
  format($$ select create_event(%L, 'Notte', null, tests.slot_start('Europe/Rome', 2), tests.slot_end('Europe/Rome', 2)) $$, :'milan'),
  'P0001', 'NOT_CREATOR', 'un utente non creator non può creare serate');

select tests.authenticate_as(:'creator');
select lives_ok(
  format($$ select create_event(%L, '  Notte Techno  ', 'Descrizione', tests.slot_start('Europe/Rome', 2), tests.slot_end('Europe/Rome', 2), array['18-24','35-44'], array['female']) $$, :'milan'),
  'un creator crea una serata valida');
reset role;
select id as first_event from public.events where creator_id = :'creator' \gset
select is((select name from public.events where id = :'first_event'), 'Notte Techno', 'il nome viene ripulito dagli spazi');
select is((select target_age_bands from public.events where id = :'first_event'), array['18-24','35-44'], 'target età salvato');
select is((select target_genders from public.events where id = :'first_event'), array['female'], 'target genere salvato');

select tests.authenticate_as(:'creator');
select throws_ok(
  format($$ select create_event(%L, '   ', null, tests.slot_start('Europe/Rome', 2), tests.slot_end('Europe/Rome', 2)) $$, :'milan'),
  'P0001', 'INVALID_NAME', 'nome vuoto rifiutato');
select throws_ok(
  format($$ select create_event(%L, %L, null, tests.slot_start('Europe/Rome', 2), tests.slot_end('Europe/Rome', 2)) $$, :'milan', repeat('x', 81)),
  'P0001', 'INVALID_NAME', 'nome di 81 caratteri rifiutato');
select lives_ok(
  format($$ select create_event(%L, %L, null, tests.slot_start('Europe/Rome', 3), tests.slot_end('Europe/Rome', 3)) $$, :'milan', repeat('x', 80)),
  'nome di 80 caratteri accettato');
select throws_ok(
  format($$ select create_event(%L, 'Notte', %L, tests.slot_start('Europe/Rome', 2), tests.slot_end('Europe/Rome', 2)) $$, :'milan', repeat('d', 501)),
  'P0001', 'INVALID_DESCRIPTION', 'descrizione di 501 caratteri rifiutata');
select throws_ok(
  format($$ select create_event(%L, 'Notte', null, now() - interval '1 hour', now() + interval '2 hours') $$, :'milan'),
  'P0001', 'INVALID_SCHEDULE', 'inizio nel passato rifiutato');
select throws_ok(
  format($$ select create_event(%L, 'Notte', null, tests.slot_start('Europe/Rome', 2), tests.slot_start('Europe/Rome', 2) - interval '1 hour') $$, :'milan'),
  'P0001', 'INVALID_SCHEDULE', 'fine prima dell''inizio rifiutata');
select throws_ok(
  format($$ select create_event(%L, 'Notte', null, tests.slot_start('Europe/Rome', 2), tests.slot_end('Europe/Rome', 2, 31)) $$, :'milan'),
  'P0001', 'INVALID_SCHEDULE', 'fine dopo le 06:00 (Milano) rifiutata');
select lives_ok(
  format($$ select create_event(%L, 'Notte', null, tests.slot_start('Europe/Rome', 4), tests.slot_end('Europe/Rome', 4, 30)) $$, :'milan'),
  'fine esattamente alle 06:00 (Milano) accettata');
select throws_ok(
  format($$ select create_event(%L, 'Notte', null, tests.slot_start('Atlantic/Canary', 2), tests.slot_end('Atlantic/Canary', 2, 31)) $$, :'canary'),
  'P0001', 'INVALID_SCHEDULE', 'fine dopo le 06:00 (Las Palmas) rifiutata');
select lives_ok(
  format($$ select create_event(%L, 'Notte', null, tests.slot_start('Atlantic/Canary', 2), tests.slot_end('Atlantic/Canary', 2, 30)) $$, :'canary'),
  'fine esattamente alle 06:00 (Las Palmas) accettata');
select throws_ok(
  format($$ select create_event(%L, 'Notte', null, tests.slot_start('Europe/Rome', 61), tests.slot_end('Europe/Rome', 61)) $$, :'milan'),
  'P0001', 'INVALID_SCHEDULE', 'inizio oltre 60 giorni rifiutato');
select throws_ok(
  format($$ select create_event(%L, 'Notte', null, tests.slot_start('Europe/Rome', 2), tests.slot_end('Europe/Rome', 2)) $$, :'closed'),
  'P0001', 'VENUE_NOT_ACTIVE', 'locale non attivo rifiutato');
select throws_ok(
  format($$ select create_event(%L, 'Notte', null, tests.slot_start('Europe/Madrid', 2), tests.slot_end('Europe/Madrid', 2)) $$, :'inactive_city'),
  'P0001', 'VENUE_NOT_ACTIVE', 'città non attiva rifiutata');
select throws_ok(
  format($$ select create_event(%L, 'Notte', null, tests.slot_start('Europe/Rome', 2), tests.slot_end('Europe/Rome', 2), array['10-12']) $$, :'milan'),
  'P0001', 'INVALID_TARGET', 'fascia d''età sconosciuta rifiutata');
select throws_ok(
  format($$ select create_event(%L, 'Notte', null, tests.slot_start('Europe/Rome', 2), tests.slot_end('Europe/Rome', 2), '{}', array['robot']) $$, :'milan'),
  'P0001', 'INVALID_TARGET', 'genere sconosciuto rifiutato');

-- ---------------------------------------------------------------- writes only through RPCs

select throws_ok(
  format($$ insert into public.events (creator_id, venue_id, name, starts_at, ends_at) values (%L, %L, 'Diretta', now() + interval '1 day', now() + interval '2 days') $$, :'creator', :'milan'),
  '42501', null, 'insert diretto su events negato');
select throws_ok(format($$ update public.events set name = 'Hack' where id = %L $$, :'first_event'), '42501', null, 'update diretto su events negato');
select throws_ok(format($$ delete from public.events where id = %L $$, :'first_event'), '42501', null, 'delete diretto su events negato');
reset role;
select ok(not has_table_privilege('authenticated', 'public.events', 'insert')
      and not has_table_privilege('authenticated', 'public.events', 'update')
      and not has_table_privilege('authenticated', 'public.events', 'delete'), 'authenticated non ha privilegi di scrittura su events');
select ok(not has_column_privilege('authenticated', 'public.events', 'name', 'update')
      and not has_column_privilege('authenticated', 'public.events', 'name', 'insert'), 'nemmeno privilegi a livello di colonna');

-- ---------------------------------------------------------------- limit of 10 active events

-- the creator already has 4 active ones (first_event, 80 chars, 06:00 Milano, 06:00 Las Palmas)
select tests.authenticate_as(:'creator');
select lives_ok(
  format($$ select create_event(%L, 'Extra ' || g, null, tests.slot_start('Europe/Rome', 10 + g), tests.slot_end('Europe/Rome', 10 + g)) from generate_series(1, 6) g $$, :'milan'),
  'si arriva a 10 serate attive');
select throws_ok(
  format($$ select create_event(%L, 'Undicesima', null, tests.slot_start('Europe/Rome', 20), tests.slot_end('Europe/Rome', 20)) $$, :'milan'),
  'P0001', 'TOO_MANY_ACTIVE_EVENTS', 'l''11ª serata attiva è rifiutata');
select lives_ok(format($$ select cancel_event(%L) $$, :'first_event'), 'annullo una serata');
select lives_ok(
  format($$ select create_event(%L, 'Undicesima', null, tests.slot_start('Europe/Rome', 20), tests.slot_end('Europe/Rome', 20)) $$, :'milan'),
  'dopo un annullamento si torna sotto il limite');
reset role;
select is((select count(*)::int from public.events where creator_id = :'creator' and cancelled_at is null), 10, 'le serate annullate non contano per il limite');
-- finished events do not count either
select tests.make_event(:'creator', :'milan', now() - interval '3 days', now() - interval '2 days', 'Passata') as old_event \gset
select tests.make_event_crowd(:'old_event', 3);
select is((select count(*)::int from public.events where creator_id = :'creator' and ends_at > now() and cancelled_at is null), 10,
  'le serate finite non contano per il limite');

-- ---------------------------------------------------------------- cancel_event effects

select is((select cancelled_at is not null from public.events where id = :'first_event'), true, 'cancel_event imposta cancelled_at');
select is((select count(*)::int from public.events where id = :'first_event'), 1, 'la serata annullata resta (soft delete)');

-- a fresh event with people on it, to see what cancelling does to declarations and chat
select tests.make_event(:'creator', :'milan', tests.slot_start('Europe/Rome', 5), tests.slot_end('Europe/Rome', 5), 'Da annullare') as doomed \gset
select tests.make_event_crowd(:'doomed', 3);
select tests.authenticate_as(:'fan');
select lives_ok(format($$ select declare('going', null, %L) $$, :'doomed'), 'dichiarare una serata attiva funziona');
reset role;
select is((select count(*)::int from public.chat_rooms where event_id = :'doomed' and expires_at > now()), 1, 'la chat della serata esiste');
select tests.authenticate_as(:'creator');
select lives_ok(format($$ select cancel_event(%L) $$, :'doomed'), 'il creator annulla la serata');
select lives_ok(format($$ select cancel_event(%L) $$, :'doomed'), 'annullare due volte è idempotente');
reset role;
select is((select count(*)::int from public.declarations where event_id = :'doomed' and expires_at > now()), 0, 'le dichiarazioni diventano scadute');
select is((select count(*)::int from public.declarations where event_id = :'doomed'), 4, 'le righe restano (notifica nel prompt 15)');
select is((select count(*)::int from public.chat_rooms where event_id = :'doomed' and expires_at > now()), 0, 'la chat della serata scade subito');
select tests.authenticate_as(:'fan');
select throws_ok(format($$ select declare('going', null, %L) $$, :'doomed'), 'P0001', 'EVENT_NOT_ACTIVE', 'declare rifiuta le serate annullate');
select is((select count(*)::int from get_city_events('milano') where event_id = :'doomed'), 0, 'una serata annullata sparisce da get_city_events');
select is((select count(*)::int from get_post_target() where event_id = :'doomed'), 0, 'get_post_target esclude le serate annullate');
select tests.authenticate_as(:'creator');
select is((select count(*)::int from get_my_creator_events('past') where event_id = :'doomed'), 1, 'compare tra le passate del creator');
select is((select count(*)::int from get_my_creator_events('upcoming') where event_id = :'doomed'), 0, 'non è più in programma');
select throws_ok(format($$ select cancel_event(%L) $$, :'old_event'), 'P0001', 'EVENT_NOT_ACTIVE', 'una serata finita non si annulla');
select tests.authenticate_as(:'fan');
select throws_ok(format($$ select cancel_event(%L) $$, :'first_event'), 'P0001', 'NOT_FOUND', 'cancel_event da non creator: NOT_FOUND');
reset role;
-- cancelled declarations never feed the typical-layer history (the other, finished event does)
update public.declarations set expires_at = expires_at - interval '1 second' where event_id = :'doomed';
select lives_ok($$ select private.snapshot_night_attendance() $$, 'lo snapshot dello storico gira');
select is((select declared from private.night_attendance where venue_id = :'milan' and night_date = public.night_date_at(
  (select city_id from public.venues where id = :'milan'), tests.slot_start('Europe/Rome', 5))), null,
  'le dichiarazioni di una serata annullata non finiscono nello storico');
select is((select declared from private.night_attendance where venue_id = :'milan' and night_date = public.night_date_at(
  (select city_id from public.venues where id = :'milan'), now() - interval '3 days')), 3,
  'quelle di una serata finita sì');

-- ---------------------------------------------------------------- update_event

select tests.make_event(:'creator', :'milan', tests.slot_start('Europe/Rome', 6), tests.slot_end('Europe/Rome', 6), 'Da modificare') as editable \gset
select tests.make_event_crowd(:'editable', 3);
select tests.make_event(:'creator', :'milan', now() - interval '1 hour', now() + interval '3 hours', 'Già iniziata') as started \gset
select tests.authenticate_as(:'fan');
select throws_ok(
  format($$ select update_event(%L, 'Mia', null, tests.slot_start('Europe/Rome', 6), tests.slot_end('Europe/Rome', 6)) $$, :'editable'),
  'P0001', 'NOT_FOUND', 'update da non creator: NOT_FOUND');
select tests.authenticate_as(:'creator');
select throws_ok(
  format($$ select update_event(%L, 'Tardi', null, now() + interval '1 hour', now() + interval '2 hours') $$, :'started'),
  'P0001', 'EVENT_STARTED', 'dopo l''inizio non si modifica');
select throws_ok(
  format($$ select update_event(%L, 'Annullata', null, tests.slot_start('Europe/Rome', 6), tests.slot_end('Europe/Rome', 6)) $$, :'doomed'),
  'P0001', 'EVENT_NOT_ACTIVE', 'una serata annullata non si modifica');
select throws_ok(
  format($$ select update_event(%L, '', null, tests.slot_start('Europe/Rome', 6), tests.slot_end('Europe/Rome', 6)) $$, :'editable'),
  'P0001', 'INVALID_NAME', 'update: stesse validazioni del nome');
select throws_ok(
  format($$ select update_event(%L, 'Nuova', null, tests.slot_start('Europe/Rome', 6), tests.slot_end('Europe/Rome', 6, 31)) $$, :'editable'),
  'P0001', 'INVALID_SCHEDULE', 'update: stesse validazioni dell''orario');
select lives_ok(
  format($$ select update_event(%L, 'Rinominata', 'Nuovo testo', tests.slot_start('Europe/Rome', 6), tests.slot_end('Europe/Rome', 6, 28), array['25-34'], array['male']) $$, :'editable'),
  'il creator modifica una serata non iniziata');
reset role;
select is((select name || '|' || description from public.events where id = :'editable'), 'Rinominata|Nuovo testo', 'testo aggiornato');
select is((select venue_id from public.events where id = :'editable'), :'milan'::uuid, 'il locale non cambia');
select is((select count(*)::int from public.declarations where event_id = :'editable'
   and expires_at = tests.slot_end('Europe/Rome', 6, 28)), 3, 'cambio orario: le dichiarazioni scadono alla nuova fine');
select is((select expires_at from public.chat_rooms where event_id = :'editable'),
  tests.slot_end('Europe/Rome', 6, 28) + interval '2 days', 'cambio orario: la chat scade 2 giorni dopo la nuova fine');

-- ---------------------------------------------------------------- get_my_creator_events

select tests.authenticate_as(:'creator');
select is((select count(*)::int from get_my_creator_events('upcoming') where event_id = :'editable'), 1, 'in programma: serata modificabile presente');
select is((select can_edit from get_my_creator_events('upcoming') where event_id = :'editable'), true, 'can_edit vero prima dell''inizio');
select is((select can_edit from get_my_creator_events('upcoming') where event_id = :'started'), false, 'can_edit falso dopo l''inizio');
select is((select going_band from get_my_creator_events('upcoming') where event_id = :'editable'), '3–10', 'banda SI');
select is((select maybe_band from get_my_creator_events('upcoming') where event_id = :'editable'), 'pochi', 'banda FORSE');
select is((select count(*)::int from get_my_creator_events('past') where event_id = :'old_event'), 1, 'passate: serata finita');
select is((select venue_name || '|' || venue_kind from get_my_creator_events('upcoming') where event_id = :'editable'), 'Arena Club|club', 'locale e tipo');
select is((select array_agg(event_id order by starts_at) from get_my_creator_events('upcoming')),
  (select array_agg(id order by starts_at) from public.events where creator_id = :'creator' and ends_at > now() and cancelled_at is null),
  'in programma: ordine cronologico');
select is((select timezone from get_my_creator_events('upcoming') where event_id = :'editable'), 'Europe/Rome', 'il fuso della città per scrivere gli orari');
select throws_ok($$ select * from get_my_creator_events('x') $$, 'P0001', 'INVALID_ARGUMENT', 'scope sconosciuto rifiutato');
select tests.authenticate_as(:'fan');
select is((select count(*)::int from get_my_creator_events('upcoming')), 0, 'un altro utente non vede serate altrui');

-- ---------------------------------------------------------------- get_event_attendance (k-anonymity)

reset role;
select tests.make_event(:'creator', :'milan', tests.slot_start('Europe/Rome', 7), tests.slot_end('Europe/Rome', 7), 'Adesioni') as att \gset
select tests.make_event_crowd(:'att', 2);
select tests.authenticate_as(:'creator');
select is((select going_band || '|' || maybe_band from get_event_attendance(:'att')), 'pochi|pochi', 'con 2 dichiarati: bande "pochi"');
select is((select avg_age::text || coalesce(female_pct::text, 'n') from get_event_attendance(:'att')), null, 'con 2 dichiarati: statistiche nascoste (null)');
reset role;
select tests.make_event_crowd(:'att', 1);
select tests.authenticate_as(:'creator');
select is((select going_band from get_event_attendance(:'att')), '3–10', 'con 3 dichiarati: banda 3–10');
select is((select avg_age || '|' || female_pct || '|' || male_pct || '|' || other_pct from get_event_attendance(:'att')), '25|100|0|0', 'con 3 dichiarati: età media e genere visibili');
reset role;
select tests.make_event_crowd(:'att', 1, 'maybe');
select tests.authenticate_as(:'creator');
select is((select avg_age from get_event_attendance(:'att')), null, '3 going + 1 maybe: statistiche nascoste (un sottogruppo sotto 3)');
select is((select going_band || '|' || maybe_band from get_event_attendance(:'att')), '3–10|pochi', '3 going + 1 maybe: bande');
select is((select going_band || '|' || avg_age from get_event_attendance(:'old_event')), '3–10|25', 'adesioni storiche di una serata finita');
select tests.authenticate_as(:'fan');
select throws_ok(format($$ select * from get_event_attendance(%L) $$, :'att'), 'P0001', 'NOT_FOUND', 'attendance da non creator: NOT_FOUND');

-- ---------------------------------------------------------------- the creator never sees people

reset role;
select is(
  (select array_agg(a order by i) from pg_proc p, unnest(p.proargnames) with ordinality x(a, i)
    where p.oid = 'public.get_event_attendance(uuid)'::regprocedure and p.proargmodes[i] in ('o', 't')),
  array['going_band', 'maybe_band', 'avg_age', 'female_pct', 'male_pct', 'other_pct'], 'attendance restituisce solo fasce e aggregati');
select is(
  (select array_agg(p.proname || '.' || arg order by p.proname) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace,
     unnest(coalesce(p.proargnames, '{}')) with ordinality a(arg, i)
   where n.nspname = 'public' and p.proname in ('create_event', 'update_event', 'cancel_event', 'get_my_creator_events', 'get_event_attendance')
     and p.proargmodes is not null and p.proargmodes[i] in ('o', 't')
     and arg ~* '(user|handle|person|attendee|participant|profile)'),
  null, 'le RPC del creator non restituiscono utenti né handle');
select tests.authenticate_as(:'creator');
select is((select count(*)::int from public.declarations), 0, 'il creator con select su declarations vede 0 righe altrui');
select is((select count(*)::int from public.declarations where event_id = :'att'), 0, 'nemmeno quelle della sua serata');

-- ---------------------------------------------------------------- get_city_events

reset role;
select tests.make_event(:'creator', :'milan', tests.slot_start('Europe/Rome', 1), tests.slot_end('Europe/Rome', 1), 'Domani Sera') as soon \gset
select tests.make_event(:'creator', :'milan', tests.slot_start('Europe/Rome', 12), tests.slot_end('Europe/Rome', 12), 'Tra Dodici Giorni') as later \gset
select tests.make_event_crowd(:'soon', 3);
select tests.authenticate_as(:'fan');
select is((select count(*)::int from get_city_events('milano') where event_id = :'soon'), 1, 'evento imminente in lista');
select is((select going_band from get_city_events('milano') where event_id = :'soon'), '3–10', 'banda con k');
select is((select going_band from get_city_events('milano') where event_id = :'editable'), '3–10', 'banda con k (2)');
select is((select maybe_band from get_city_events('milano') where event_id = :'soon'), 'pochi', 'sotto 3: pochi');
select is((select count(*)::int from get_city_events('milano') where event_id = :'later'), 0, 'oltre la finestra di 7 giorni: escluso');
select is((select count(*)::int from get_city_events('milano', null, 14) where event_id = :'later'), 1, 'finestra estesa a 14 giorni: incluso');
select is((select count(*)::int from get_city_events('milano', null, 99) where event_id = :'later'), 1, 'la finestra è limitata a 14 giorni senza errori');
select is((select count(*)::int from get_city_events('milano') where event_id = :'old_event'), 0, 'eventi finiti esclusi');
select is((select count(*)::int from get_city_events('milano', 'domani')), 1, 'filtro per nome della serata');
select is((select count(*)::int from get_city_events('milano', 'ARENA') where event_id = :'soon'), 1, 'filtro per nome del locale');
select is((select count(*)::int from get_city_events('milano', '100%')), 0, 'i caratteri jolly del filtro sono letterali');
select is((select count(*)::int from get_city_events('las-palmas')), 1, 'solo gli eventi della città richiesta');
select ok((select array_agg(starts_at) from get_city_events('milano')) = (select array_agg(starts_at order by starts_at) from get_city_events('milano')), 'ordinato per inizio');
select is((select venue_name || '|' || venue_kind from get_city_events('milano') where event_id = :'soon'), 'Arena Club|club', 'locale e tipo');
select is((select timezone from get_city_events('las-palmas')), 'Atlantic/Canary', 'get_city_events restituisce il fuso della città');
select throws_ok($$ select * from get_city_events('madrid') $$, 'P0001', 'CITY_NOT_ACTIVE', 'città non attiva rifiutata');

-- ---------------------------------------------------------------- get_event_detail

reset role;
select tests.follow(:'fan', :'friend');
select tests.follow(:'fan', :'pending_friend', 'pending');
insert into public.declarations (user_id, event_id, intent) values (:'friend', :'soon', 'going'), (:'pending_friend', :'soon', 'maybe');
select tests.authenticate_as(:'fan');
create temp table soon_detail as select * from get_event_detail(:'soon');
select is((select name || '|' || venue_name || '|' || creator_handle from soon_detail), 'Domani Sera|Arena Club|lince.rosso', 'nome, locale e handle del creator');
select is((select jsonb_array_length(friends) from soon_detail), 1, 'amici: solo follow accettati');
select is((select friends -> 0 ->> 'handle' from soon_detail), 'orso.verde', 'amico accettato');
select is((select (friends -> 0) ? 'user_id' from soon_detail), false, 'gli amici non espongono id');
select is((select going_band || '|' || maybe_band from soon_detail), '3–10|pochi', 'bande');
select is((select avg_age from soon_detail), null, '4 going + 1 maybe: statistiche nascoste (k per sottogruppo)');
select is((select is_mine from soon_detail), false, 'is_mine falso per un altro utente');
select is((select round(lat::numeric, 2) || ',' || timezone || ',' || city_slug from soon_detail), '45.46,Europe/Rome,milano', 'coordinate, fuso e città');
select is((select taxi_number from soon_detail), '+39 02 8585', 'numero taxi');
select is((select cancelled_at from get_event_detail(:'doomed')) is not null, true, 'una serata annullata resta consultabile con cancelled_at');
select is((select avg_age from get_event_detail(:'editable')), 25::numeric, '3 going: età media visibile');
select tests.authenticate_as(:'creator');
select is((select is_mine from get_event_detail(:'soon')), true, 'is_mine vero per il creator');
select tests.authenticate_as(:'fan');
select throws_ok(format($$ select * from get_event_detail(%L) $$, gen_random_uuid()), 'P0001', 'NOT_FOUND', 'evento inesistente: NOT_FOUND');
reset role;
update public.venues set is_active = false where id = :'milan';
select tests.authenticate_as(:'fan');
select throws_ok(format($$ select * from get_event_detail(%L) $$, :'soon'), 'P0001', 'NOT_FOUND', 'locale non attivo: NOT_FOUND');
reset role;
update public.venues set is_active = true where id = :'milan';

-- ---------------------------------------------------------------- anon and contract

set local role anon;
select throws_ok($$ select create_event(gen_random_uuid(), 'x', null, now(), now()) $$, '42501', null, 'anon non esegue create_event');
select throws_ok($$ select * from get_city_events('milano') $$, '42501', null, 'anon non esegue get_city_events');
select throws_ok($$ select * from get_event_detail(gen_random_uuid()) $$, '42501', null, 'anon non esegue get_event_detail');
select throws_ok($$ select * from get_my_creator_events('upcoming') $$, '42501', null, 'anon non esegue get_my_creator_events');
reset role;
select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('create_event', 'update_event', 'cancel_event', 'get_my_creator_events', 'get_event_attendance', 'get_city_events', 'get_event_detail')
      and obj_description(p.oid, 'pg_proc') is null),
  null, 'ogni RPC nuova ha COMMENT ON FUNCTION');

select * from finish();
rollback;
