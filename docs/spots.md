# Spot: serate in un punto qualsiasi (prompt 20)

Uno **spot** è una riga di `venues` con `kind = 'spot'`. Così dichiarazioni, night, chat, hot spot, k-anonimato e moderazione usano gli stessi percorsi dei locali.

## Due tipi

| `source` | Come nasce                                                                                               | Dati                                                | Scadenza                                     |
| -------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------- |
| `user`   | Pressione lunga di 3 s sulla mappa + nome (`declare_at_spot`)                                            | Nome scelto, punto arrotondato a 4 decimali (~10 m) | `spot_expires_at` = fine della night (06:00) |
| `places` | Indirizzo scelto con la ricerca Google (`places-detail` → `upsert_search_place`), poi `declare_at_place` | Indirizzo formattato come nome, coordinate Google   | 30 giorni dalla sync (regole Places)         |

I luoghi con `establishment`/`point_of_interest` scelti dalla ricerca sono invece venue normali (`kind` mappato come nel prompt 06).

## Regole

- Nome 3-40 caratteri (code point), senza `@` e senza link (`https?://`, `www.`, `.dominio`). La regola è in `private.is_valid_spot_name` e specchiata in `src/features/spots/domain/spotName.ts`.
- Il punto deve stare entro `places_radius_m` dal centro di una città attiva (`OUT_OF_CITY`).
- **Un solo spot creato per utente per night** (`SPOT_LIMIT`). Stesso nome e stesso punto riusano lo spot: serve a cambiare idea tra SI e FORSE.
- La dichiarazione passa da `public.declare`: una sola dichiarazione per sera, night e chat identici ai locali.

## Visibilità e k-anonimato (principio 2)

Uno spot compare sulla mappa solo se ha almeno una dichiarazione attiva, non è nascosto e non è scaduto. **Sotto 3 persone `going_band` e `maybe_band` sono `NULL`** (non "pochi"): l'esistenza dello spot è l'unico segnale, la UI mostra il marker `SPOT` senza numeri. Da 3 persone è un hot spot normale con le fasce. Gli spot non hanno mai `typical_level` e non compaiono nella ricerca del catalogo. `get_venue_stats` applica la stessa regola.

## Privacy (principio 1)

`created_by` è salvato per far rispettare il limite ma **non esce mai**: nessuna RPC lo restituisce e `authenticated` non ha il grant di colonna su `venues.created_by` (né su `hidden_at`). Gli spot non sono leggibili con select diretta (policy `kind <> 'spot'`): solo tramite RPC. Il pgTAP `25_spots.sql` lo verifica scandendo `pg_proc`.

## Moderazione (principio 7)

Il nome è UGC. `report('spot', id)` accetta solo venue con `kind = 'spot'`. A **3 segnalatori distinti** con segnalazioni non risolte, `hidden_at` viene valorizzato: lo spot sparisce da mappa, scheda, ricerca e nuove dichiarazioni; le dichiarazioni esistenti restano (chi le ha fatte le vede ancora). Un moderatore ripristina con `hidden_at = null` e risolvendo le segnalazioni. Limite noto: tre account fasulli possono nascondere uno spot; è mitigato dal fatto che lo spot dura una notte.

## Ciclo di vita (principio 5)

Alle 06:00 lo spot sparisce dalla mappa (filtro). La riga viene cancellata da `private.purge_expired_spots` (ogni 10 minuti) solo dopo `spot_expires_at + 2 giorni` e solo se non restano chat vive, post vivi né eventi: la cancellazione a cascata di `nights` non accorcia la chat.

## Client

`src/features/spots`: dominio puro (`spotName`, `longPress`), `useSpotLongPress` (macchina a stati su `onTouchStart/Move/End` del contenitore della mappa: pan e pinch non interferiscono), `SpotPressSurface` + anello di avanzamento, `SpotSheet`. Il gesto non è verificabile in Jest su device: va provato a mano su iOS e Android.
