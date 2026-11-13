# 20 — Ricerca "come su Google Maps" e serate in un punto qualsiasi (spot)

Leggi `CLAUDE.md` (principi 1, 2, 3, 7, 11, vincoli Google Places) e `docs/places-terms.md`. Mock-up: `Mappa.dc.html`, `Ricerca.dc.html`, `Serata.dc.html`. Backend: Edge Functions `places-detail` (esiste), nuova `places-search`; tabella `venues`; RPC di dichiarazione.

> **Ruoli e metodo**: architetto → piano/schema/RPC/test; `/model sonnet` → TDD; architetto → review (UGC nuovo: audit moderazione e privacy obbligatorio).

## Obiettivo (evento Miro: "una ricerca su Google Maps è stata eseguita")

1. L'utente cerca **un locale o un indirizzo** come su Google Maps e può dichiarare la serata lì, anche se non è un locale del nostro catalogo.
2. L'utente può dichiarare la serata **in un punto qualsiasi della mappa** con una pressione lunga sul punto, dando un nome alla serata.
3. Appena c'è **almeno una** dichiarazione, gli altri utenti della città vedono quella serata sulla mappa, con il nome scelto, come **dichiarabile**.

## Modello (decisione architetturale)

- Uno **spot è un `venues`** con `kind = 'spot'` e nuova colonna `source` (`'places'` per i locali da Google, `'user'` per gli spot creati dagli utenti; i locali esistenti diventano `'places'`). Così dichiarazioni, night, chat, hot spot, k-anonimato e moderazione funzionano senza percorsi paralleli.
- Colonne nuove su `venues`: `source text not null`, `created_by uuid null` (solo `source='user'`, **mai esposto** da nessuna RPC), `spot_expires_at timestamptz null`.
- Un indirizzo trovato con la ricerca Google e privo di `place_id` di un esercizio (es. una via) diventa anch'esso `kind='spot'`, `source='places'`, con nome = indirizzo formattato; con `place_id` di un esercizio diventa un venue normale, con il `kind` mappato come nel prompt 06.
- **Ciclo di vita** degli spot `source='user'`: nascono con la prima dichiarazione; `spot_expires_at = fine della night` (06:00 locali); il job pg_cron di purga cancella gli spot scaduti senza dichiarazioni vive. Niente storico, niente `typical_level`.
- **Limiti anti-abuso** nella RPC: massimo **1 spot creato per utente per night**; nome 3–40 caratteri, senza URL e senza `@`; il punto deve stare entro il raggio della città attiva; posizione arrotondata a 4 decimali (~10 m) — non è la posizione dell'utente ma un luogo scelto, quindi il principio 3 non si applica, ma il client deve avvisare "Il punto e il nome saranno visibili a tutti gli utenti della città".

## Istruzioni

1. **Migration** `supabase/migrations/<ts>_spots.sql`: colonne sopra + `check (kind <> 'spot' or source is not null)`; RPC `declare_at_spot(p_lat, p_lng, p_name, p_intent)` → crea lo spot (o riusa quello stesso dell'utente per la night) e la dichiarazione in una transazione; RPC `declare_at_place(p_google_place_id, p_intent)` → chiama la cache venue (già popolata da `places-detail`) e dichiara. `get_city_map` restituisce anche gli spot con `is_declarable = true` (nome, coordinate, `going_band`/`maybe_band` **a fasce, `null` sotto k = 3**, mai `created_by`). `COMMENT ON FUNCTION` per ognuna. pgTAP **prima**: limite 1 spot/notte, nome invalido, punto fuori città, `created_by` mai nelle colonne restituite, bande `null` sotto 3, spot scaduto purgato.
2. **Edge Function `places-search`** (chiave Places solo qui): Places API (New) **Autocomplete** con `sessionToken`, `locationRestriction` = cerchio della città attiva, `languageCode` = locale dell'utente, `includedRegionCodes` del paese; risponde `{place_id, primary_text, secondary_text, types}`. Selezione → `places-detail` esistente (una sola Place Details per sessione). Rispettare `docs/places-terms.md`: cache ≤ 30 giorni, nessun scraping, niente Popular times. Deno test con fetch mockata; fail-closed se manca la chiave.
3. **Ricerca** (`Ricerca.dc.html`): la barra cerca prima nel catalogo (già fatto), poi, sotto, "Risultati da Google" via `places-search` con debounce 300 ms e un session token per sessione di digitazione; attribuzione "Powered by Google" come richiesto dai termini.
4. **Pressione lunga sulla mappa**: `onLongPress` di `react-native-maps` con durata `SPOT_LONG_PRESS_MS` (costante in `domain/`, default **3000 ms** come da richiesta prodotto, con anello di avanzamento visibile; se nei test con i tester risulta troppo lunga si cambia la costante, non il codice). Al rilascio: sheet "Serata in questo punto" con campo nome, SI/FORSE, avviso di visibilità, CTA dichiara. Dalla mappa alla dichiarazione ≤ 3 tap (principio 10).
5. **Mappa**: gli spot dichiarabili hanno un marker proprio (etichetta mono `SPOT`, colore ciano, mai confuso con hot spot o typical dot); sotto k = 3 niente numeri né "pochi"; a ≥ 3 diventano hot spot normali. Tap → scheda spot (nome, fascia se visibile, amici che ci vanno con follow accettato, CTA dichiara, **Segnala**).
6. **Moderazione** (principio 7): il nome dello spot è UGC: la RPC `report` (esistente) accetta anche il target `spot`; lo spot segnalato ≥ 3 volte o rimosso dal moderatore sparisce dalla mappa (dichiarazioni mantenute per chi le ha fatte). Blocco: non vedo gli spot creati da chi ho bloccato? **No**: `created_by` non è esposto e lo spot è un luogo, non una persona; il blocco agisce solo su chat e amici.
7. **Test client**: riduttore mappa con spot (marker, soglia k), validazione nome (pura), long press → sheet, flusso dichiarazione, risultati Google con attribuzione, stringhe IT/EN.

## Costi e termini (da verificare prima di iniziare)

- Autocomplete (New) si paga per sessione; Place Details per selezione. Stimare con 1.000 utenti attivi e riportare il numero nel README dei costi prima di scrivere codice.
- Un'eventuale geocodifica inversa del punto premuto (per suggerire l'indirizzo) è **fuori** da questo prompt: l'utente dà il nome. Se servirà, nuova Edge Function e nuova voce costi (backlog).

## Definition of Done

- [ ] Cerco "Via Torino 20, Milano" → compare tra i risultati Google → dichiaro → sulla mappa c'è il mio spot "Ci vai"
- [ ] Pressione lunga 3 s su un punto → sheet → nome + SI → spot visibile a un secondo utente della città come dichiarabile, senza numeri
- [ ] Terzo utente dichiara lo spot → a 3 dichiarazioni compare la fascia `3–10`
- [ ] Secondo spot nella stessa notte dallo stesso utente → errore `SPOT_LIMIT`
- [ ] Alle 06:00 lo spot senza dichiarazioni vive sparisce (test pgTAP sul job)
- [ ] Nessuna RPC restituisce `created_by`; `anon` non esegue nulla di nuovo
- [ ] Chiave Places solo nelle Edge Function; attribuzione Google presente
- [ ] Stringhe in `it` e `en`; lint/typecheck/test verdi
- [ ] Commit: `feat(20): google-style search and declarable spots`
