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

| Tabella                                | Contenuto                                                                           | Chi la legge                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `cities`                               | città (Milano attiva; Las Palmas, Madrid, Barcellona inattive)                      | utenti autenticati                                     |
| `venues`                               | locali (da Google Places, prompt 06; ora 20 demo)                                   | utenti autenticati                                     |
| `venue_typical_busyness`               | strato "di solito": livello 0–3 per venue/giorno/ora, `source` `manual` o `history` | utenti autenticati                                     |
| `night_hour_stats`                     | medie storiche per venue/giorno/ora, **mai per utente**                             | nessun client                                          |
| `profiles`                             | handle, data di nascita, genere, città, lingua, consensi, posizione grossolana      | **solo la propria riga**                               |
| `public_profiles` (view)               | `id, handle, age_band, gender, is_creator`                                          | utenti autenticati: **unico accesso ad altri profili** |
| `follows`                              | A → B con `status` `pending` / `accepted`                                           | solo le proprie righe (entrambe le direzioni)          |
| `accepted_follows` (view)              | follow accettati                                                                    | come `follows`                                         |
| `blocks`                               | blocchi                                                                             | solo i propri                                          |
| `events`                               | serate dei creator                                                                  | utenti autenticati                                     |
| `nights`                               | serata logica di un locale (06:00 → 06:00, fuso della città)                        | utenti autenticati                                     |
| `declarations`                         | "Ci vado" / "Forse"                                                                 | solo le proprie (scritture solo via RPC)               |
| `chat_rooms`, `chat_messages`          | chat della serata                                                                   | membri della serata; messaggi propri o di chi seguo    |
| `posts`, `post_likes`, `post_comments` | foto del giorno dopo                                                                | vedi "Visibilità"                                      |
| `search_history`                       | ultime ricerche (max 20)                                                            | solo le proprie                                        |
| `contact_hashes_tmp`, `phone_hashes`   | hash SHA-256 di numeri E.164                                                        | **nessun client**                                      |
| `reports`                              | segnalazioni                                                                        | nessun client (moderatori via service role)            |
| `subscriptions`, `push_tokens`         | abbonamento creator, token push                                                     | solo i propri                                          |
| `private.*`                            | liste per gli handle, conteggi per serata, code di cancellazione                    | nessun client                                          |

## Garanzie di privacy

1. **Identità pubblica.** Gli altri vedono solo handle `animale.colore`, fascia d'età, genere e flag creator. Email (in `auth.users`), data di nascita, posizione e telefono non sono in nessuna view né in nessun risultato di RPC. Un test pgTAP verifica che nessuna RPC abbia colonne di output con nomi come email, birth, coarse, phone, hash.
2. **k-anonimato (k = 3).** L'affluenza è sempre una fascia (`pochi`, `3–10`, `10–20`, `20–30`, `30–50`, `50–100`, `100+`). Età media e percentuali di genere sono `NULL` se il gruppo ha meno di 3 persone. Nel segmento "Tutti" lo stesso vale per ogni sottogruppo non vuoto ("Ci vado" o "Forse"), altrimenti la differenza tra due segmenti rivelerebbe una singola persona. Sulla mappa un locale con meno di 3 dichiarazioni non è mai un punto caldo.
3. **Posizione.** È opt-in, arrotondata al centro di una cella di 0,005° (~500 m) da `coarsen()` dentro la RPC e cancellata dopo 3 ore. Spegnendo il consenso si cancella subito. Non esiste uno storico.
4. **Contatti.** Opt-in anche lato server (`CONTACTS_OPT_OUT`). Si inviano solo hash SHA-256 (64 caratteri esadecimali), cancellati dentro la stessa chiamata e comunque entro 10 minuti. Il proprio hash serve solo a farsi trovare e non è leggibile da nessun client.
5. **Contenuti effimeri.** Chat cancellata 2 giorni dopo la fine della serata. Post visibili dal giorno dopo alle 06:00 e cancellati 7 giorni dopo. Dichiarazioni scadute invisibili e cancellate dopo 7 giorni.
6. **Follow con accettazione.** Una richiesta nasce sempre `pending`: inserire `accepted` è rifiutato e solo il followee può accettare. Una richiesta pending non sblocca nulla. Rifiuto, rimozione e blocco hanno effetto immediato. Dove sei stasera, post, storie, amici al locale e messaggi in chat sono visibili solo con follow accettato. Chi ha messo like lo vedono solo l'autore e chi l'ha messo, per non rivelare chi segue chi. I blocchi valgono in entrambe le direzioni in ogni lettura sociale.
7. **Moderazione.** Le segnalazioni sono scrivibili da tutti e leggibili solo dai moderatori. Il blocco elimina i follow in entrambe le direzioni.
8. **Cancellazione account.** `delete_my_account()` elimina subito contenuti, relazioni e dati personali. Una Edge Function con service role elimina `auth.users` entro 24 h (coda `private.account_deletion_requests`). Le foto vanno in `private.storage_deletion_queue`, perché Supabase non permette di cancellare oggetti di Storage via SQL.
9. **Strato "di solito".** Viene da curatela manuale (`source='manual'`) o dalla nostra storia aggregata (`source='history'`, solo celle con almeno 3 serate e media di almeno 3 dichiarati). Non usa mai i Popular times di Google e non si somma mai alle dichiarazioni di stasera.

## RPC (tutte `security definer`, `search_path` fissato, eseguibili solo da `authenticated`)

Gli errori sono codici tipizzati nel messaggio dell'eccezione: `NOT_AUTHENTICATED`, `UNDERAGE`, `INVALID_ARGUMENT`, `INVALID_INTENT`, `CITY_NOT_ACTIVE`, `VENUE_NOT_ACTIVE`, `EVENT_NOT_ACTIVE`, `LOCATION_OPT_OUT`, `CONTACTS_OPT_OUT`, `INVALID_HASH`, `CANNOT_FOLLOW_SELF`, `BLOCKED`, `NOT_CREATOR`, `NOT_FOUND`.

| Area           | RPC                                                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profilo        | `complete_profile(birth_date, gender, city_slug, locale, location_opt_in, contacts_opt_in, is_creator)`, `set_locale`, `update_coarse_location(lat, lng)`, `delete_my_account()`       |
| Serata         | `declare(intent, venue_id?, event_id?)` (una sola dichiarazione attiva), `undeclare()`, `get_my_declaration()`                                                                         |
| Mappa e locali | `get_city_map(city_slug, 'general'\|'friends')`, `get_venue_stats(venue_id, 'going'\|'maybe'\|'all')`, `search_venues(city_slug, kind?, query?)`, `get_recommended_venue(city_slug)`   |
| Persone        | `search_users(query)`, `request_follow`, `cancel_follow_request`, `accept_follow`, `decline_follow`, `unfollow`, `remove_follower`, `get_follow_requests()`, `count_follow_requests()` |
| Contatti       | `match_contacts(hashes[])`, `set_my_phone_hash(hash)`, `clear_my_phone_hash()`                                                                                                         |
| Feed           | `get_feed(before?, limit?)`, `get_stories()`                                                                                                                                           |
| Creator        | `create_event(...)`, `get_my_creator_events()`, `get_event_attendance(event_id)`                                                                                                       |
| Moderazione    | `report(kind, id, reason)`, `block_user`, `unblock_user`                                                                                                                               |

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

## Storage

I bucket `posts` e `chat-photos` sono privati. Il caricamento è permesso solo nel proprio prefisso `<user_id>/…`. **Non esiste una policy di lettura**: le immagini si servono solo con signed URL generati lato server (prompt 10–11).

## Decisioni rispetto a `roadmap/04`

- `venue_typical_busyness` ha come chiave `(venue_id, weekday, hour, source)`, così la riga `history` prevale senza cancellare quella `manual`.
- `private.night_attendance` conserva solo i **conteggi per serata**, perché le dichiarazioni vengono cancellate dopo 7 giorni ma lo storico copre 8 settimane. Ogni serata si attribuisce alle ore 21–02 (una dichiarazione non dice l'orario).
- La chat mostra solo i messaggi propri o di chi segui con follow accettato (principio 6), non tutti quelli dei membri della serata.
- `match_contacts` richiede `contacts_opt_in` anche lato server.
- Le scritture su `profiles`, `declarations`, `follows.status` ed `events` (sponsorizzazione esclusa) sono limitate per colonna. Tutto il resto passa dalle RPC.
