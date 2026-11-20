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
