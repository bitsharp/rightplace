# 06 — Locali da Google Places e schermata Cerca locali

Leggi `CLAUDE.md`. Mock-up: `Ricerca.dc.html`. Backend: tabella `venues`, RPC `search_venues`, nuova Edge Function `places-sync`.

> **Ruoli e metodo**: architetto → piano/interfacce/test; `/model sonnet` → TDD; architetto → review.

## Obiettivo

I locali vengono da **Google Places API (New)**, ma passano sempre dal nostro database: il client non parla mai con Google. La schermata Ricerca filtra per città e tipo, mostra recenti e sponsorizzati, con affluenza a fasce.

## Istruzioni

1. **Edge Function `places-sync`** (`supabase/functions/places-sync/`, Deno, test con `deno test`):
   - input: `{ city_slug, kinds?: string[] }`; per ogni tipo (`night_club`, `bar`, `rooftop` via text query, `live_music_venue`) esegue **Text Search (New)** con `locationBias` sul centro città e `fieldMask` minimo (`id, displayName, location, formattedAddress, primaryType, regularOpeningHours`) → upsert in `venues` (map `primaryType` → `kind`).
   - output: conteggio inseriti/aggiornati. Protetta: solo chiamabile con service role (dal job pg_cron settimanale via `pg_net`) o da un admin.
   - Budget: ≤ 10 chiamate Text Search per città per sync → ben dentro il free tier. Log del numero di chiamate.
   - **Place Details** solo on-demand (RPC `refresh_venue(venue_id)` → Edge `places-detail`) e non più di una volta ogni 30 giorni per venue.
2. **Attribuzione**: dove si mostrano dati Places, label "Informazioni da Google Maps" (come nel mock-up) e link "Apri in Google Maps" (`https://www.google.com/maps/place/?q=place_id:…`). Rispetta i termini Places: niente caching oltre 30 giorni dei campi non-ID (eccetto `place_id`), nessun uso dei dati su mappe non-Google **per i soli dati Places**: la nostra mappa mostra **i nostri** dati di affluenza; il pin nome/indirizzo è lecito su Apple Maps iOS perché memorizzato nel nostro DB entro i limiti — l'architetto documenta la valutazione in `docs/places-terms.md`.
3. **Schermata Ricerca** `app/(tabs)/map.tsx → search sheet` o route `search.tsx`, fedele a `Ricerca.dc.html`:
   - campo di ricerca; sezioni `CITTÀ` (chip delle città attive), `TIPO DI LOCALE` (Club, Rooftop, Bar, Live), `RECENTI` (chip dalla `search_history`);
   - lista risultati `VenueRow`: nome, meta (tipo · città), `SI` e `FORSE` a fasce; i **sponsorizzati** in testa con label `SPONSORIZZATA`;
   - contatore "N locali"; empty state "Nessun locale trovato. Prova a cambiare città o tipo.";
   - ricerca client-side sulla lista in cache (`['venues', city]`, `staleTime` 1 h, persistita) + `search_venues` per le fasce aggiornate (refetch 60 s).
   - tap → `venue/[id]` (prompt 08).
4. **Seed reale**: esegui `places-sync` su `milano` in dev e sostituisci i venue "(demo)" del prompt 04; mantieni uno script `npm run venues:sync -- milano`. Salva un'unica riga per `place_id` con il nome originale del locale (non tradotto); i testi di contorno (tipo, orari) si localizzano nel client.
5. **Curatela dello strato "di solito"** (principio 11): file `supabase/seed/typical_busyness_milano.csv` con colonne `google_place_id, weekday, hour_from, hour_to, level` compilato **a mano** per ogni venue sincronizzato, partendo da informazioni pubbliche del locale stesso (sito, profili social, orari di apertura già in `venues.opening_hours`, giorni forti dichiarati dal locale). Lo script `npm run typical:import -- milano` espande le fasce in righe orarie e fa upsert in `venue_typical_busyness` con `source='manual'`, senza toccare le righe `history`. **Vietato** derivare questi valori dai "Popular times" di Google o da librerie/servizi che li scrapano: non sono nell'API e lo scraping viola i termini di Google Maps Platform (nota in `docs/places-terms.md`). Un venue senza righe nel CSV ha `typical_level` 0 ovunque ed è una scelta esplicita, non un errore.
5. **Test**: mapping `primaryType → kind`, builder della richiesta Text Search (fieldMask minimo), ordinamento sponsorizzati → affluenza → alfabetico, filtri città/tipo, parser della cronologia.

## Definition of Done

- [ ] `places-sync` popola ≥ 30 venue reali di Milano (Navigli, Isola, Brera, Porta Venezia, Lambrate, Corso Como) con `google_place_id`, coordinate, tipo; nessuna chiave Places nel bundle client (`grep` sul bundle)
- [ ] Ricerca filtra per città/tipo/testo; sponsorizzati in testa; recenti aggiornati dopo un tap
- [ ] Label "Informazioni da Google Maps" presente dove richiesto; `docs/places-terms.md` scritto
- [ ] Il contatore di chiamate Places per sync è loggato e ≤ 10
- [ ] `typical_busyness_milano.csv` copre ≥ 30 venue; `npm run typical:import` è idempotente e non sovrascrive righe `history`; `docs/places-terms.md` dice esplicitamente che i Popular times non si usano
- [ ] Test scritti prima; nessun `any`
- [ ] Commit: `feat(06): google places sync and venue search`
