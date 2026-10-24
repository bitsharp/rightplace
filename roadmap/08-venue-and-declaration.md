# 08 — Dettaglio locale, statistiche k-anonime e dichiarazione della serata

Leggi `CLAUDE.md`. Mock-up: `Locale.dc.html` (Dettaglio locale) e `Serata.dc.html` (Dichiara la serata). Backend: RPC `get_venue_stats`, `declare`, `undeclare`, `get_my_declaration`.

> **Ruoli e metodo**: architetto → piano/interfacce/test; `/model sonnet` → TDD; architetto → review.

## Obiettivo

Dal tap su un locale: fasce SI/FORSE, "Chi ci va" (età media, genere) con soglia k≥3, amici che ci vanno, "Andare e tornare", CTA "Dichiara la tua serata" → schermata dichiarazione con Ci vado / Forse, stato dichiarato con Modifica/Annulla, scadenza, "Chiedi all'AI" (placeholder fino al prompt 14), "Rimuovi la mia icona da questo luogo".

## Istruzioni

1. **`venue/[id].tsx`** fedele a `Locale.dc.html`:
   - header: back, label `DETTAGLIO LOCALE`; nome, "Club · Aperto fino alle 05:00" (da `opening_hours`), indirizzo + "informazioni da Google Maps".
   - due `RangeStat`: `SI {going_band}` e `FORSE {maybe_band}`.
   - **Chi ci va** + label `SOLO CHI HA DICHIARATO`; `SegmentedControl` **Ci vado / Forse / Tutti** → `get_venue_stats(segment)`; `AgeStatCard` ("Età media 23 anni") e `GenderBar` (Donne 52 % / Uomini 48 %); se `avg_age` è `null` → `EmptyState` "Meno di 3 persone hanno risposto "Forse": i dati restano nascosti per tutelare l'anonimato." (testo parametrico sul segmento); nota "Calcolato su chi ha dichiarato…".
   - **Amici che ci vanno** (`N AMICI`): `FriendRow` con handle, "18–24 · Donna", chip Ci vado/Forse; empty state "Nessuno degli amici che segui ha ancora dichiarato questa serata."
   - **Andare e tornare**: segmented **Per andare / Per tornare**; `TransportRow` per TAXI (`tel:` a `cities.taxi_phone`, per Milano 02 8585), UBER (`https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=…`), FREE NOW (`https://free-now.com/…` / deep link `freenow://`), MAPPE (Google Maps transit — a Milano copre ATM metro/tram/bus notturni con `origin`/`destination` in base alla direzione). Nessuna API: solo deep link. Nota: "I link aprono le app e i servizi reali."
   - CTA fissa in basso "Dichiara la tua serata" → `declare` sheet/route.
2. **Dichiarazione** `Serata.dc.html` come **sheet** sopra il dettaglio (meno navigazione, ≤ 3 tap dalla mappa):
   - nome locale, fasce SI/FORSE, "Dichiara la tua serata": due bottoni **Ci vado** (viola) / **Forse** (ciano outline) → `declare(night, intent)` con optimistic update, haptic, chiusura; "La dichiarazione scade a fine evento o alla chiusura del locale." con l'orario reale di `expires_at`.
   - se già dichiarato: card "Serata dichiarata: Ci vado" con **Modifica** (cambia intent) / **Annulla**; sezione **Chiedi all'AI** con 3 chip (Che musica fanno? C'è un dress code? A che ora conviene arrivare?) → per ora toast "In arrivo" (prompt 14).
   - link in basso "Rimuovi la mia icona da questo luogo" → `undeclare` con conferma leggera.
   - una sola dichiarazione attiva per utente: se ne esiste una altrove, il bottone dice "Cambia a {venue}" e la precedente viene sostituita.
3. **Eventi** (serate dei creator, prompt 12): `event/[id].tsx` riusa gli stessi componenti con `event_id` al posto di `night_id`; prepara ora i componenti con la prop `target: {kind:'night'|'event', id}`.
4. **Invalidation** dopo ogni mutazione: `['myDeclaration']`, `['cityMap']`, `['venueStats', id]`, `['stories']`.
5. **Test**: regola "pochi"/null → empty state per segmento; builder dei deep link trasporto (andata/ritorno); flusso dichiara → stato dichiarato → annulla (mutation mock); vincolo "una sola dichiarazione".

## Definition of Done

- [ ] Con 2 utenti seed su un venue: fasce "pochi" e statistiche nascoste; con 3: "3–10", età media e genere visibili
- [ ] Segmento Forse con 2 "forse" nasconde le statistiche anche se i "Ci vado" sono 10
- [ ] Dalla mappa alla dichiarazione: ≤ 3 tap, < 10 s
- [ ] Modifica/Annulla aggiornano mappa e pill senza riavvio; la dichiarazione scade all'orario mostrato (test con `expires_at` forzato via SQL)
- [ ] I 4 link trasporto aprono le app/servizi corretti su iOS e Android (o lo store se l'app manca)
- [ ] Test scritti prima; nessun `any`
- [ ] Tutte le stringhe nuove esistono in `it` e `en` (`npm run i18n:check` pulito) e le schermate sono state provate in entrambe le lingue
- [ ] Commit: `feat(08): venue detail, k-anonymous stats, declaration`
