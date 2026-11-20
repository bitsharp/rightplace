# Strato "di solito" da Apify (Popular times)

Decisione di Luca (20 nov 2026, rischio accettato): lo strato **"di solito"** (`venue_typical_busyness`, principio 11) si popola
anche con i Popular times di Google estratti da un attore **Apify**. Lo strato "stasera" resta solo dichiarazioni.

## Rischi accettati

- I Termini di Google Maps Platform (§3.2.3 "No Scraping", anche tramite terzi) vietano l'estrazione di contenuti di Google Maps.
  RightPlace è cliente Maps Platform (Places API, mappa Android): possibile **sospensione dell'account**.
- Rischio legale/contrattuale (diritti sulle banche dati UE; i termini Apify scaricano la responsabilità sull'utente):
  parere legale prima del lancio pubblico.
- Qualità: i locali piccoli spesso non hanno Popular times.

## Mitigazioni

- Solo `level` 0–3 per (venue, giorno, ora). Dell'output dell'attore si legge **solo** `placeId` e `popularTimesHistogram`;
  `popularTimesLiveText`, `popularTimesLivePercent`, nomi, recensioni, telefoni ecc. non vengono mai letti, salvati né loggati.
- Precedenza in `typical_level`: **history (k ≥ 3) > manuale > Apify**.
- Righe Apify non aggiornate da 60 giorni: cancellate dal job settimanale `refresh-typical-from-history`.
- Nessuna chiave Google passa ad Apify. `APIFY_TOKEN` vive solo nella shell di chi lancia lo script.
- Nessuna attribuzione né menzione di Google nella UI (legenda "di solito").

## Mappatura punteggio → livello

| Punteggio Google (0–100) | Livello |
| ------------------------ | ------- |
| 0 o assente              | 0       |
| 1–33                     | 1       |
| 34–66                    | 2       |
| 67–100                   | 3       |

Soglie in `scripts/lib/apifyTypical.js` (`LEVEL_1_MAX_SCORE`, `LEVEL_2_MAX_SCORE`). Giorni: `0 = domenica` (Su = 0 … Sa = 6).

## Attore

Default `compass~crawler-google-places` (Google Maps Scraper), ricerca per `placeIds`. Tutto ciò che dipende dall'attore
(input, campi di output) sta in `scripts/lib/apifyInput.js`; per cambiare attore si modifica solo quel file e `APIFY_ACTOR_ID`.
Alternativa a `placeIds`: `buildStartUrlsInput` (URL `https://www.google.com/maps/place/?q=place_id:<ID>`).
Il parser dell'output tollera anche `popular_times` / `popularTimes` e la forma "array per giorno" (`{day, popular_times:[{hour, percentage}]}`).

## Costi

Stima nello script: **~0,004 $ per place** (`ESTIMATED_USD_PER_PLACE`), da verificare sulla pagina prezzi dell'attore. Il tetto
`--limit` (default 200 place per esecuzione) limita la spesa. Con 200 place ≈ 0,8 $ a run.

## Comandi

```bash
export TYPICAL_APIFY_ENABLED=true APIFY_TOKEN=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
npm run typical:apify -- --city milano --dry-run          # copertura, livelli, costo; non scrive
npm run typical:apify -- --city milano [--limit 200]      # scrive via import_typical_apify
```

Lo script lavora a lotti di 50 place, scrive ogni lotto appena ricevuto (un errore Apify successivo non annulla i lotti già
scritti), ritenta al massimo 3 volte su 429/5xx/errori di rete.

## Interruttore

- Script: senza `TYPICAL_APIFY_ENABLED=true` esce senza alcuna chiamata di rete.
- Dati: `delete from public.venue_typical_busyness where source = 'apify';` (da SQL editor / service_role).

## Foto di copertina del locale (rischio accettato, 20 nov 2026)

Decisione di Luca: una **sola foto di copertina per locale**, presa dall'`imageUrl` principale dei dettagli del place
restituiti dallo stesso attore, mostrata nel dettaglio locale con la didascalia "Foto da Google Maps" (IT/EN).
Eccezione estesa del principio 11 / "nessuno scraping" di `CLAUDE.md`: solo questa foto, solo tramite `typical:apify`.

### Rischi

- **Diritti d'autore non licenziati**: l'immagine appartiene a chi l'ha caricata su Google Maps (spesso un utente o il
  proprietario del locale); RightPlace non ha licenza per mostrarla. Possibili richieste di rimozione e contestazioni.
- Gli stessi rischi di contratto/account Google dei Popular times (§3.2.3 dei Termini Maps Platform) e di legittimità
  dell'estrazione.

### Mitigazioni

- **Nessuna copia dell'immagine**: si salva solo l'URL (`venues.photo_url` + `photo_fetched_at`); il client la scarica da
  `*.googleusercontent.com`. Un solo URL per locale, sempre `imageUrl`: mai `imageUrls`, mai le foto delle recensioni o dei
  profili (il parser non le legge). Lo script e la RPC `import_venue_photos_apify` accettano solo `https://` con host
  `googleusercontent.com` o un suo sottodominio.
- Le colonne non sono leggibili dai client (grant per colonna del prompt 20): la foto arriva solo da `get_venue_detail`, che
  la restituisce solo se il flag server `venue_photo_apify` è acceso **e** `photo_fetched_at` è più recente di 60 giorni.
- Il job giornaliero `purge-stale-venue-photos` (04:45 UTC) azzera `photo_url` e `photo_fetched_at` oltre i 60 giorni.
- Se l'immagine non carica, il client nasconde la foto (nessun box rotto); se manca, il layout è quello di prima.

### Interruttori

- Script: `VENUE_PHOTOS_APIFY_ENABLED=true` (default **spento**, separato da `TYPICAL_APIFY_ENABLED`). Spento, lo script non
  legge né scrive nessuna foto.
- Dati, subito e per tutti i client: `update private.feature_flags set enabled = false where name = 'venue_photo_apify';`
  (riaccendere con `true`). Per cancellare tutte le foto: `update public.venues set photo_url = null, photo_fetched_at = null;`.
- **Rimozione di una singola foto su richiesta del proprietario**:
  `update public.venues set photo_url = null, photo_fetched_at = null where google_place_id = '<place id>';`
  (e finché il locale resta nella città, la prossima esecuzione di `typical:apify` con il flag acceso la riscriverebbe:
  togliere il locale dal giro o tenere il flag spento).

### Da controllare al primo dry-run (azione per Luca)

L'input dell'attore **non cambia** (`maxImages: 0`): l'`imageUrl` principale arriva comunque nei dettagli del place, ma non
è garantito per ogni versione dell'attore. Al primo giro:

```bash
export TYPICAL_APIFY_ENABLED=true VENUE_PHOTOS_APIFY_ENABLED=true APIFY_TOKEN=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
npm run typical:apify -- --city milano --dry-run --limit 20
```

La riga `Foto di copertina: N/M` dice quante foto sono arrivate. Se è `0/M` l'attore non restituisce `imageUrl` con
`maxImages: 0` (l'unica modifica da valutare, in `scripts/lib/apifyInput.js`, sarebbe `maxImages: 1`: **non** farla senza
decisione esplicita perché cambia il costo e il volume scaricato). Il dry-run non scrive nulla.
