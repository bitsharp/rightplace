# 25 — Presenze stimate ("bot") e card "I più animati del {giorno}"

Leggi `CLAUDE.md` (principi 2, 9, 11 **aggiornati**), `docs/typical-apify.md`, le migration che definiscono l'ultima versione di `get_city_map`, `get_venue_stats`, `get_venue_detail`, `search_venues`, `get_recommended_venue` (trovale con `grep -l` e prendi la più recente per ciascuna), `20261101000200_pure_functions.sql` (`typical_level`, funzioni di fascia), `20261120000300_venue_cover_photo.sql` (`private.feature_flags`) e la mappa client (`src/features/map/`, `src/features/venue/`).

> **Ruoli e metodo**: architetto → questo piano; `/model sonnet` → TDD (pgTAP prima della migration); architetto → review. Nessuna nuova dipendenza: client con `eas update`, backend con `npx supabase db push`.

## Decisione di Luca (26/11/2026, rischio accettato)

Per non far sembrare vuota l'app al lancio, lo strato "stasera" dei locali più frequentati secondo lo strato "di solito" riceve **presenze stimate** generate dal server ("bot"), diverse ogni giorno.

| Tema | Decisione |
|---|---|
| Forma | **Solo affluenza.** Nessun profilo finto, nessun @handle, nessuna riga in `declarations`. I bot non compaiono in ricerca utenti, amici, mappa amici, chat, feed, notifiche, adesioni degli eventi dei creator. |
| Trasparenza | Ogni fascia che include presenze stimate porta l'etichetta **STIMA** (mono, come le altre label), spiegata in legenda e nei termini d'uso. |
| Spegnimento | I bot restano **sempre sommati** alle dichiarazioni vere; si spengono solo **tutti insieme** con l'interruttore `private.feature_flags.night_bots`. |

Rischi accettati (da riportare in `docs/night-bots.md`): percezione di affluenza non reale e delusione degli utenti, rischio "pratica commerciale scorretta" (mitigato dall'etichetta STIMA), revisione degli store, fiducia dei creator. Prima del lancio pubblico: parere legale.

## Garanzie che non si toccano (principio 2)

- **Le statistiche su persone** (età media, % genere, "Chi ci va") si calcolano **solo sulle dichiarazioni vere** e solo se le persone vere sono **≥ 3**. I bot non fanno mai superare la soglia k a nessun dato personale. Se la fascia mostrata include bot ma le persone vere sono < 3, il messaggio è "Statistiche disponibili con almeno 3 dichiarazioni reali" (nuova stringa IT/EN), non "meno di 3 persone".
- I bot **non entrano** nella storia: `refresh_typical_from_history` e ogni media storica leggono solo `declarations`.
- Mai il numero esatto, né dei veri né dei bot: solo fasce.

## 1. Database — `supabase/migrations/20261126000100_night_bots.sql` (pgTAP prima: `supabase/tests/40_night_bots.sql`)

- `private.night_bot_presence (venue_id uuid fk venues on delete cascade, night_date date, going int check ≥ 0, maybe int check ≥ 0, created_at, primary key (venue_id, night_date))`, RLS attiva, nessun privilegio a `anon`/`authenticated`.
- Flag: `insert into private.feature_flags (name, enabled) values ('night_bots', true) on conflict do nothing`.
- `private.generate_night_bots(p_night date default <night corrente Europe/Rome>) returns int`: per ogni città attiva, i venue attivi non spot con il **livello tipico di picco** della sera (massimo di `public.typical_level` sulle ore 21–02 del giorno della settimana di quella night; usa la stessa precedenza history > manual > apify) ≥ 2, ordinati per livello e poi a caso con seme del giorno, massimo **40 per città**. Presenze deterministiche per (venue, data) con `hashtext(venue_id::text || p_night::text)` → stabili durante la serata, diverse ogni giorno:
  - livello 3: `going` 18–45, `maybe` 8–24
  - livello 2: `going` 6–18, `maybe` 3–10
  (costanti in testa alla funzione, commentate). Cancella le righe della stessa night e reinserisce (idempotente). Restituisce le righe scritte. Non fa nulla se il flag è spento.
- `private.night_bot_counts(p_venue uuid, p_night date) returns table(going int, maybe int)`: 0/0 se flag spento o riga assente.
- Job pg_cron `generate-night-bots` ogni giorno alle 05:10 UTC (prima delle 06:00 locali di inizio night) + purge delle righe più vecchie di 2 giorni nello stesso job.
- **Lettura**: `create or replace` dell'ultima definizione di `get_city_map`, `get_venue_stats`, `get_venue_detail` (se ha fasce), `search_venues`, `get_recommended_venue` e di ogni altra RPC che restituisce `going_band`/`maybe_band` **per venue/night** (non per eventi dei creator: `get_event_detail`, `get_event_attendance`, `get_city_events`, `get_my_creator_events` restano solo dichiarazioni vere). Cambia solo: la fascia si calcola su `vere + bot`; nuova colonna **`is_estimate boolean`** (true se i bot di quel venue/night > 0 e il flag è acceso); la soglia "hot spot visibile" usa il totale; **età/genere solo sui veri con k ≥ 3** (invariato). Firme: se cambia il tipo di ritorno serve `drop function` + `create` con gli stessi grant e `COMMENT` aggiornato. Mappa amici invariata.
- `COMMENT ON FUNCTION` aggiornati: "fasce = dichiarazioni vere + presenze stimate (is_estimate); statistiche personali solo su persone vere ≥ 3".
- pgTAP: struttura e privilegi; generazione deterministica (stessa data → stessi numeri, data diversa → numeri diversi), solo livelli ≥ 2, max 40 per città, mai spot, flag spento → 0 righe e RPC come prima (`is_estimate` false); fascia = veri + bot; `is_estimate`; con 1 vero + bot: età/genere `null`; con 3 veri + bot: età/genere calcolati **solo sui 3 veri** (verifica con valori noti); eventi dei creator senza bot; `refresh_typical_from_history` ignora i bot; mappa amici invariata; `11_privacy_contract` e test esistenti verdi (aggiorna i test esistenti che verificavano firme cambiate).
- Rigenera `src/lib/database.types.ts`.

## 2. Card "I più animati del {giorno}" (stesso backend, RPC nuova)

- `public.get_busiest_tonight(p_city_slug text, p_limit int default 5)`: i venue attivi non spot della città con il livello tipico più alto **all'ora corrente o nelle prossime 3 ore** del giorno della settimana corrente (Europe/Rome), `typical_level ≥ 2`, ordinati per livello poi nome; colonne `venue_id, name, kind, typical_level, cover_photo_url` (se già esposta altrove con le stesse regole), più `going_band, maybe_band, is_estimate` dello strato stasera. Nessun dato personale. `security definer`, `COMMENT ON FUNCTION`. pgTAP: ordinamento, limite, ora/giorno, spot esclusi.
- Client: componente `BusiestTonightCard` sotto la mappa generale (al posto dello spazio lasciato dalla card rimossa in 78f8150): titolo "I più animati del {giorno}" / "Busiest this {day}" con il giorno della settimana via `Intl` nella lingua dell'utente, lista orizzontale di 3–5 mini card (foto di copertina o gradiente, nome, livello "di solito pieno/animato" in grigio, fascia stasera con STIMA se `is_estimate`), tap → dettaglio locale. Nascosta se la RPC restituisce 0 righe. Solo nella vista "Mappe" (generale).

## 3. Client — etichetta STIMA

- Schemi zod: `is_estimate` **opzionale con default false** (l'app non si rompe prima del `db push`).
- Componente `EstimateTag` (label mono "STIMA"/"ESTIMATE", colore secondario, `accessibilityLabel` "Stima: include presenze stimate"/…). Compare ovunque si mostra una fascia di venue/night con `is_estimate`: punti caldi della mappa (piccolo badge o anello tratteggiato coerente con lo stile, scegli il meno invasivo e testabile), card sotto la mappa, riquadri CI VANNO / FORSE del dettaglio locale, risultati di ricerca locali, card consigliata, card "I più animati".
- Legenda della mappa: voce "STIMA: affluenza stimata dalle abitudini del locale, non persone reali" (IT/EN).
- "Chi ci va" nel dettaglio: nuovo messaggio quando le statistiche sono `null` ma la fascia include stime (vedi sopra).
- Termini d'uso / pagine legali esistenti (it/en): paragrafo sulle presenze stimate.
- Test: tag presente con `is_estimate` e assente senza in ogni punto elencato; messaggio "Chi ci va"; card "I più animati" (giorno via Intl, nascosta se vuota, tap → venue, solo vista generale); nessun numero esatto renderizzato.

## 4. Documentazione e CLAUDE.md
- `docs/night-bots.md`: decisione, rischi, garanzie k, generazione e numeri, job, interruttore (`update private.feature_flags set enabled = false where name = 'night_bots';` → effetto immediato su tutte le RPC), come rigenerare a mano (`select private.generate_night_bots();`).
- `CLAUDE.md` già aggiornato (principi 2 e 11, vocabolario).

## Definition of Done
- [ ] pgTAP prima; statistiche personali mai sbloccate dai bot (test con valori noti)
- [ ] Bot solo affluenza, sempre etichettati STIMA, mai in amici/chat/feed/notifiche/eventi creator/storia
- [ ] Numeri diversi ogni giorno, stabili nella serata; interruttore unico testato
- [ ] Card "I più animati del {giorno}" sulla mappa generale
- [ ] Client tollerante prima del `db push`; IT + EN complete; lint/typecheck/test verdi
- [ ] Commit: `feat(25): estimated presence and busiest tonight card` (backend e client possono essere due commit: `feat(25): estimated presence backend`, `feat(25): estimate tags and busiest tonight card`)
- [ ] Azioni per Luca: `npx supabase db push`, `eas update`; facoltativo `select private.generate_night_bots();` subito dopo il push per non aspettare le 06:10
