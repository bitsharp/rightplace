-- Seed for local development (`supabase db reset`). No users.
-- Venues are DECLARATIVELY FAKE ("(demo)" suffix, google_place_id 'demo-…'): prompt 06 replaces them
-- with real venues from Google Places. They are not copied from the mock-up sample data.

insert into public.cities (slug, name, country, center, default_zoom, timezone, taxi_phone, is_active) values
  ('milano', 'Milano', 'IT', extensions.st_setsrid(extensions.st_makepoint(9.1900, 45.4642), 4326)::extensions.geography,
   13, 'Europe/Rome', '+39 02 8585', true),
  ('las-palmas', 'Las Palmas', 'ES', extensions.st_setsrid(extensions.st_makepoint(-15.4134, 28.1235), 4326)::extensions.geography,
   13, 'Atlantic/Canary', null, true),
  ('madrid', 'Madrid', 'ES', extensions.st_setsrid(extensions.st_makepoint(-3.7038, 40.4168), 4326)::extensions.geography,
   13, 'Europe/Madrid', null, false),
  ('barcelona', 'Barcelona', 'ES', extensions.st_setsrid(extensions.st_makepoint(2.1734, 41.3851), 4326)::extensions.geography,
   13, 'Europe/Madrid', null, false)
on conflict (slug) do nothing;

insert into public.venues (city_id, google_place_id, name, kind, location, address, is_active)
select c.id, 'demo-' || lpad(v.n::text, 2, '0'), v.name || ' (demo)', v.kind,
       extensions.st_setsrid(extensions.st_makepoint(v.lng, v.lat), 4326)::extensions.geography,
       'Indirizzo di prova, Milano', true
  from public.cities c,
  (values
    (1, 'Club Darsena', 'club', 45.4520, 9.1760),
    (2, 'Club Porta Genova', 'club', 45.4535, 9.1690),
    (3, 'Club Garibaldi', 'club', 45.4840, 9.1870),
    (4, 'Club Isola Nord', 'club', 45.4890, 9.1900),
    (5, 'Club Lambrate Est', 'club', 45.4840, 9.2370),
    (6, 'Club Ripamonti', 'club', 45.4400, 9.2010),
    (7, 'Bar Brera Uno', 'bar', 45.4720, 9.1870),
    (8, 'Bar Navigli Due', 'bar', 45.4500, 9.1740),
    (9, 'Bar Arco', 'bar', 45.4760, 9.1720),
    (10, 'Bar Porta Venezia', 'bar', 45.4740, 9.2050),
    (11, 'Bar NoLo', 'bar', 45.4950, 9.2160),
    (12, 'Terrazza Centrale', 'rooftop', 45.4650, 9.1880),
    (13, 'Terrazza Porta Nuova', 'rooftop', 45.4820, 9.1900),
    (14, 'Terrazza Duomo Est', 'rooftop', 45.4630, 9.1950),
    (15, 'Terrazza Citylife', 'rooftop', 45.4780, 9.1550),
    (16, 'Live Lambrate', 'live', 45.4850, 9.2400),
    (17, 'Live Bovisa', 'live', 45.5030, 9.1620),
    (18, 'Live Corvetto', 'live', 45.4400, 9.2230),
    (19, 'Live Sempione', 'live', 45.4760, 9.1680),
    (20, 'Spazio Ortica', 'other', 45.4730, 9.2470)
  ) as v(n, name, kind, lat, lng)
 where c.slug = 'milano'
on conflict (google_place_id) do nothing;

-- Las Palmas: demo venues too, same declaratively-fake rule (real ones come from Places, prompt 06).
insert into public.venues (city_id, google_place_id, name, kind, location, address, is_active)
select c.id, 'demo-lp-' || lpad(v.n::text, 2, '0'), v.name || ' (demo)', v.kind,
       extensions.st_setsrid(extensions.st_makepoint(v.lng, v.lat), 4326)::extensions.geography,
       'Dirección de prueba, Las Palmas', true
  from public.cities c,
  (values
    (1, 'Club Las Canteras', 'club', 28.1380, -15.4350),
    (2, 'Club Puerto', 'club', 28.1450, -15.4260),
    (3, 'Club Alcaravaneras', 'club', 28.1260, -15.4200),
    (4, 'Bar Triana', 'bar', 28.1060, -15.4130),
    (5, 'Bar Vegueta', 'bar', 28.1020, -15.4150),
    (6, 'Bar Playa Chica', 'bar', 28.1320, -15.4330),
    (7, 'Terraza Santa Catalina', 'rooftop', 28.1440, -15.4240),
    (8, 'Terraza Mesa y López', 'rooftop', 28.1330, -15.4310),
    (9, 'Live Guanarteme', 'live', 28.1410, -15.4380),
    (10, 'Live Vegueta', 'live', 28.1030, -15.4170)
  ) as v(n, name, kind, lat, lng)
 where c.slug = 'las-palmas'
on conflict (google_place_id) do nothing;

-- "Di solito" layer, example only (source='manual'); real curation arrives with prompt 06.
-- weekday: 0 = Sunday … 6 = Saturday. Hours after midnight belong to the following weekday.
insert into public.venue_typical_busyness (venue_id, weekday, hour, level, source)
select v.id, cell.weekday, cell.hour, cell.level, 'manual'
  from public.venues v
  cross join lateral (
    -- clubs: packed Friday and Saturday 23:00–04:59
    select d as weekday, h as hour, 3 as level from generate_series(5, 6) d, generate_series(23, 23) h where v.kind = 'club'
    union all
    select (d + 1) % 7, h, 3 from generate_series(5, 6) d, generate_series(0, 4) h where v.kind = 'club'
    -- bars: lively Thursday–Saturday 19:00–01:59
    union all
    select d, h, 2 from generate_series(4, 6) d, generate_series(19, 23) h where v.kind = 'bar'
    union all
    select (d + 1) % 7, h, 2 from generate_series(4, 6) d, generate_series(0, 1) h where v.kind = 'bar'
    -- rooftops: quieter, every evening 18:00–23:59 (seasonality comes with real curation)
    union all
    select d, h, 1 from generate_series(0, 6) d, generate_series(18, 23) h where v.kind = 'rooftop'
    -- live music: Friday and Saturday 21:00–23:59
    union all
    select d, h, 2 from generate_series(5, 6) d, generate_series(21, 23) h where v.kind = 'live'
  ) cell
 where v.google_place_id like 'demo-%'
on conflict do nothing;
