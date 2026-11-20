# RightPlace — database (Supabase)

Tutte le regole di privacy di `CLAUDE.md` (principi 1–7 e 11) **vivono qui**, non nel client: RLS su ogni tabella, RPC `security definer` con k-anonimato, scadenze applicate da job `pg_cron`. Questo documento è la base tecnica della privacy policy.

## Come si usa

| Comando                 | Cosa fa                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run db:start`      | avvia Supabase in locale (Docker)                                                                                                       |
| `npm run db:reset`      | ricrea il DB locale: migration + `seed.sql`                                                                                             |
| `npm run db:test`       | test pgTAP (`supabase test db`)                                                                                                         |
| `npm run db:test:local` | stessi test su un Postgres semplice senza Docker (CI/sessioni cloud): richiede PostGIS, pgTAP, pg_cron; vedi `scripts/db/test-local.sh` |
| `npm run db:types`      | rigenera `src/lib/database.types.ts` dal DB locale                                                                                      |

Le migration in `migrations/` sono ordinate e **non si modificano dopo essere state applicate**: ogni cambiamento è una nuova migration. Se si aggiungono funzioni, l'ultima migration deve ripetere lo "sweep" dei privilegi di `…001100_privileges.sql`.

## Modello dati

| Tabella                                | Contenuto                                                                                    | Chi la legge                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `cities`                               | città (Milano attiva; Las Palmas, Madrid, Barcellona inattive)                               | utenti autenticati                                                      |
| `venues`                               | locali (da Google Places, prompt 06; finché una città non ha 10 locali reali restano i demo) | utenti autenticati                                                      |
| `venue_typical_busyness`               | strato "di solito": livello 0–3 per venue/giorno/ora, `source` `manual` o `history`          | utenti autenticati                                                      |
| `night_hour_stats`                     | medie storiche per venue/giorno/ora, **mai per utente**                                      | nessun client                                                           |
| `profiles`                             | handle, data di nascita, genere, città, lingua, consensi, posizione grossolana               | **solo la propria riga**                                                |
| `public_profiles` (view)               | `id, handle, age_band, gender, is_creator`                                                   | utenti autenticati: **unico accesso ad altri profili**                  |
| `follows`                              | A → B con `status` `pending` / `accepted`                                                    | solo le proprie righe (entrambe le direzioni)                           |
| `accepted_follows` (view)              | follow accettati                                                                             | come `follows`                                                          |
| `blocks`                               | blocchi                                                                                      | solo i propri                                                           |
| `events`                               | serate dei creator                                                                           | utenti autenticati                                                      |
| `nights`                               | serata logica di un locale (06:00 → 06:00, fuso della città)                                 | utenti autenticati                                                      |
| `declarations`                         | "Ci vado" / "Forse"                                                                          | solo le proprie (scritture solo via RPC)                                |
| `chat_rooms`, `chat_messages`          | chat della serata                                                                            | membri della serata; messaggi di autori visibili nella room (prompt 19) |
| `posts`, `post_likes`, `post_comments` | foto del giorno dopo                                                                         | vedi "Visibilità"                                                       |
| `search_history`                       | ultime ricerche (max 20)                                                                     | solo le proprie                                                         |
| `contact_hashes_tmp`, `phone_hashes`   | hash SHA-256 di numeri E.164                                                                 | **nessun client**                                                       |
| `reports`                              | segnalazioni                                                                                 | nessun client (moderatori via service role)                             |
| `subscriptions`, `push_tokens`         | abbonamento creator, token push                                                              | solo i propri                                                           |
| `private.*`                            | liste per gli handle, conteggi per serata, code di cancellazione                             | nessun client                                                           |

## Garanzie di privacy

1. **Identità pubblica.** Gli altri vedono solo l'handle (`@…` scelto dall'utente con regole, o generato `animale.colore`), fascia d'età, genere e flag creator. Email (in `auth.users`), data di nascita, posizione e telefono non sono in nessuna view né in nessun risultato di RPC. Un test pgTAP verifica che nessuna RPC abbia colonne di output con nomi come email, birth, coarse, phone, hash.
2. **k-anonimato (k = 3).** L'affluenza è sempre una fascia (`pochi`, `3–10`, `10–20`, `20–30`, `30–50`, `50–100`, `100+`). Età media e percentuali di genere sono `NULL` se il gruppo ha meno di 3 persone. Nel segmento "Tutti" lo stesso vale per ogni sottogruppo non vuoto ("Ci vado" o "Forse"), altrimenti la differenza tra due segmenti rivelerebbe una singola persona. Sulla mappa un locale con meno di 3 dichiarazioni non è mai un punto caldo.
3. **Posizione.** È opt-in, arrotondata al centro di una cella di 0,005° (~500 m) da `coarsen()` dentro la RPC e cancellata dopo 3 ore. Spegnendo il consenso si cancella subito. Non esiste uno storico.
4. **Contatti.** Opt-in anche lato server (`CONTACTS_OPT_OUT`). Si inviano solo hash SHA-256 (64 caratteri esadecimali), cancellati dentro la stessa chiamata e comunque entro 10 minuti. Il proprio hash serve solo a farsi trovare e non è leggibile da nessun client.
5. **Contenuti effimeri.** Chat cancellata 2 giorni dopo la fine della serata. Post visibili dal giorno dopo alle 06:00 e cancellati 7 giorni dopo. Dichiarazioni scadute invisibili e cancellate dopo 7 giorni.
6. **Follow con accettazione.** Una richiesta nasce sempre `pending`: inserire `accepted` è rifiutato e solo il followee può accettare. Una richiesta pending non sblocca nulla. Rifiuto, rimozione e blocco hanno effetto immediato. Dove sei stasera, post, storie, amici al locale e messaggi in chat sono visibili solo con follow accettato. Chi ha messo like lo vedono solo l'autore e chi l'ha messo, per non rivelare chi segue chi. I blocchi valgono in entrambe le direzioni in ogni lettura sociale.
7. **Moderazione.** Le segnalazioni sono scrivibili da tutti e leggibili solo dai moderatori. Il blocco elimina i follow in entrambe le direzioni.
8. **Cancellazione account.** `delete_my_account()` elimina subito contenuti, relazioni e dati personali. Il job `process-account-deletions` (ogni ora) cancella l'utente da `auth.users`, email compresa, partendo dalla coda `private.account_deletion_requests`. Le foto vanno in `private.storage_deletion_queue` e le svuoterà una Edge Function (prompt 11), perché Supabase non permette di cancellare oggetti di Storage via SQL.
9. **Strato "di solito".** Viene da curatela manuale (`source='manual'`) o dalla nostra storia aggregata (`source='history'`, solo celle con almeno 3 serate e media di almeno 3 dichiarati). Non usa mai i Popular times di Google e non si somma mai alle dichiarazioni di stasera.

## RPC (tutte `security definer`, `search_path` fissato, eseguibili solo da `authenticated`)

Gli errori sono codici tipizzati nel messaggio dell'eccezione: `NOT_AUTHENTICATED`, `UNDERAGE`, `INVALID_ARGUMENT`, `INVALID_INTENT`, `CITY_NOT_ACTIVE`, `VENUE_NOT_ACTIVE`, `EVENT_NOT_ACTIVE`, `LOCATION_OPT_OUT`, `CONTACTS_OPT_OUT`, `INVALID_HASH`, `CANNOT_FOLLOW_SELF`, `BLOCKED`, `NOT_CREATOR`, `NOT_FOUND`; serate (prompt 12): `INVALID_NAME`, `INVALID_DESCRIPTION`, `INVALID_TARGET`, `INVALID_SCHEDULE`, `TOO_MANY_ACTIVE_EVENTS`, `EVENT_STARTED`.

| Area           | RPC                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profilo        | `complete_profile(birth_date, gender, city_slug, locale, location_opt_in, contacts_opt_in, is_creator)`, `set_locale`, `update_coarse_location(lat, lng)`, `regenerate_handle()` e `set_handle(handle)` (liberi in onboarding, un cambio gratuito subito dopo, poi uno ogni 30 giorni), `confirm_handle()` (fine onboarding dell'handle, parte il limite), `is_handle_available(handle)`, `set_profile_city(city_slug)` (salva solo la città scelta per la mappa su `profiles.city_id`), `delete_my_account()` |
| Serata         | `declare(intent, venue_id?, event_id?)` (una sola dichiarazione attiva), `undeclare()`, `get_my_declaration()`                                                                                                                                                                                                                                                                                                                                                                                                 |
| Mappa e locali | `declare_at_spot`, `declare_at_place` (prompt 20), `get_city_map(city_slug, 'general'\|'friends')`, `get_venue_stats(venue_id, 'going'\|'maybe'\|'all')`, `search_venues(city_slug, kind?, query?)`, `get_recommended_venue(city_slug)`, `remember_venue(venue_id)`                                                                                                                                                                                                                                            |
| Persone        | `search_users(query)`, `request_follow`, `cancel_follow_request`, `accept_follow`, `decline_follow`, `unfollow`, `remove_follower`, `get_follow_requests()`, `count_follow_requests()`, `get_following()` (solo follow accettati, con il locale di stasera), `get_followers()`, `get_blocked_users()`                                                                                                                                                                                                          |
| Contatti       | `match_contacts(hashes[])`, `set_my_phone_hash(hash)`, `clear_my_phone_hash()`, `has_phone_hash()` (solo un boolean sul proprio stato, mai l'hash)                                                                                                                                                                                                                                                                                                                                                             |
| Feed           | `get_feed(before_visible?, before_id?, limit?)`, `get_stories()`, `get_story_posts(user_id)`, `get_post_target()`, `create_post(caption?, photo_path?, chat_photo_path?)`, `set_post_like`, `get_post_comments`, `add_post_comment`, `delete_post_comment`, `delete_post`, `get_post_photo_paths(post_ids[])`                                                                                                                                                                                                  |
| Creator        | `create_event(...)`, `update_event(...)`, `cancel_event(event_id)`, `get_my_creator_events('upcoming'\|'past')`, `get_event_attendance(event_id)` (prompt 12)                                                                                                                                                                                                                                                                                                                                                  |
| Serate         | `get_city_events(city_slug, query?, days?)`, `get_event_detail(event_id)` (prompt 12)                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Moderazione    | `report(kind, id, reason)`, `block_user`, `unblock_user`                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Feedback       | `submit_feedback(rating, comment, screen, screenshot_path, app_version, platform, locale)` (voto 1–5, max 10 al giorno; lettura solo con service role, vedi `docs/feedback.md`)                                                                                                                                                                                                                                                                                                                                |

Azione per applicare `20261113000100_has_phone_hash.sql` al progetto hosted: `npx supabase db push`.

Funzioni pure (pubbliche, senza dati personali): `age_band`, `is_adult`, `attendance_band`, `level_from_avg`, `night_date_at`, `current_night_date`, `night_end`, `coarsen`, `typical_level`, `generate_handle`.

## Job `pg_cron` (orari in UTC)

| Job                            | Quando                           | Cosa                                                                                                        |
| ------------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `purge-expired-content`        | ogni 10 min                      | cancella chat scadute (con i messaggi) e post scaduti; accoda le foto per lo Storage                        |
| `purge-contact-hashes`         | ogni 10 min                      | hash dei contatti più vecchi di 10 min                                                                      |
| `expire-coarse-locations`      | ogni ora                         | posizioni più vecchie di 3 ore                                                                              |
| `daily-cleanup`                | 06:00 UTC (07:00 Roma d'inverno) | salva i conteggi per serata, cancella dichiarazioni scadute da oltre 7 giorni, tiene 20 ricerche per utente |
| `expire-sponsorships`          | lunedì 05:00 UTC                 | spegne le sponsorizzazioni scadute                                                                          |
| `refresh-typical-from-history` | lunedì 06:00 UTC                 | ricalcola lo strato "di solito" dalla storia delle ultime 8 settimane                                       |
| `purge-old-feedback`           | ogni giorno 06:30 UTC            | feedback più vecchi di 180 giorni; accoda gli screenshot per lo Storage                                     |
| `process-account-deletions`    | ogni ora (:15)                   | elimina da `auth.users` gli account per cui è stata chiesta la cancellazione                                |
| `expire-stale-places`          | ogni giorno 04:30 UTC            | locali Places non sincronizzati da 30 giorni: disattivati, senza nome/indirizzo/orari                       |
| `purge-stale-venue-photos`     | ogni giorno 04:45 UTC            | azzera `photo_url` / `photo_fetched_at` oltre i 60 giorni (foto di copertina da Apify)                      |

## Supabase Auth (prompt 05)

- Accesso con email e password (min. 8 caratteri) e **conferma email obbligatoria**. I link delle email tornano all'app con flusso PKCE su `rightplace://auth/callback` (in Expo Go: `exp://…/--/auth/callback`).
- La lingua scelta alla registrazione (`user_metadata.locale`) viene copiata in `profiles.locale` dal trigger di registrazione. `set_locale` aggiorna entrambe, così le email di conferma e di reset escono in italiano o in inglese (template in `templates/`).
- Captcha: Cloudflare Turnstile, attivato insieme a `EXPO_PUBLIC_TURNSTILE_SITE_KEY` nel client.
- Configurazione locale in `config.toml`. Sul progetto hosted gli stessi valori vanno impostati dalla dashboard (vedi il README principale).

## Storage

I bucket `posts`, `chat-photos`, `feedback` e `avatars` sono privati. Il caricamento è permesso solo nel proprio prefisso `<user_id>/…`. **Non esiste una policy di lettura**: le immagini si servono solo con signed URL generati lato server (`chat-photo-urls` per la chat, prompt 10; `post-photo-urls` per i post, prompt 11; `avatar-urls` per la foto profilo). `avatars` accetta solo JPEG fino a 2 MB.

## Decisioni rispetto a `roadmap/04`

- `venue_typical_busyness` ha come chiave `(venue_id, weekday, hour, source)`, così la riga `history` prevale senza cancellare quella `manual`.
- `private.night_attendance` conserva solo i **conteggi per serata**, perché le dichiarazioni vengono cancellate dopo 7 giorni ma lo storico copre 8 settimane. Ogni serata si attribuisce alle ore 21–02 (una dichiarazione non dice l'orario).
- La chat mostra solo i messaggi degli autori visibili nella room (prompt 19): me, chi ha un follow accettato con me in una direzione o nell'altra, o chi è legato a un amico mio dichiarato nella stessa room; il blocco prevale. Non tutti quelli dei membri della serata.
- Chat (prompt 10): si entra con qualunque dichiarazione non annullata sulla serata/evento finché la stanza è viva (`expires_at`), non solo con quella attiva; i messaggi si inviano solo con `send_chat_message` (l'insert diretto è revocato).
- `match_contacts` richiede `contacts_opt_in` anche lato server.
- Le scritture su `profiles`, `declarations` e `follows.status` sono limitate per colonna. Tutto il resto passa dalle RPC.
- Serate dei creator (prompt 12, migration `20261110000100_creator_events.sql`): **`events` si scrive solo con le RPC** (`create_event`, `update_event`, `cancel_event`); insert/update/delete diretti e le relative policy sono stati revocati, così nessuna regola si aggira. `create_event` impone nome 1–80, descrizione ≤ 500, inizio futuro (entro 60 giorni), fine entro le 06:00 della serata nel fuso della città, locale e città attivi, al massimo 10 serate attive (`ends_at > now()` e non annullate; il blocco sulla riga del profilo evita le corse). Il target nel DB resta `18-24/25-34/35-44/45+`: il chip "35+" del client vale `35-44` e `45+`.
- **Annullare è un soft delete** (`events.cancelled_at`): le dichiarazioni dell'evento scadono subito ma le righe restano (il prompt 15 avviserà chi aveva dichiarato), la chat scade subito e la pulizia la cancella con le foto. `declare` e `get_post_target` ignorano le serate annullate e lo snapshot dello storico "di solito" non le conta. Modificare gli orari sposta la scadenza di dichiarazioni (fine serata) e chat (+2 giorni).
- `get_event_attendance` usa la **stessa regola k di `get_venue_stats`** (almeno 3 persone e né "Ci vado" né "Forse" con 1 o 2) e conta anche le dichiarazioni scadute, per le adesioni delle serate passate. Restituisce solo fasce e aggregati: nessuna RPC del creator ha colonne con utenti o handle, e il creator non legge `declarations` altrui. `get_city_events` e `get_event_detail` (con il fuso della città) seguono le regole del locale: fasce k-anonime, amici solo con follow accettato.
- Per applicare: `npx supabase db push` (nessun'altra azione manuale).

## Google Places (prompt 06)

Regole complete in `docs/places-terms.md`, passi operativi in `docs/places-sync.md`.

- **Secret** della Edge Function: `GOOGLE_PLACES_API_KEY` (`npx supabase secrets set GOOGLE_PLACES_API_KEY=<chiave>`; il valore non va mai in un file). Non è la chiave dell'SDK Maps.
- **Secret** `SYNC_ADMIN_KEY` (accanto a `GOOGLE_PLACES_API_KEY`): `npx supabase secrets set SYNC_ADMIN_KEY=<valore>`, generato in locale. `places-sync` autorizza solo l'header `x-sync-key` uguale a questo secret (confronto a tempo costante, fail closed se il secret è vuoto). Il Bearer serve solo al gateway (`verify_jwt` resta attivo): lo script usa la chiave `anon` **legacy in formato JWT**. La sync non usa la service role. Solo `typical:import` richiede `SUPABASE_SERVICE_ROLE_KEY`, che deve essere la `service_role` legacy JWT (le `sb_secret_…` non funzionano). Nessun valore reale va nel repo.
- **Deploy**: `npx supabase functions deploy places-sync places-detail`. Test: `npm run functions:test` (Deno).
- `places-sync`: solo con l'header `x-sync-key` (vedi sopra). Input `{ city_slug, max_requests? (default 10, max 20), dry_run? }`; solo città con `is_active = true` (altrimenti 400 `CITY_NOT_ACTIVE`). Risposta `{ city, calls, inserted, updated, demo_deactivated }`, oppure in dry run `{ city, dry_run, estimated_calls, queries }`.
- `places-detail`: chiamata dall'app con il JWT utente; Place Details solo se i dati (o l'ultima Details) hanno 30 giorni o più, oppure se la Details non è mai stata eseguita per quel locale (serve a portare il sito web).
- **Colonne** `cities.places_radius_m` (1000–50000, default 8000) e `cities.places_areas` (quartieri usati nelle query).
- **RPC solo `service_role`** (revocate ad `anon` e `authenticated`): `sync_places_venues(city_slug, rows)` (upsert su `google_place_id`; disattiva i demo della sola città quando ha almeno 10 locali reali attivi), `get_city_sync_info(city_slug)`, `import_typical_manual(city_slug, rows)` (atomica; rimpiazza solo le righe `manual`, errori `UNKNOWN_VENUE` / `INVALID_ARGUMENT` / `NOT_FOUND`).
- **Foto di copertina** (`20261120000300_venue_cover_photo.sql`, rischio accettato, `docs/typical-apify.md`): `venues.photo_url` + `photo_fetched_at` (solo l'URL, nessuna copia; nessun grant ai client: arriva solo da `get_venue_detail`, che la restituisce solo con il flag `private.feature_flags` `venue_photo_apify` acceso e un URL più recente di 60 giorni). RPC solo `service_role`: `import_venue_photos_apify(city_slug, rows)` (accetta solo `https` su `googleusercontent.com`, venue attivi non spot della città). Interruttore: `update private.feature_flags set enabled = false where name = 'venue_photo_apify';`.
- **Sito web del locale** (`20261120000400_venue_website.sql`): `venues.website_uri` + `details_synced_at` (nessun grant ai client: arrivano solo da `get_venue_detail`, che ora restituisce anche `website_uri` in coda). RPC solo `service_role`: `set_venue_details(google_place_id, website_uri)` (solo http/https, max 2048 caratteri, locali attivi non spot; chiamata da `places-detail` dopo l'upsert). `expire_stale_places` azzera sito e `details_synced_at` con gli altri contenuti Places (30 giorni).
- **RPC per gli utenti**: `remember_venue(venue_id)` scrive solo nella cronologia ricerche propria.
- **Job**: `expire-stale-places` (tabella sopra).

## Ricerca Google e spot (prompt 20)

Migration `20261116000100_spots.sql` (applicare con `npx supabase db push`). Modello, regole e privacy in `docs/spots.md`; costi in `docs/places-costs.md`; termini in `docs/places-terms.md`.

- **RPC nuove**: `declare_at_spot(lat, lng, name, intent)`, `declare_at_place(google_place_id, intent)` (authenticated); `upsert_search_place(city_slug, row)` e `consume_places_search_session(user_id, session_token)` (**solo service_role**, usate dalle Edge Function). `get_city_map` ha due colonne in più (`is_spot`, `is_declarable`); `report` accetta `spot`.
- **Errori**: `INVALID_SPOT_NAME`, `SPOT_LIMIT`, `OUT_OF_CITY`, `PLACE_NOT_CACHED`.
- **Privilegi**: `authenticated` perde il `select` su tutte le colonne di `venues` e riceve un grant per colonna senza `created_by` e `hidden_at`; `select *` su `venues` è quindi negata. Le query esistenti del client elencano le colonne.
- **Job**: `purge-expired-spots` (ogni 10 minuti), `purge-places-search-usage` (04:15 UTC).
- **Quota di ricerca**: `private.places_search_sessions` (user, token, data). Il server conta una sessione quando vede un token nuovo per l'utente: 30 sessioni nelle ultime 24 ore, poi `places-search` risponde 429.
- **Edge Function**: `places-search` (nuova) e `places-detail` (estesa con `{ place_id, session_token, city_slug, language? }`). Deploy: `npx supabase functions deploy places-search places-detail`. Entrambe con `verify_jwt` attivo (default). **Nessun secret nuovo**: usano `GOOGLE_PLACES_API_KEY` già presente; Autocomplete (New) è incluso in "Places API (New)", già abilitata.
- **Azioni manuali per Luca**: (1) `supabase db push` e deploy delle due funzioni; (2) in Google Cloud, sulla chiave Places, impostare una **quota giornaliera di richieste** per Places API (New) (ultima difesa contro l'abuso, vedi `docs/places-costs.md`); (3) rigenerare i tipi (`npm run db:types`) se il progetto locale cambia.

## Chat di amici di amici (prompt 19)

Migration `20261115000100_chat_friends_of_friends.sql`: nessuna azione manuale oltre `supabase db push`. Introduce `private.is_linked(a, b)` e sostituisce `private.can_see_chat_author(uuid)` / `can_see_chat_author_for(uuid, uuid)` con le firme che prendono anche la room (`can_see_chat_author(room, author)`, `can_see_chat_author_for(viewer, room, author)`): visibilità = me, un legame (follow accettato in una direzione o nell'altra) o un amico in comune dichiarato nella stessa room; il blocco prevale. Ricrea `get_room_messages`, `get_my_chat_rooms`, `get_chat_photo_paths`, il trigger delle push di chat e la policy `chat_messages_read` (usata da Realtime). Il wrapper `can_see_chat_author(uuid, uuid)` è eseguibile da `authenticated` perché lo chiama la policy; le altre funzioni restano private. Dettagli in `docs/night-chat.md`.

## Chat di serata (prompt 10)

Dettagli e verifiche in `docs/night-chat.md`.

- **RPC per gli utenti** (`authenticated`): `send_chat_message(room_id, text?, photo_path?)` (errori `NOT_ROOM_MEMBER`, `INVALID_MESSAGE`, `INVALID_PHOTO_PATH`), `get_my_chat_rooms()`, `get_room_messages(room_id, before?, limit?)` (mai il path delle foto), `get_chat_photo_paths(message_ids[])` (solo per la Edge Function di firma).
- **RPC solo `service_role`**: `claim_storage_deletions(limit?)` e `complete_storage_deletions(ids[])`: la coda dei file da cancellare. Se in futuro si rilancia lo "sweep" dei privilegi (migration 0011), questi due vanno esclusi dal grant ad `authenticated`.
- **Coda file**: un trigger su `chat_messages` mette in coda la foto di ogni messaggio che muore (cancellazione, scadenza della stanza, account). Il job `purge-expired-content` ora gira **ogni 5 minuti** e dopo la pulizia chiama `private.invoke_storage_gc()`, che a sua volta chiama la Edge Function `storage-gc` con `pg_net`.
- **Realtime**: `chat_messages` è nella publication `supabase_realtime`; Realtime applica la policy di lettura per ogni abbonato.
- **Edge Functions**: `chat-photo-urls` (JWT utente, `verify_jwt` attivo; firma per 1 ora solo i path che `get_chat_photo_paths` restituisce all'utente) e `storage-gc` (`verify_jwt = false` in `config.toml`: la chiama pg_cron senza JWT; l'unica credenziale è l'header `x-gc-key` contro il secret `STORAGE_GC_KEY`, confronto a tempo costante, fail closed).

### Azioni manuali per Luca (dopo aver applicato la migration `20261108000100_night_chat.sql`)

1. Genera una chiave lunga e casuale e salvala come secret (il valore non va mai in un file):
   `npx supabase secrets set STORAGE_GC_KEY=<valore>`
2. Pubblica le due funzioni (la seconda **senza** verifica JWT):
   `npx supabase functions deploy chat-photo-urls`
   `npx supabase functions deploy storage-gc --no-verify-jwt`
3. Nel SQL editor del progetto salva i due segreti in Vault (stesso valore del punto 1; l'URL è quello del progetto):
   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/storage-gc', 'storage_gc_url');
   select vault.create_secret('<stesso valore di STORAGE_GC_KEY>', 'storage_gc_key');
   ```
4. Dashboard → Database → Extensions: verifica che `pg_net` e `pg_cron` siano attive (la migration abilita `pg_net` se disponibile).
5. Verifica: `select jobname, schedule, command from cron.job where jobname = 'purge-expired-content';` deve mostrare `*/5 * * * *` e le due chiamate. Dopo qualche minuto `select * from net._http_response order by created desc limit 5;` deve mostrare risposte 200 di `storage-gc`.

## Il giorno dopo: post, feed, like, commenti, storie (prompt 11)

Dettagli e verifiche in `docs/posts-feed.md`.

- **Pubblicazione solo via `create_post`**: la policy e il privilegio di insert diretto su `posts` sono revocati (accettavano qualsiasi serata e qualsiasi `photo_path`). Anche l'insert diretto su `post_comments` è revocato: si commenta con `add_post_comment` (1–300 caratteri). I like restano su `post_likes` (RLS: solo post visibili) e sulla RPC `set_post_like`.
- **`get_post_target()`** è la regola `canPost`: la mia dichiarazione più recente, attiva o scaduta da meno di 24 ore. `create_post` la usa e risponde `NO_RECENT_DECLARATION` se manca. I due path (`photo_path` per il post, `chat_photo_path` per la chat) devono essere esattamente `<mio id>/<uuid>.jpg`.
- **Cambio di firma di `get_feed`**: da `(before timestamptz, limit int)` a `(before_visible timestamptz, before_id uuid, limit int)`, con ordine `(visible_from desc, post_id desc)`. Prima tutti i post di una serata avevano lo stesso `visible_from` e la seconda pagina saltava i pari merito. La vecchia funzione è eliminata dalla migration `20261109000100_posts_feed.sql`; nessun client la usava. Non restituisce mai `photo_path` (solo `has_photo`).
- **Visibilità in un punto solo**: `private.visible_posts()` (miei, o di follow accettato nella finestra, mai tra bloccati né scaduti) alimenta feed, storie, like, commenti e `get_post_photo_paths`.
- **Moderazione**: `report('comment', id)` è ora ammesso (nuovo valore nel check di `reports.target_kind`).
- **Coda file**: un trigger su `posts` accoda la foto di ogni post che muore (cancellazione, scadenza, account) nella coda di `storage-gc`.
- **Errori nuovi**: `NO_RECENT_DECLARATION`, `INVALID_POST`, `INVALID_COMMENT`, `POST_NOT_FOUND`.
- **Edge Function** `post-photo-urls` (JWT utente, `verify_jwt` attivo): corpo `{ postIds }`, firma per 1 ora solo i path restituiti da `get_post_photo_paths`. Condivide con `chat-photo-urls` la logica in `functions/_shared/photoUrls.ts`.

### Azioni manuali per Luca (dopo aver applicato la migration `20261109000100_posts_feed.sql`)

1. Pubblica la nuova funzione (con verifica JWT, il default):
   `npx supabase functions deploy post-photo-urls`
2. Ripubblica anche `chat-photo-urls`, perché ora usa il modulo condiviso:
   `npx supabase functions deploy chat-photo-urls`
3. Rigenera i tipi con il progetto locale acceso: `npm run db:types` (in questo ambiente `src/lib/database.types.ts` è stato aggiornato a mano, in ordine alfabetico; la rigenerazione deve dare lo stesso risultato).

## Notifiche (prompt 15)

Vedi `docs/notifications.md` per il flusso completo. Oggetti nuovi (migration `20261114000100_notifications.sql`):

- `profiles.notification_prefs` (jsonb) con `get_my_notification_prefs()` / `set_my_notification_prefs(jsonb)` (errore `INVALID_PREFS`).
- `register_push_token(token, platform)` (riassegna il token al chiamante), `unregister_push_token(token)`; nessuna RPC restituisce token.
- `get_my_activity(since)`: novità in-app (like, commenti, richieste, accettazioni), solo handle.
- `private.notification_queue`, `private.push_log`, `private.event_band_notified`; trigger su `follows`, `chat_messages`, `declarations`, `events`; `private.can_see_chat_author_for(viewer, author)` (la regola di visibilità della chat vive qui, `can_see_chat_author` la richiama).
- Job pg_cron: `dispatch-notifications` (ogni minuto), `queue-feed-digests` (`5 * * * *`).
- Edge Function `send-push` (`verify_jwt = false`, credenziale `x-push-key`).

### Azioni manuali per Luca

1. Secret dell'Edge Function: `npx supabase secrets set SEND_PUSH_KEY=<valore lungo casuale>`.
2. Deploy: `npx supabase functions deploy send-push --no-verify-jwt`.
3. Segreti in Vault (SQL editor del progetto):
   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-push', 'send_push_url');
   select vault.create_secret('<stesso valore di SEND_PUSH_KEY>', 'send_push_key');
   ```
   Finché mancano, il dispatcher non chiama nulla (notice) e le righe restano in coda per 2 giorni.
4. Credenziali push per le build (una tantum, caricate su EAS): **Android** chiave FCM V1 (service account Firebase) e **iOS** chiave APNs (`eas credentials`). Senza, le push remote non arrivano; i promemoria locali sì.
5. Le push remote non funzionano in Expo Go su Android: servono il dev client o una build.
6. Applicare la migration al progetto remoto (`supabase db push`) quando Luca lo decide.

### @handle scelto dall'utente (migration `20261117000100_custom_handle.sql`)

Nessuna azione manuale oltre `npx supabase db push`. Regole, blocklist, limite e privacy in `docs/handles.md`. Aggiunge `private.is_valid_handle(text)` (l'unica regola di formato, usata anche dal check `profiles_handle_format`; è eseguibile da `authenticated` perché il check gira a ogni update del profilo), `private.normalize_handle`, `private.handle_blocked`, la tabella `private.handle_blocklist` e le RPC `set_handle(handle)` e `is_handle_available(handle)`. `regenerate_handle()` segue lo stesso limite di 30 giorni. Errori: `INVALID_HANDLE`, `HANDLE_NOT_ALLOWED`, `HANDLE_TAKEN`, `HANDLE_CHANGE_TOO_SOON` (sostituisce `HANDLE_ALREADY_CHANGED`). `generate_handle()` ora non supera i 20 caratteri.

### @handle libero in onboarding (migration `20261117000200_handle_onboarding.sql`)

Nessuna azione manuale oltre `npx supabase db push`. Aggiunge `profiles.handle_confirmed_at` (null = handle non ancora confermato; letto dal client solo sul proprio profilo), con backfill `coalesce(handle_changed_at, created_at)` per i profili con `birth_date` valorizzata. Finché è null `set_handle` e `regenerate_handle` non hanno limite e non valorizzano `handle_changed_at`; la nuova RPC `confirm_handle()` (idempotente, solo `authenticated`) imposta `handle_confirmed_at` e `handle_changed_at` a now() e fa partire i 30 giorni. Il client non apre l'app principale finché l'handle non è confermato. Dettagli in `docs/handles.md`.

### Un cambio @handle gratuito per tutti (migration `20261117000300_handle_free_change.sql`)

Nessuna azione manuale oltre `npx supabase db push`. Aggiunge `profiles.handle_free_change_used boolean not null default false` (letto dal client solo sul proprio profilo): tutti gli utenti, esistenti inclusi, hanno un cambio di @tag subito dopo l'onboarding, senza i 30 giorni. `set_handle` e `regenerate_handle` (ricreate) lo consumano al primo cambio riuscito e fanno ripartire il limite di 30 giorni; i rifiuti, il no-op, l'onboarding e `confirm_handle()` non lo consumano. Dettagli in `docs/handles.md`.

### Città della mappa sul profilo (migration `20261120000200_set_profile_city.sql`)

Nessuna azione manuale oltre `npx supabase db push`. Aggiunge la RPC `set_profile_city(p_city_slug text) returns void` (`security definer`, solo `authenticated` e `service_role`): aggiorna **solo** `profiles.city_id` del chiamante, è idempotente e rifiuta le città inesistenti o non attive con `CITY_NOT_ACTIVE`. Il client la chiama quando la città risolta (scelta nel profilo o nella Ricerca, oppure rilevata dalla cella grossolana) differisce da quella del profilo; viaggia solo lo slug della città, mai la posizione. Serve al server per ciò che dipende dalla città dell'utente, per esempio il digest del feed delle 12:00 nel fuso della città (`private.queue_feed_digests`). Il client legge lo slug della propria città dal proprio profilo (`cities(slug)` via `profiles.city_id`, solo riga propria).

### Feedback in-app (migration `20261120000500_feedback.sql`)

Nessuna azione manuale oltre `npx supabase db push`. Aggiunge il bucket privato `feedback` (upload solo in `<user_id>/…`, nessuna lettura per gli utenti), la tabella `public.feedback` (RLS attiva, nessuna policy né privilegio per i client) e la RPC `submit_feedback` (`security definer`, solo `authenticated`): voto 1–5 obbligatorio (`INVALID_RATING`), commento fino a 1000 caratteri (`INVALID_FEEDBACK_COMMENT`), schermata 1–200 caratteri (`INVALID_SCREEN`), piattaforma `ios`/`android` (`INVALID_PLATFORM`), percorso screenshot esattamente `<uid>/<uuid>.jpg` o `null` (`INVALID_SCREENSHOT`), al massimo 10 invii nelle ultime 24 ore (`FEEDBACK_LIMIT`). Il job `purge-old-feedback` cancella dopo 180 giorni e accoda gli screenshot; la migration ridefinisce anche `delete_my_account()` perché cancelli i feedback e accodi gli screenshot. Come si leggono e cosa dire nell'informativa: `docs/feedback.md`.

### Foto profilo e profilo in stile Instagram (migration `20261120000600_profile_avatar.sql`)

Dettagli di visibilità in `docs/profile.md`. Oggetti nuovi:

- **Bucket** `avatars` (privato, 2 MB, solo `image/jpeg`): upload e delete solo nel proprio prefisso `<user_id>/…`, nessuna lettura per i client.
- **`profiles.avatar_path`**: letto solo dalla propria riga (RLS `profiles_own_read`); non è nel grant di update e `public_profiles` non lo espone. Si scrive solo con `set_avatar(path)` (path esattamente `<uid>/<uuid>.jpg`, altrimenti `INVALID_AVATAR_PATH`; il file precedente va in `private.storage_deletion_queue`) e `clear_avatar()`.
- **`private.can_see_avatar(viewer, owner)`**: vero se sono io, oppure se seguo l'owner con follow accettato e non c'è un blocco in nessuna direzione; falso per profili cancellati. `get_avatar_paths(user_ids uuid[])` (max 100, `INVALID_ARGUMENT` oltre) restituisce solo i path visibili al chiamante ed è usata dalla Edge Function di firma.
- **`get_profile_summary(user_id)`**: handle, fascia d'età, genere, `is_creator`, `follow_state` per chiunque; `followers_count`, `following_count`, `posts_count` solo per me e per i follower accettati, altrimenti `null`. Nessuna riga per bloccati e profili cancellati.
- **`get_user_posts(user_id, before_visible, before_id, limit)`**: stessi campi di `get_feed`, post attivi di una persona visibili al chiamante (`private.visible_posts()`), cursore composto, massimo 50 per pagina.
- **`delete_my_account()`** ridefinita (tutto invariato, feedback compreso) per accodare anche l'avatar e azzerare `avatar_path`.
- **Edge Function** `avatar-urls` (JWT utente, `verify_jwt` attivo): corpo `{ userIds }`, firma per 1 ora solo i path restituiti da `get_avatar_paths`, con la logica condivisa di `functions/_shared/photoUrls.ts`.
- **Errore nuovo**: `INVALID_AVATAR_PATH`.

#### Azioni manuali per Luca

1. Applica la migration: `npx supabase db push`.
2. Pubblica la funzione (con verifica JWT, il default): `npx supabase functions deploy avatar-urls`.
3. Nessun nuovo secret. `storage-gc` svuota già la coda anche per il bucket `avatars`.
