# Google Places: cosa salviamo e come restiamo nei termini

Valutazione dell'architetto/sviluppatore sui termini di Google Maps Platform per l'uso di Places API (New). Da rivedere se Google cambia i termini. Non è consulenza legale.

## Cosa salviamo, e per quanto

| Dato                                                     | Dove                                                                 | Durata                                                                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `place_id` (`venues.google_place_id`)                    | `venues`                                                             | **A tempo indeterminato.** È l'unico dato Places che i termini consentono di conservare senza limiti.                                               |
| Nome, coordinate, indirizzo, orari di apertura, sito web | `venues.name`, `location`, `address`, `opening_hours`, `website_uri` | **Al massimo 30 giorni** dall'ultima sync (`places_synced_at`). Si rinfrescano con la sync (`npm run venues:sync`) o con `places-detail` on demand. |
| Tipo di locale (`kind`)                                  | `venues.kind`                                                        | Deriva da `primaryType` e dalla query: è una nostra classificazione, non un campo salvato così com'è.                                               |

Il job `expire-stale-places` (ogni giorno, 04:30 UTC) applica la regola dei 30 giorni lato server: i locali reali con `places_synced_at` più vecchio di 30 giorni vengono disattivati e perdono nome, coordinate, indirizzo e orari (`name = google_place_id`). Non è una promessa della UI. Per questo la sync va rilanciata almeno ogni settimana (vedi `docs/places-sync.md`).

## Field mask minimo

Chiediamo a Google **solo i campi che salviamo**: `id, displayName, location, formattedAddress, primaryType` e `regularOpeningHours` (Text Search); `id, displayName, location, formattedAddress, regularOpeningHours, websiteUri` (Place Details del dettaglio locale); `id, displayName, formattedAddress, location, types, primaryType` (Place Details Pro della selezione dalla ricerca). Niente recensioni, foto, rating o telefono. Il **sito web** (`websiteUri`) è solo nella Place Details del dettaglio locale: quella chiamata è già Enterprise per `regularOpeningHours` e `websiteUri` rientra nella stessa fascia, quindi il costo per chiamata non cambia. **Non** va mai nella Text Search (`places-sync`) né nella selezione Pro della ricerca: lì farebbe passare la richiesta a una fascia più cara (due test Deno lo verificano). Il sito si salva in `venues.website_uri` con le stesse regole dei 30 giorni (`expire_stale_places` lo azzera con gli altri contenuti). Poiché la Text Search non lo porta, `places-detail` esegue la Details anche la prima volta che si apre un locale mai passato da lì (`venues.details_synced_at` nullo) e poi al massimo una volta ogni 30 giorni. Un test Deno verifica la maschera esatta.

## Ricerca come su Google Maps (prompt 20)

- **Autocomplete (New)** (`places-search`): il testo digitato va solo a Google tramite la Edge Function, con `sessionToken`, `locationRestriction` = cerchio della città, `includedRegionCodes` = paese, `languageCode` = lingua dell'utente. Non viene salvato né scritto nei log. Nessuna field mask: la risposta è fissa.
- **Place Details Pro** alla selezione (`places-detail` con `place_id`): field mask `id,displayName,formattedAddress,location,types,primaryType`, con lo stesso `sessionToken` che chiude la sessione. Niente orari di apertura (cambierebbero SKU).
- **Cache**: il luogo scelto entra in `venues` con `places_synced_at`, quindi le stesse regole dei 30 giorni (`expire_stale_places`). Un indirizzo (senza `establishment`/`point_of_interest`) diventa uno spot `source = 'places'` con nome = indirizzo formattato e scade con gli stessi 30 giorni. Gli spot creati dagli utenti non hanno dati Google (id sintetico `spot:<uuid>`) e non passano mai da Places.
- **Attribuzione**: sotto i "Risultati da Google" c'è la dicitura **"Google Maps"**, richiesta quando i risultati non sono mostrati su una mappa Google.
- Costi e quote: `docs/places-costs.md`.

## Tetto richieste e dry run

- Ogni sync per città fa al massimo `max_requests` chiamate Text Search (default 10, massimo assoluto 20). Il tetto è applicato in codice: le query pianificate vengono troncate a `max_requests` e c'è una chiamata per query (nessuna paginazione).
- `--dry-run` (`dry_run: true`) **non chiama Google**: restituisce le query pianificate e `estimated_calls`. Usarlo prima di una sync reale.
- Le chiamate effettive sono registrate nel log della funzione (`calls=N`) e stampate dallo script.
- Place Details solo on demand, al massimo una volta ogni 30 giorni per locale (decisione server in `shouldRefresh`, su `places_synced_at` e `details_synced_at`); i locali demo non vanno mai su Google.
- Le query nascono dalla riga `cities` (nome, paese, `places_radius_m`, `places_areas`): nessuna città è scritta nel codice.

## Attribuzione

Dove mostriamo dati Places (schermata Ricerca, e poi il dettaglio locale) c'è la dicitura **"Informazioni da Google Maps"** / "Information from Google Maps". Il dettaglio locale (prompt 08) deve offrire anche **"Apri in Google Maps"**: il link si costruisce con `googleMapsPlaceUrl(placeId)` (`src/features/venues/domain/googleMaps.ts`).

## Apple Maps su iOS

La mappa iOS usa Apple Maps. I dati Places nel nostro database (nome, indirizzo) sono entro i limiti di conservazione di cui sopra e compaiono nell'interfaccia dell'app, non come livello Google sulla mappa Apple. Ciò che la mappa disegna sono **i nostri dati** (affluenza "stasera", strato "di solito"), con le coordinate dei locali come posizione. Valutazione: accettabile finché (1) le coordinate restano aggiornate entro 30 giorni dalla sync, (2) non mostriamo tile, foto o contenuti Google su mappe non Google. Da ricontrollare con la consulenza legale prima del lancio.

## Popular times: vietati

I "Popular times" di Google **non sono esposti dall'API** e farne scraping viola i termini di Google Maps Platform. Quindi:

- nessuna libreria o servizio tipo `populartimes`, SerpApi o simili, né nel client né in una Edge Function;
- lo strato "di solito" (`venue_typical_busyness`) nasce da **curatela manuale** (`source = 'manual'`) a partire da informazioni pubbliche del locale stesso (sito, profili social, orari di apertura, giorni forti dichiarati), e viene poi sostituito dalla nostra media storica (`source = 'history'`, k ≥ 3);
- il template del CSV è `supabase/seed/typical_busyness.template.csv`; un locale senza righe ha `typical_level` 0 ovunque ed è una scelta esplicita.

## Chiavi

- `GOOGLE_PLACES_API_KEY` vive solo nei secret delle Edge Function di Supabase. Mai nel client, nel repo o nei log.
- Non è `GOOGLE_MAPS_ANDROID_API_KEY`, che è la chiave dell'SDK Maps nel manifest Android.
- La chiave Places va ristretta alla sola Places API (New) nella console Google Cloud.
