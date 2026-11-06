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

| Tabella                                | Contenuto                                                                                    | Chi la legge                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `cities`                               | città (Milano attiva; Las Palmas, Madrid, Barcellona inattive)                               | utenti autenticati                                     |
| `venues`                               | locali (da Google Places, prompt 06; finché una città non ha 10 locali reali restano i demo) | utenti autenticati                                     |
| `venue_typical_busyness`               | strato "di solito": livello 0–3 per venue/giorno/ora, `source` `manual` o `history`          | utenti autenticati                                     |
| `night_hour_stats`                     | medie storiche per venue/giorno/ora, **mai per utente**                                      | nessun client                                          |
| `profiles`                             | handle, data di nascita, genere, città, lingua, consensi, posizione grossolana               | **solo la propria riga**                               |
| `public_profiles` (view)               | `id, handle, age_band, gender, is_creator`                                                   | utenti autenticati: **unico accesso ad altri profili** |
| `follows`                              | A → B con `status` `pending` / `accepted`                                                    | solo le proprie righe (entrambe le direzioni)          |
| `accepted_follows` (view)              | follow accettati                                                                             | come `follows`                                         |
| `blocks`                               | blocchi                                                                                      | solo i propri                                          |
| `events`                               | serate dei creator                                                                           | utenti autenticati                                     |
| `nights`                               | serata logica di un locale (06:00 → 06:00, fuso della città)                                 | utenti autenticati                                     |
| `declarations`                         | "Ci vado" / "Forse"                                                                          | solo le proprie (scritture solo via RPC)               |
| `chat_rooms`, `chat_messages`          | chat della serata                                                                            | membri della serata; messaggi propri o di chi seguo    |
| `posts`, `post_likes`, `post_comments` | foto del giorno dopo                                                                         | vedi "Visibilità"                                      |
| `search_history`                       | ultime ricerche (max 20)                                                                     | solo le proprie                                        |
| `contact_hashes_tmp`, `phone_hashes`   | hash SHA-256 di numeri E.164                                                                 | **nessun client**                                      |
| `reports`                              | segnalazioni                                                                                 | nessun client (moderatori via service role)            |
| `subscriptions`, `push_tokens`         | abbonamento creator, token push                                                              | solo i propri                                          |
| `private.*`                            | liste per gli handle, conteggi per serata, code di cancellazione                             | nessun client                                          |

## Garanzie di privacy

1. **Identità pubblica.** Gli altri vedono solo handle `animale.colore`, fascia d'età, genere e flag creator. Email (in `auth.users`), data di nascita, posizione e telefono non sono in nessuna view né in nessun risultato di RPC. Un test pgTAP verifica che nessuna RPC abbia colonne di output con nomi come email, birth, coarse, phone, hash.
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

| Area           | RPC                                                                                                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profilo        | `complete_profile(birth_date, gender, city_slug, locale, location_opt_in, contacts_opt_in, is_creator)`, `set_locale`, `update_coarse_location(lat, lng)`, `regenerate_handle()` (una sola volta), `delete_my_account()`                                                                                      |
| Serata         | `declare(intent, venue_id?, event_id?)` (una sola dichiarazione attiva), `undeclare()`, `get_my_declaration()`                                                                                                                                                                                                |
| Mappa e locali | `get_city_map(city_slug, 'general'\|'friends')`, `get_venue_stats(venue_id, 'going'\|'maybe'\|'all')`, `search_venues(city_slug, kind?, query?)`, `get_recommended_venue(city_slug)`, `remember_venue(venue_id)`                                                                                              |
| Persone        | `search_users(query)`, `request_follow`, `cancel_follow_request`, `accept_follow`, `decline_follow`, `unfollow`, `remove_follower`, `get_follow_requests()`, `count_follow_requests()`, `get_following()` (solo follow accettati, con il locale di stasera), `get_followers()`, `get_blocked_users()`         |
| Contatti       | `match_contacts(hashes[])`, `set_my_phone_hash(hash)`, `clear_my_phone_hash()`                                                                                                                                                                                                                                |
| Feed           | `get_feed(before_visible?, before_id?, limit?)`, `get_stories()`, `get_story_posts(user_id)`, `get_post_target()`, `create_post(caption?, photo_path?, chat_photo_path?)`, `set_post_like`, `get_post_comments`, `add_post_comment`, `delete_post_comment`, `delete_post`, `get_post_photo_paths(post_ids[])` |
| Creator        | `create_event(...)`, `update_event(...)`, `cancel_event(event_id)`, `get_my_creator_events('upcoming'\|'past')`, `get_event_attendance(event_id)` (prompt 12)                                                                                                                                                 |
| Serate         | `get_city_events(city_slug, query?, days?)`, `get_event_detail(event_id)` (prompt 12)                                                                                                                                                                                                                         |
| Moderazione    | `report(kind, id, reason)`, `block_user`, `unblock_user`                                                                                                                                                                                                                                                      |

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
| `process-account-deletions`    | ogni ora (:15)                   | elimina da `auth.users` gli account per cui è stata chiesta la cancellazione                                |
| `expire-stale-places`          | ogni giorno 04:30 UTC            | locali Places non sincronizzati da 30 giorni: disattivati, senza nome/indirizzo/orari                       |

## Supabase Auth (prompt 05)

- Accesso con email e password (min. 8 caratteri) e **conferma email obbligatoria**. I link delle email tornano all'app con flusso PKCE su `rightplace://auth/callback` (in Expo Go: `exp://…/--/auth/callback`).
- La lingua scelta alla registrazione (`user_metadata.locale`) viene copiata in `profiles.locale` dal trigger di registrazione. `set_locale` aggiorna entrambe, così le email di conferma e di reset escono in italiano o in inglese (template in `templates/`).
- Captcha: Cloudflare Turnstile, attivato insieme a `EXPO_PUBLIC_TURNSTILE_SITE_KEY` nel client.
- Configurazione locale in `config.toml`. Sul progetto hosted gli stessi valori vanno impostati dalla dashboard (vedi il README principale).

## Storage

I bucket `posts` e `chat-photos` sono privati. Il caricamento è permesso solo nel proprio prefisso `<user_id>/…`. **Non esiste una policy di lettura**: le immagini si servono solo con signed URL generati lato server (`chat-photo-urls` per la chat, prompt 10; `post-photo-urls` per i post, prompt 11).

## Decisioni rispetto a `roadmap/04`

- `venue_typical_busyness` ha come chiave `(venue_id, weekday, hour, source)`, così la riga `history` prevale senza cancellare quella `manual`.
- `private.night_attendance` conserva solo i **conteggi per serata**, perché le dichiarazioni vengono cancellate dopo 7 giorni ma lo storico copre 8 settimane. Ogni serata si attribuisce alle ore 21–02 (una dichiarazione non dice l'orario).
- La chat mostra solo i messaggi propri o di chi segui con follow accettato (principio 6), non tutti quelli dei membri della serata.
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
- `places-detail`: chiamata dall'app con il JWT utente; Place Details solo se i dati hanno 30 giorni o più.
- **Colonne** `cities.places_radius_m` (1000–50000, default 8000) e `cities.places_areas` (quartieri usati nelle query).
- **RPC solo `service_role`** (revocate ad `anon` e `authenticated`): `sync_places_venues(city_slug, rows)` (upsert su `google_place_id`; disattiva i demo della sola città quando ha almeno 10 locali reali attivi), `get_city_sync_info(city_slug)`, `import_typical_manual(city_slug, rows)` (atomica; rimpiazza solo le righe `manual`, errori `UNKNOWN_VENUE` / `INVALID_ARGUMENT` / `NOT_FOUND`).
- **RPC per gli utenti**: `remember_venue(venue_id)` scrive solo nella cronologia ricerche propria.
- **Job**: `expire-stale-places` (tabella sopra).

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
