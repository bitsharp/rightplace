# 07 — Mappa: generale / amici, due strati ("di solito" / "stasera"), "Tu", card sponsorizzata e consigliata

Leggi `CLAUDE.md`. Mock-up: `Mappa.dc.html`, `TopBar.dc.html`. Backend: RPC `get_city_map`, `get_recommended_venue`, `get_my_declaration`.

> **Ruoli e metodo**: architetto → piano/interfacce/test; `/model sonnet` → TDD; architetto → review.

## Obiettivo

La schermata principale: TopBar (handle, campanella, storie, "+" dopo la dichiarazione), campo "Cerca una serata o un locale", segmented **Mappa generale / Mappa amici**, mappa a **due strati** — sotto i **typical dot** grigi dello strato "di solito" (`typical_level`), sopra i **punti caldi** SI/FORSE dello strato "stasera" — marker "Tu" (se posizione attiva), card **SPONSORIZZATA** e **CONSIGLIATA PER TE**, e nella vista amici la lista "Arena Club · 2 amici · @volpe.viola, @orso.grigio". La mappa non è mai vuota la prima sera (principio 11), ma i due strati non si confondono mai.

## Istruzioni

1. **`MapScreen`** `app/(tabs)/map.tsx`:
   - `TopBar` con dati reali: handle da `profile`, `canPost = hasDeclaration` (il "+" porta a `post/new`), campanella → `feed` con pallino se ci sono novità (`get_stories().length > 0`), barra storie da `get_stories()` (prompt 11 la completa; qui solo "La tua storia" + seguiti con post).
   - `SearchField` che apre la Ricerca (prompt 06).
   - `SegmentedControl` **generale / amici** (stato in zustand, persistito).
   - `MapView` centrata su `cities.center`; `showsUserLocation={false}` (il marker "Tu" lo disegniamo noi dalla posizione **grossolana**, coerente con ciò che il server sa), POI e traffico off, stile dark.
   - Hint in Space Mono sotto il segmented: `TOCCA UN PUNTO CALDO · PIZZICA PER ZOOM` / `DOVE VANNO I TUOI AMICI · PIZZICA PER ZOOM`.
   - Legenda su due righe: `STASERA` → `SI` (viola) `FORSE` (ciano) `Tu`; `DI SOLITO` → tre pallini grigi crescenti (`tranquillo · animato · pieno`).
2. **Dati**: query `['cityMap', city, view]` → `get_city_map`, `refetchInterval` 60 s con schermata attiva, refetch on focus.
   - **Strato "di solito"** (entrambe le viste): `TypicalDot` per ogni venue con `typical_level ≥ 1` **e senza** fascia visibile: cerchio grigio (`surface-3`), tre taglie per `level` 1/2/3, nessuna label, opacità 0.6, `zIndex` sotto gli hot spot. Tap → `venue/[id]`. Nessun tooltip con numeri: il livello è qualitativo.
   - **Strato "stasera" — vista generale**: `HotSpot` per ogni venue con fascia visibile (il server ha già escluso i < 3 come hot spot); dimensione per fascia (`3–10` … `100+` → 5 taglie), colore dominante viola se `going ≥ maybe`, label = fascia di `going` (o "pochi" se solo `maybe` è visibile). Un venue con hot spot **non** mostra anche il typical dot: lo strato "stasera" copre quello "di solito", mai la somma dei due.
   - **Vista amici**: `HotSpot` ciano/viola con badge numerico `friends_count`; sotto la mappa lista `FriendVenueRow` ("2 amici · @volpe.viola, @orso.grigio"), tap → `venue/[id]`.
   - Marker **"Tu"**: solo se `location_opt_in` e posizione disponibile; cerchio bianco con label "Tu", posizione **grossolana** (stessa funzione `coarsen`): l'utente capisce che non è precisa.
3. **Card flottanti** sopra la tab bar (scroll orizzontale):
   - `SponsoredCard` `SPONSORIZZATA` → primo `is_sponsored` del risultato: nome, tipo · "di solito pieno" / "animato" / "tranquillo" (da `typical_level`, mai da Google), badge fascia se visibile;
   - `RecommendedCard` `CONSIGLIATA PER TE` → `get_recommended_venue`: "Dalla tua cronologia di ricerca" o "Il più caldo stasera".
   - Tap → `venue/[id]`.
4. **Pill dichiarazione** in basso quando `hasDeclaration`: "Stasera: Arena Club · Ci vado ▾" → `venue/[id]` con sezione dichiarazione (prompt 08).
5. **Stato "solo di solito"** (nessun hot spot ma almeno un typical dot): banner discreto sopra la tab bar "Ancora nessuna dichiarazione stasera: i punti grigi sono l'affluenza abituale. Dichiara la tua e invita amici." **Stato vuoto vero** (né hot spot né typical dot, es. lunedì alle 15): "Serata tranquilla finora. Dichiara la tua e invita amici." Nessun blur/lock: in questo prodotto la mappa è sempre visibile.
6. **Performance**: `tracksViewChanges={false}` dopo il primo render; profilare con 30 marker su emulatore API 30.
7. **Test**: fascia → taglia/colore/label del `HotSpot`; `typical_level` → taglia del `TypicalDot`; un venue con fascia visibile **non** renderizza `TypicalDot`; un venue con `typical_level` 0 e fascia non visibile non renderizza nulla; vista amici mostra solo venue con `friends_count > 0` (i typical dot restano); "Tu" assente senza opt-in; pill assente senza dichiarazione; `TopBar.canPost`; scelta del banner ("solo di solito" vs vuoto vero).

## Definition of Done

- [ ] Vista generale: venue con 2 dichiarati e `typical_level` 0 **non** compare; con 2 dichiarati e `typical_level` 2 compare come typical dot grigio senza label; con 3 compare come hot spot `3–10` e il typical dot sparisce
- [ ] Legenda distingue `STASERA` e `DI SOLITO`; nessuna stringa della UI attribuisce lo strato grigio a Google
- [ ] Vista amici: compare un venue solo se un mio seguito ha dichiarato lì, con il suo handle
- [ ] "Tu" visibile solo con posizione attiva e spostato rispetto alla posizione reale (grossolana)
- [ ] Card sponsorizzata e consigliata navigano al dettaglio; "+" nella TopBar compare solo dopo una dichiarazione
- [ ] Nessuna richiesta di permesso posizione parte dalla mappa (solo dal toggle profilo)
- [ ] Test scritti prima; nessun `any`
- [ ] Tutte le stringhe nuove esistono in `it` e `en` (`npm run i18n:check` pulito) e le schermate sono state provate in entrambe le lingue
- [ ] Commit: `feat(07): city map with general and friends views`
