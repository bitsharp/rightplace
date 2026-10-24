# 04 — Schema Supabase, RLS, RPC k-anonime, TTL

Leggi `CLAUDE.md` (principi 1–7). È il prompt più importante: **privacy, soglie k≥3, visibilità ai follower e scadenze si applicano qui, nel database**. Lavora in `supabase/` con migration versionate.

> **Ruoli e metodo**: l'**architetto** (Fable/Opus) resta attivo per tutto il design di schema, policy e firme RPC (punti 1–8). Lo **sviluppatore** (Sonnet) parte dai **test pgTAP del punto 9, scritti prima delle funzioni**. Review finale dell'architetto.

## Modello dati

```
cities        id, slug, name, country, center (geography), default_zoom, timezone, taxi_phone, is_active
venues        id, city_id, google_place_id UNIQUE, name, kind ('club','rooftop','bar','live','other'),
              location (geography point), address, opening_hours jsonb, is_active, places_synced_at
profiles      id → auth.users, handle UNIQUE ('lince.rosso'), handle_changed_at,
              birth_date (solo per calcolare age/age_band; mai esposta), gender ('female','male','other'),
              city_id, locale text CHECK (locale IN ('it','en')) DEFAULT 'it',
              location_opt_in bool, contacts_opt_in bool, is_creator bool,
              coarse_location (geography, NULL se opt-in off), coarse_location_at,
              created_at, deleted_at
venue_typical_busyness
              venue_id, weekday smallint (0=dom…6=sab), hour smallint (0–23), level smallint CHECK (0..3),
              source ('manual','history'), updated_at   PK(venue_id, weekday, hour)   -- strato "di solito" (principio 11)
night_hour_stats
              venue_id, weekday, hour, samples int, avg_declared numeric   PK(venue_id, weekday, hour)
              -- aggregati storici per venue/giorno/ora, MAI per utente; alimenta `history` (solo con samples ≥ 3 serate e avg ≥ 3)
follows       follower_id, followee_id, status ('pending','accepted') DEFAULT 'pending',
              created_at, responded_at   PK(follower_id, followee_id)   -- principio 6: "segue" = status 'accepted'
blocks        blocker_id, blocked_id, created_at
events        id, creator_id, venue_id, name, description, starts_at, ends_at,
              target_age_bands text[], target_genders text[], is_sponsored bool, sponsored_until, created_at
nights        id, venue_id, night_date   UNIQUE(venue_id, night_date)   -- creata lazy
declarations  id, user_id, night_id NULL, event_id NULL, intent ('going','maybe'), expires_at, created_at, updated_at
              UNIQUE(user_id, night_id) ; UNIQUE(user_id, event_id) ; CHECK (night_id IS NOT NULL OR event_id IS NOT NULL)
chat_rooms    id, night_id NULL, event_id NULL, expires_at
chat_messages id, room_id, user_id, kind ('text','photo'), text, photo_path, created_at
posts         id, user_id, night_id/event_id, photo_path, caption, visible_from (giorno dopo 06:00), expires_at (+7 gg), created_at
post_likes    post_id, user_id ; post_comments id, post_id, user_id, text, created_at
search_history user_id, venue_id, searched_at   (per "Consigliata per te"; max 20 righe per utente)
contact_hashes_tmp  user_id, hash, created_at    (vita 10 minuti, solo per il matching)
phone_hashes  user_id, hash UNIQUE               (hash del PROPRIO numero, opt-in, per farsi trovare)
reports       id, reporter_id, target_kind ('post','message','user','event'), target_id, reason, created_at, resolved_at
subscriptions user_id, provider ('revenuecat'), product_id, status, current_period_end, updated_at
push_tokens   user_id, token UNIQUE, platform, updated_at
```

## Istruzioni

1. **Migration 0001 — schema** + indici (geo su `venues.location` e `profiles.coarse_location`, `declarations(night_id)`, `declarations(event_id)`, `follows(followee_id)`, `posts(visible_from, expires_at)`) + trigger `updated_at`.
2. **Funzioni pure SQL** (`immutable`/`stable`, tutte testate):
   - `age_band(birth_date) → text`; `is_adult(birth_date) → bool`
   - `attendance_band(n int) → text`: `NULL/<3 → 'pochi'`, `3–10`, `10–20`, `20–30`, `30–50`, `50–100`, `100+`
   - `current_night_date(city_id)` con cutoff 06:00 nel fuso della città
   - `generate_handle()` → `animale.colore` (liste italiane ≥ 40 × ≥ 15, retry su collisione; l'handle è un nome proprio, uguale in IT e EN)
   - `coarsen(point) → point` arrotondato a ~500 m (griglia 0.005°)
   - `typical_level(venue_id, at timestamptz) → smallint`: legge `venue_typical_busyness` su `weekday`/`hour` nel fuso della città; `0` se manca la riga. Preferisce `source='history'` quando esiste per quella cella, altrimenti `manual`.
   - `level_from_avg(avg numeric) → smallint`: `< 3 → 0`, `3–10 → 1`, `10–30 → 2`, `≥ 30 → 3` (stessa scala della curatela manuale)
3. **Trigger** su `profiles` insert: handle generato; su `declarations`: `expires_at` = chiusura night (06:00) o `events.ends_at`; su `declarations` insert: crea `chat_rooms` se manca, `expires_at = night end + 2 giorni`.
4. **RLS su TUTTE le tabelle**, policy minime:
   - `profiles`: l'utente legge/aggiorna solo la propria riga **completa**; gli altri la vedono solo tramite la view `public_profiles` (`id, handle, age_band, gender, is_creator`) — mai `birth_date`, `coarse_location`, email.
   - `declarations`, `search_history`, `push_tokens`, `subscriptions`: solo le proprie righe.
   - `follows`: insert solo come `follower_id` e solo con `status='pending'` (il default; un insert con `accepted` è rifiutato da CHECK/trigger); update dello `status` **solo** come `followee_id` (accetta) — mai dal follower; delete come `follower_id` (ritira richiesta / smetti di seguire) **o** come `followee_id` (rifiuta / rimuovi follower); select delle proprie in entrambe le direzioni. Rifiutato anche l'insert se esiste un block tra i due. Ovunque il resto dello schema dice "segue", la condizione è `exists (select 1 from follows where follower_id = me and followee_id = X and status = 'accepted')`: una view `accepted_follows` evita di ripetere il filtro.
   - `chat_messages`: select/insert solo se l'utente è **membro della room** (ha una declaration attiva su quella night/event) **e** segue o è seguito dall'autore… → semplifica: membro = declaration attiva; la UI filtra "amici seguiti" ma la policy garantisce l'appartenenza alla serata. Nessun update; delete solo i propri.
   - `posts`: select solo se `author = me` **o** (`me` segue `author` con follow **accettato** **e** `now() between visible_from and expires_at` **e** nessun block tra i due); insert solo i propri.
   - `events`, `venues`, `cities`: select per autenticati; `events` insert/update solo da `is_creator` sui propri.
   - `reports`: insert per tutti, select nessuno (solo service role).
   - `blocks`: bidirezionale nel filtro di ogni select sociale (follows, posts, chat, friends search).
5. **RPC `security definer`** (`set search_path = public`, `revoke all from public`, `grant execute to authenticated`), ognuna con `COMMENT ON FUNCTION` che dichiara la garanzia di privacy:
   - `complete_profile(birth_date, gender, city_slug, locale, location_opt_in, contacts_opt_in, is_creator)` — rifiuta minori (`UNDERAGE`); `set_locale(locale)`.
   - `update_coarse_location(lat, lng)` — applica `coarsen`, rifiuta se `location_opt_in = false`.
   - `declare(night_or_event, intent)` / `undeclare(...)` — upsert con scadenza; rifiuta venue/event non attivi.
   - `get_my_declaration()` → stato corrente, `expires_at`.
   - `get_city_map(city_slug, view 'general'|'friends')` → per ogni venue **attivo** della città: `venue_id, name, kind, lat, lng, typical_level, going_band, maybe_band, is_sponsored, friends_going (solo view friends: lista handle dei MIEI seguiti con declaration, max 5), friends_count`. **Regola k**: `going_band`/`maybe_band` = `attendance_band(count)`, dove count < 3 → `'pochi'`; in view `general` i venue con total < 3 **non compaiono** come hot spot ma restano nel risultato come **typical dot** (`typical_level` ≥ 1) o spariscono (`typical_level` = 0). `typical_level` = `typical_level(venue_id, now())` ed è sempre valorizzato, indipendente dalle dichiarazioni: i due strati non si sommano mai.
   - `get_venue_stats(venue_id, segment 'going'|'maybe'|'all')` → `going_band, maybe_band, avg_age (NULL se gruppo < 3), female_pct/male_pct/other_pct (NULL se gruppo < 3), friends (handle+age_band+gender+intent dei miei seguiti), is_sponsored`.
   - `search_venues(city_slug, kind, query)` → con `is_sponsored` in testa e `going_band/maybe_band`; registra in `search_history`.
   - `get_recommended_venue(city_slug)` → 1 venue dalla cronologia o il più caldo.
   - `search_users(query)` → `public_profiles` + `follow_state` (`'none' | 'pending' | 'accepted'`) + `follows_me` (bool, solo se accettato) + venue dichiarato stasera (**solo** se `follow_state = 'accepted'`); esclude bloccati. L'handle di un estraneo è visibile qui: è l'unico modo per trovarlo e mandargli la richiesta.
   - `request_follow(user_id)` → insert `pending` (idempotente; errore se bloccato o se è me stesso); `cancel_follow_request(user_id)`; `accept_follow(follower_id)` → `status='accepted', responded_at=now()`, solo come followee; `decline_follow(follower_id)` → delete, solo come followee; `unfollow(user_id)` → delete come follower; `remove_follower(follower_id)` → delete come followee (il follower non riceve notifica).
   - `get_follow_requests()` → richieste `pending` ricevute (`public_profiles` + `created_at`), le più recenti prima; `count_follow_requests()` per il badge.
   - `match_contacts(hashes text[])` → inserisce in `contact_hashes_tmp`, ritorna `public_profiles` che hanno `phone_hashes` corrispondenti e **non** sono già seguiti, poi cancella gli hash temporanei nella stessa transazione.
   - `set_my_phone_hash(hash)` / `clear_my_phone_hash()`.
   - `get_feed(cursor)` → post dei seguiti, visibili ora, con like/commenti count e `liked_by_me`, paginati.
   - `get_stories()` → seguiti con un post visibile oggi (per la barra storie).
   - `get_my_creator_events()`, `create_event(...)`, `get_event_attendance(event_id)` (fasce + target, k≥3).
   - `report(target_kind, target_id, reason)`, `block_user(id)`, `unblock_user(id)`.
   - `delete_my_account()` → cancella profilo, contenuti, follow, token; marca `auth.users` per cancellazione (Edge Function con service role entro 24 h).
6. **Job pg_cron**:
   - ogni 10 min: `delete from chat_messages where room expired`, `delete chat_rooms expired`, `delete posts where expires_at < now()` (+ rimozione file Storage via Edge Function/pg_net)
   - ogni 10 min: `delete contact_hashes_tmp older than 10 min`
   - ogni ora: `update profiles set coarse_location = NULL where coarse_location_at < now() - interval '3 hours'`
   - giornaliero 07:00: `delete declarations expired > 7 giorni`, `delete search_history` oltre le 20 più recenti per utente
   - settimanale: `events.is_sponsored = false where sponsored_until < now()`
   - settimanale (lunedì 07:00): `refresh_typical_from_history()` — da `declarations` **scadute** aggiorna `night_hour_stats` (conteggio dichiarati per venue/weekday/hour della serata, media sulle ultime 8 settimane) e, **solo** dove `samples ≥ 3` serate e `avg_declared ≥ 3`, upsert in `venue_typical_busyness` con `source='history'`, `level = level_from_avg(avg)`. Le celle sotto soglia non toccano la riga `manual`. Mai dati per utente: il job lavora su conteggi già aggregati.
7. **Storage**: bucket `posts` e `chat-photos` privati; policy: upload solo nel proprio prefisso `user_id/`, lettura solo via signed URL generato dalle RPC/Edge (mai lettura pubblica).
8. **Seed**: `cities` = `milano` (45.4642, 9.1900, `Europe/Rome`, `taxi_phone` 02 8585) **attiva**; `las-palmas`, `madrid`, `barcelona` inattive. 20 venue di Milano **dichiaratamente finti** (`name` con suffisso " (demo)") finché il prompt 06 non li sostituisce da Places; 0 utenti. Per i venue demo, `venue_typical_busyness` di esempio (`source='manual'`): club pieni ven/sab 23–04, bar animati gio–sab 19–01, rooftop estivi — serve solo a vedere lo strato "di solito" in dev; la curatela vera arriva nel prompt 06.
9. **Test pgTAP** `supabase/tests/` (scritti PRIMA delle funzioni), con più utenti via `set local request.jwt.claims`:
   - `attendance_band`: 0,1,2 → 'pochi'; 3 → '3–10'; 10 → '10–20'; 150 → '100+'
   - `get_venue_stats`: 2 dichiarati → `avg_age` e percentuali NULL; 3 → valorizzati; segment 'maybe' con 2 'maybe' → NULL anche se 'going' sono 10
   - `follows`: B non può fare insert con `status='accepted'`; A (follower) non può fare update dello status; B (followee) sì; dopo `remove_follower` A non vede più i post né la dichiarazione di B
   - `search_users`: estraneo → vedo `handle, age_band, gender, is_creator` e `follow_state='none'`, **nessun** venue; dopo `request_follow` → `'pending'`, ancora nessun venue; dopo `accept_follow` → `'accepted'` con il venue di stasera
   - `get_city_map friends`, `get_feed`, `get_stories`, `get_venue_stats.friends`, chat room: un follow `pending` **non** conta mai come seguito
   - `get_city_map general`: venue con 2 dichiarati e `typical_level` 0 **assente**; con 2 dichiarati e `typical_level` 2 → presente con `going_band = 'pochi'` e `typical_level = 2` (typical dot, non hot spot); con 3 dichiarati → `going_band = '3–10'`; `friends` view: presente se un mio seguito è lì, con il suo handle
   - `typical_level`: sabato 23:00 Roma su cella `manual` 3 → 3; stessa cella con riga `history` 1 → 1 (history vince); cella mancante → 0
   - `refresh_typical_from_history`: 2 serate con 20 dichiarati → nessuna riga `history`; 3 serate con media 2 → nessuna riga; 3 serate con media 12 → `history` level 2 e la riga `manual` resta intatta
   - A non vede `birth_date`/`coarse_location` di B né via select né via RPC
   - `posts`: visibile a un follower solo tra `visible_from` e `expires_at`; invisibile a non follower; invisibile se bloccato
   - `chat_messages`: insert rifiutato senza declaration sulla serata
   - `complete_profile` con 17 anni → `UNDERAGE`
   - `match_contacts` lascia `contact_hashes_tmp` vuota a fine chiamata
   - `coarsen` sposta un punto di almeno 100 m e al massimo 700 m
   - `generate_handle` unico su 1.000 chiamate
   - alle 03:00 ora di Roma la `night_date` è quella del giorno precedente, anche nella notte del cambio ora legale
10. **Tipi TS**: `npm run db:types` → `src/lib/database.types.ts`.
11. **`supabase/README.md`**: modello, RPC, garanzie di privacy, TTL — base della privacy policy.

## Definition of Done

- [ ] `supabase db reset` applica migration + seed; tutti i pgTAP verdi
- [ ] RLS ON su ogni tabella; `public_profiles` è l'unica via ad altri profili
- [ ] Nessuna RPC restituisce email, `birth_date`, posizione, numeri di telefono o hash
- [ ] I job pg_cron sono registrati (`select * from cron.job`)
- [ ] `database.types.ts` generato; `supabase/README.md` scritto
- [ ] Test scritti prima delle funzioni (visibile nell'ordine dei commit o descritto nel commit)
- [ ] Commit: `feat(04): supabase schema, rls, k-anonymous rpc, ttl jobs`
