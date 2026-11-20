# 21 — Strato "di solito" da Apify (Popular times di Google)

Leggi `CLAUDE.md` (principi 2, 5, 9, **11 aggiornato**), `docs/places-terms.md`, `supabase/seed/README.md`, `scripts/typical-import.js` (pattern da copiare), migration `20261101000100_schema.sql` (`venue_typical_busyness`) e `20261101000200_pure_functions.sql` (`public.typical_level`).

> **Ruoli e metodo**: architetto → piano/schema/test (questo documento); `/model sonnet` → TDD; architetto → review.

## Decisione e rischi (20 nov 2026, decisione di Luca)

Luca ha deciso di popolare lo strato **"di solito"** con i "Popular times" di Google estratti tramite attori **Apify**, accettandone il rischio. Il principio 11 del `CLAUDE.md` è stato aggiornato di conseguenza.

Rischi accettati, da non dimenticare:
- I **Termini di Google Maps Platform** (§3.2.3 "No Scraping", anche tramite terzi) vietano l'estrazione di contenuti di Google Maps. RightPlace è cliente Google Maps Platform (Places API, mappa Android): la conseguenza possibile è la **sospensione dell'account** da cui dipendono catalogo locali, ricerca e mappa Android.
- Rischio legale/contrattuale (diritti sulle banche dati UE, termini Apify che scaricano la responsabilità sull'utente). Prima del lancio pubblico: parere legale.
- Qualità: Google mostra i Popular times solo per locali con abbastanza traffico; molti locali notturni piccoli non li hanno.

Mitigazioni obbligatorie (fanno parte del DoD):
- **Solo lo strato "di solito"**, mai lo strato "stasera". L'affollamento "live" di Google **non** si usa né si salva: lo strato "stasera" resta solo dichiarazioni (principio 2).
- **Minimizzazione**: si salva solo `level` 0–3 per (venue, giorno, ora). Mai l'istogramma grezzo, recensioni, foto, nomi, telefoni o altri campi dell'attore.
- **Precedenza**: la nostra storia (k ≥ 3) > curatela manuale > Apify. Appena un venue ha dati `history` per quella fascia, la riga Apify non conta più.
- **Interruttore**: un comando SQL documentato cancella tutte le righe `source='apify'`; lo script ha un flag d'ambiente che lo disabilita. Le righe Apify non aggiornate da 60 giorni vengono cancellate dal job.
- La chiave Apify è un **segreto della shell** di chi lancia lo script (o Edge Function secret in fase 2), mai nell'app, mai nel repo. Nessuna chiave Google viene passata ad Apify.
- In UI lo strato resta etichettato "di solito"; nessuna attribuzione né menzione di Google nella legenda (il test esistente su `MapLegend` resta).

## Istruzioni

### 1. Database — `supabase/migrations/<ts>_typical_apify.sql` (pgTAP prima: `supabase/tests/<nn>_typical_apify.sql`)
- `venue_typical_busyness.source`: check esteso a `('manual', 'history', 'apify')` (drop/add constraint con nome).
- `create or replace public.typical_level(...)`: precedenza `history` > `manual` > `apify` (`order by case source when 'history' then 0 when 'manual' then 1 else 2 end`). Stessa firma, stesso output.
- `public.import_typical_apify(p_city_slug text, p_rows jsonb) returns int` **solo service_role**: righe `{google_place_id, weekday, hour, level}`; valida (weekday 0–6, hour 0–23, level 0–3, venue esistente e attivo della città, `kind <> 'spot'`); per i venue presenti nel payload **sostituisce** atomicamente le loro righe `apify` (delete + insert); non tocca `manual`/`history`; restituisce il numero di righe scritte. Righe di venue sconosciuti → ignorate e contate in un `raise notice`.
- Pulizia: le righe `apify` con `updated_at` più vecchio di 60 giorni vengono cancellate nel job settimanale `refresh-typical-from-history` (create or replace della funzione mantenendo il resto identico) o in un job dedicato.
- `COMMENT ON FUNCTION` con la garanzia: solo livelli 0–3, nessun dato personale, sorgente esterna di terze parti.
- pgTAP: check di `source`; precedenza history > manual > apify; import sostituisce solo le righe apify dei venue nel payload; validazioni; non eseguibile da authenticated/anon; `get_city_map` mostra typical dot da righe apify; spot mai; test esistenti e `11_privacy_contract` verdi.

### 2. Dominio puro — `scripts/lib/apifyTypical.js` (test Node come `typical-import.test.js`)
- `toLevel(score)`: punteggio Google 0–100 → livello: `0` se 0 o assente, `1` se 1–33, `2` se 34–66, `3` se 67–100 (soglie in costanti documentate).
- `histogramToRows(placeId, popularTimes)`: dall'output dell'attore (istogramma per giorno della settimana con ore e punteggi; normalizza i nomi dei giorni e la convenzione 0 = domenica) → righe `{google_place_id, weekday, hour, level}`; ignora qualsiasi altro campo (minimizzazione), ignora i dati "live".
- Validazione dell'output con zod (o validazione a mano come gli altri script, coerente col repo); un place senza Popular times → nessuna riga (non "chiuso").

### 3. Script — `scripts/typical-apify.js` + `npm run typical:apify -- --city <slug> [--dry-run] [--limit N]`
- Legge `APIFY_TOKEN`, `APIFY_ACTOR_ID` (attore scelto da Luca, es. uno dedicato ai Popular times), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (come `typical-import.js`); `TYPICAL_APIFY_ENABLED` deve valere `true` altrimenti esce senza fare nulla.
- Prende i venue attivi della città con `google_place_id` reale (escludi `demo-`, `spot:`, `kind = 'spot'`) via REST service role.
- Chiama l'API Apify (`POST https://api.apify.com/v2/acts/<actor>/run-sync-get-dataset-items`) a lotti (es. 50 place per run), passando i place ID come previsto dall'attore scelto (input in un modulo isolato `scripts/lib/apifyInput.js`, perché ogni attore ha il suo schema); timeout e retry limitati; **tetto di place per esecuzione** (`--limit`, default 200) per il controllo costi.
- `--dry-run`: stampa quanti place hanno Popular times, distribuzione dei livelli e costo stimato; non scrive nulla.
- Senza dry-run: `import_typical_apify(city, rows)`; stampa righe scritte e place senza dati. Log mai con il token.
- Test con `fetch` mockato: lotti, limite, dry-run, flag disabilitato, errori Apify, output inatteso scartato.

### 4. (Fase 2, solo se Luca la chiede) Esecuzione pianificata
- Edge Function `typical-apify` con secret `APIFY_TOKEN`, chiamata da pg_cron settimanale con lo schema di `storage-gc` (Vault + header), stessa logica dello script. Non farla in questo prompt senza richiesta esplicita.

### 5. Documentazione
- `docs/typical-apify.md`: decisione, rischi, mitigazioni, mappatura punteggio→livello, precedenza, costi stimati (con i prezzi dell'attore scelto), comandi, interruttore (`delete from venue_typical_busyness where source = 'apify';` e `TYPICAL_APIFY_ENABLED=false`).
- `supabase/seed/README.md`: il CSV manuale resta e ha precedenza su Apify.
- `.env.example`: le variabili dello script nella sezione "solo CLI, mai nel bundle", senza valori.

## Definition of Done
- [ ] pgTAP scritto prima: source `apify`, precedenza history > manual > apify, import solo service_role e solo righe apify dei venue nel payload
- [ ] `npm run typical:apify -- --city milano --dry-run` stampa copertura e costo stimato senza scrivere
- [ ] Senza dry-run lo strato "di solito" mostra typical dot per i locali con Popular times; lo strato "stasera" invariato
- [ ] Nessun campo oltre a weekday/hour/level salvato; nessun dato "live"; nessuna chiave nel repo o nei log
- [ ] Interruttore documentato e testato (flag disabilitato → nessuna chiamata)
- [ ] Test scritti prima; lint/typecheck/test verdi; stringhe UI invariate (nessuna nuova)
- [ ] Commit: `feat(21): typical layer from Apify popular times`
