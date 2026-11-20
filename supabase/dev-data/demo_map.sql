-- =====================================================================================================
-- =====================================================================================================
--   SOLO PROGETTO DI SVILUPPO  /  DEVELOPMENT PROJECT ONLY  —  NON LANCIARE IN PRODUZIONE
-- =====================================================================================================
-- =====================================================================================================
-- demo_map.sql — dati di TEST per la mappa generale di Milano, per i tester.
--
-- Cosa fa (idempotente, rilanciabile ogni giorno: le dichiarazioni scadono alle 06:00):
--   1. guardia: si ferma se la città `milano` non è attiva o se esistono più di 500 profili NON demo
--      (soglia anti-errore: un progetto con utenti veri non è un progetto di sviluppo);
--   2. crea 60 utenti demo in auth.users (demoNN@demo.rightplace.invalid, password casuale mai
--      comunicata: nessuno può entrarci) e completa i loro profili (handle demo.NN, fascia d'età,
--      genere, città Milano). 60 e non 40: i gruppi qui sotto sommano a 60 e una dichiarazione per
--      utente per sera è un vincolo della tabella;
--   3. cancella le dichiarazioni dei soli utenti demo e ne crea di nuove per STASERA su ~8 locali
--      reali di Milano (source = 'places', mai spot), scelti in modo deterministico: gruppi da
--      25, 12, 8, 5, 4, 3 persone (-> hot spot in fasce diverse) e 2 locali con 2 e 1 dichiarazioni
--      (sotto k = 3: niente hot spot, principio 2);
--   4. stampa get_city_map('milano','general') vista da un utente demo.
--
-- Non tocca: venue_typical_busyness (lo strato "di solito" è curatela reale, principio 11), utenti,
-- profili, locali e dichiarazioni non demo. Rimozione completa: demo_map_cleanup.sql.
-- Gira come `postgres` (SQL editor di Supabase o psql): bypassa RLS, non passa da public.declare.
-- =====================================================================================================

do $demo$
declare
  c_domain      constant text := '@demo.rightplace.invalid';
  c_max_real    constant int  := 500;   -- soglia guardia: profili non demo
  c_users       constant int  := 60;
  -- dimensione e numero di "forse" per ogni locale, in ordine; la somma deve fare c_users
  c_sizes       constant int[] := array[25, 12, 8, 5, 4, 3, 2, 1];
  c_maybes      constant int[] := array[ 4,  2, 2, 1, 1, 0, 1, 0];
  v_city        uuid;
  v_night       date;
  v_real        int;
  v_venues      uuid[];
  v_venue       uuid;
  v_night_id    uuid;
  v_user        uuid;
  v_next        int := 1;      -- prossimo utente demo da assegnare
  v_group       int;
  v_member      int;
  v_age         int;
begin
  -- ---------------------------------------------------------------- guardia
  select id into v_city from public.cities where slug = 'milano' and is_active;
  if v_city is null then
    raise exception 'demo_map.sql: la città milano non è attiva: questo non sembra il progetto di sviluppo. Interrotto.';
  end if;
  select count(*) into v_real from public.profiles p
   where not exists (select 1 from auth.users u where u.id = p.id and u.email like '%' || c_domain);
  if v_real > c_max_real then
    raise exception 'demo_map.sql: % profili non demo (soglia %): sembra un progetto con utenti veri. Interrotto.', v_real, c_max_real;
  end if;

  -- ---------------------------------------------------------------- utenti demo
  -- id deterministico dall'email: rilanciare non crea duplicati. Le colonne *_token valgono '' (non NULL):
  -- GoTrue le legge come stringhe e un NULL rompe l'elenco utenti della dashboard.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  )
  select '00000000-0000-0000-0000-000000000000'::uuid,
         md5('rightplace-demo-user-' || n)::uuid, 'authenticated', 'authenticated',
         'demo' || lpad(n::text, 2, '0') || c_domain,
         -- hash bcrypt di un uuid casuale mai memorizzato: la password non esiste per nessuno
         extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
         now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{"demo": true, "locale": "it"}'::jsonb,
         now(), now(), '', '', '', '', '', '', '', ''
    from generate_series(1, c_users) as n
  on conflict do nothing;

  -- il trigger on_auth_user_created ha creato i profili: li completiamo (profilo "completo" = birth_date,
  -- gender, city_id valorizzati + handle confermato, come dopo onboarding e conferma dell'handle)
  for v_member in 1 .. c_users loop
    v_age := (array[19, 22, 27, 31, 36, 42, 48, 55])[1 + (v_member % 8)];   -- 18-24, 25-34, 35-44, 45+
    update public.profiles p
       set handle = 'demo.' || lpad(v_member::text, 2, '0'),
           birth_date = (current_date - make_interval(years => v_age, days => 100))::date,
           gender = (array['female', 'male', 'female', 'male', 'other'])[1 + (v_member % 5)],
           city_id = v_city, locale = 'it',
           location_opt_in = false, contacts_opt_in = false, is_creator = false,
           handle_confirmed_at = coalesce(p.handle_confirmed_at, now())
     where p.id = md5('rightplace-demo-user-' || v_member)::uuid;
  end loop;

  -- ---------------------------------------------------------------- dichiarazioni di stasera
  delete from public.declarations d
   using auth.users u
   where u.id = d.user_id and u.email like '%' || c_domain;

  v_night := public.current_night_date(v_city);

  -- locali reali di Milano (non spot), club/bar per primi, ordine deterministico. I locali finti del seed
  -- (google_place_id 'demo-%') vengono solo dopo i veri: servono a far funzionare lo script su un db vuoto.
  select array_agg(id order by rn) into v_venues from (
    select v.id, row_number() over (
             order by (v.google_place_id like 'demo-%'), (v.kind not in ('club', 'bar')), v.name, v.id) as rn
      from public.venues v
     where v.city_id = v_city and v.is_active and v.source = 'places' and v.kind <> 'spot'
       and v.location is not null and v.hidden_at is null
     order by rn limit array_length(c_sizes, 1)
  ) picked;
  if coalesce(array_length(v_venues, 1), 0) = 0 then
    raise exception 'demo_map.sql: nessun locale attivo di Milano (source = places): sincronizza prima i locali da Places.';
  end if;
  if array_length(v_venues, 1) < array_length(c_sizes, 1) then
    raise notice 'demo_map.sql: solo % locali disponibili su %: gruppi extra saltati', array_length(v_venues, 1), array_length(c_sizes, 1);
  end if;

  for v_group in 1 .. least(array_length(v_venues, 1), array_length(c_sizes, 1)) loop
    v_venue := v_venues[v_group];
    v_night_id := private.ensure_night(v_venue, v_night);
    for v_member in 1 .. c_sizes[v_group] loop
      v_user := md5('rightplace-demo-user-' || v_next)::uuid;
      -- gli ultimi membri del gruppo dichiarano "forse", gli altri "ci vado"
      insert into public.declarations (user_id, night_id, intent, expires_at)
      values (v_user, v_night_id,
              case when v_member > c_sizes[v_group] - c_maybes[v_group] then 'maybe' else 'going' end,
              now());   -- il trigger declarations_set_expiry lo riscrive alle 06:00 della night
      v_next := v_next + 1;
    end loop;
  end loop;

  raise notice 'demo_map.sql: night %, % dichiarazioni demo su % locali', v_night, v_next - 1, least(array_length(v_venues, 1), array_length(c_sizes, 1));
end
$demo$;

-- ---------------------------------------------------------------- verifica
-- La mappa generale vista da demo01 (impersonato solo per questa transazione/sessione di verifica).
-- is_hot_spot = true solo con >= 3 dichiarazioni; i locali sotto k hanno banda 'pochi' e non sono hot spot.
-- Una riga con typical_level > 0 e is_hot_spot = false è un punto grigio "di solito", non una dichiarazione demo.
with as_demo_user as (
  select set_config('request.jwt.claims',
           json_build_object('sub', md5('rightplace-demo-user-1')::uuid, 'role', 'authenticated')::text, true)
)
select m.name, m.going_band, m.maybe_band, m.is_hot_spot, m.typical_level
  from as_demo_user, lateral public.get_city_map('milano', 'general') as m
 order by m.is_hot_spot desc, m.name;
