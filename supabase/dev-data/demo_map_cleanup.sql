-- =====================================================================================================
--   SOLO PROGETTO DI SVILUPPO — rimuove TUTTI i dati creati da demo_map.sql
-- =====================================================================================================
-- Gli utenti demo si riconoscono dall'email *@demo.rightplace.invalid. Le cascade rimuovono profili,
-- dichiarazioni, follow, messaggi, post e notifiche collegati. Gira come `postgres` (SQL editor / psql).
-- Non tocca utenti, locali o dati non demo.

delete from auth.users where email like '%@demo.rightplace.invalid';

-- Opzionale, SOLO se il progetto di sviluppo non ha storia "vera" da conservare: le dichiarazioni demo
-- scadute sono state contate (senza user id) nello storico del job settimanale e restano lì anche dopo il
-- delete qui sopra. Togli i commenti per azzerare lo storico e lo strato "di solito" derivato da esso.
-- delete from private.night_attendance;
-- delete from public.night_hour_stats;
-- delete from public.venue_typical_busyness where source = 'history';   -- NON toglie source = 'manual'

-- Verifica: tutte le righe devono dire 0.
select 'auth.users demo' as controllo, count(*) as rimasti
  from auth.users where email like '%@demo.rightplace.invalid'
union all
select 'profili demo (handle demo.NN)', count(*) from public.profiles where handle ~ '^demo\.[0-9]{2}$'
union all
select 'dichiarazioni di utenti inesistenti', count(*)
  from public.declarations d where not exists (select 1 from public.profiles p where p.id = d.user_id);
