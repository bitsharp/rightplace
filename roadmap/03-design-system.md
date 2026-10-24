# 03 — Design system e UI kit dalle 14 schermate

Leggi `CLAUDE.md` e **tutti i file `design/project/*.dc.html`**: l'HTML/CSS inline di ogni schermata è il riferimento esatto di colori, spaziature, raggi e tipografia. Qui si costruiscono i componenti riutilizzabili; la logica arriva nei prompt successivi.

> **Ruoli e metodo** (vedi `CLAUDE.md`): architetto → piano, interfacce, lista test; `/model sonnet` → TDD; architetto → review. Proponi il cambio modello quando serve.

## Istruzioni

1. **Token** in `src/theme/`: `tokens.ts` (colori incl. `going #9D6BFF`, `maybe #4ED9C7`, `female #F2B1CB`, `male #86B6E3`, superfici, bordi; spacing 4…32; radius card 16/18, button 14/16, segmented 12/9, pill 999; altezze: button 56, tab bar 72, segmented 36; glow neon per marker), `typography.ts` (Unbounded display 30/26/22/17, Inter body 16/15/14/13/12/11, Space Mono label 12/11/10 con letter-spacing), `useTheme()`.
2. **Componenti base** `src/components/ui/`, ognuno tipizzato, con varianti/stati e haptic dove sensato:
   - `Button` (primary viola, secondary ciano outline, ghost, danger; `lg` 56 / `md` 44; loading)
   - `Chip` (selezionabile, per fasce d'età, genere, tipo locale, città)
   - `SegmentedControl` (2–3 voci, colore attivo per voce: viola/ciano/bianco — vedi "Chi ci va" in `Locale`)
   - `Card`, `Sheet` (bottom sheet custom con handle, swipe-down, backdrop), `Text`, `Screen`, `Divider`
   - `TextField` (altezza 52, label sopra, errore), `PasswordField`, `SearchField` (con icona)
   - `Toggle` (riga con titolo + descrizione + switch, come "Posizione" e "Contatti")
   - `Avatar` (iniziale su cerchio colorato, bordo colore intent), `HandleText` (`@lince.rosso`)
   - `RangeStat` (card "SI 30–50 persone" / "FORSE 20–30"), `MonoLabel` (`SPONSORIZZATA`, `SOLO CHI HA DICHIARATO`)
   - `Toast`, `EmptyState` (bordo tratteggiato, come "Meno di 3 persone…")
3. **Componenti applicativi** `src/components/app/` (solo visuali, dati via props):
   - `TabBar` (5 voci, da `Feed.dc.html`), `TopBar` (da `TopBar.dc.html`: "+" condizionale, handle con chevron, campanella con pallino, barra storie orizzontale)
   - `HotSpot` (cerchio con glow, dimensione per fascia, viola/ciano dominante, label fascia o "pochi"), `YouMarker`
   - `VenueRow` (nome, meta, SI/FORSE), `SponsoredCard` e `RecommendedCard` (da `Mappa`), `FriendVenueRow` ("2 amici · @volpe.viola, @orso.grigio")
   - `GenderBar` (barra donne/uomini con legenda), `AgeStatCard`
   - `FriendRow` (avatar, tag, meta, bottone Segui/Seguito), `TransportRow` (badge, nome, dettaglio, azione)
   - `MessageBubble` (testo/foto, mia/altrui), `PhotoFrame` (placeholder sfumato in assenza di immagine), `PostCard` (header, foto, caption, like, commenti, scadenza)
   - `PlanCard` (nome piano, prezzo, vantaggi, badge Attivo/Annullato), `EventRow` (serata creator con adesioni e target)
4. **Dark map style** `src/features/map/mapStyle.ts` per Google Maps (Android), coerente con la palette; iOS `userInterfaceStyle="dark"`.
5. **Galleria componenti** `app/(dev)/ui-kit.tsx` (solo `__DEV__`) con tutti i componenti nei vari stati, per confronto fianco a fianco con il mock-up.
6. **Test** (prima del codice) per: `Button`, `SegmentedControl`, `Sheet`, `Toggle`, `HotSpot` (fascia → dimensione/label), `GenderBar` (percentuali → larghezze e aria-label), `TopBar` (il "+" compare solo con `canPost`), `PostCard`.

## Vincoli

- Solo `StyleSheet` + token; **zero hex hardcoded** fuori da `tokens.ts` e `mapStyle.ts`.
- Icone: `@expo/vector-icons` o SVG inline (`react-native-svg`); niente emoji, niente raster.
- Ogni elemento interattivo ≥ 44 pt e con `accessibilityLabel`.

## Definition of Done

- [ ] `ui-kit` mostra tutti i componenti; confrontati con le schermate `.dc.html`, palette/font/raggi coincidono
- [ ] `grep -rn "#[0-9A-Fa-f]\{6\}" src --include=*.tsx` → nessun risultato fuori da token/mapStyle
- [ ] `Sheet` si chiude con swipe-down e tap sul backdrop su iOS e Android
- [ ] Test verdi, typecheck e lint puliti
- [ ] Ogni componente ha test scritti prima del codice; nessun `any`; funzioni < 40 righe
- [ ] Tutte le stringhe nuove esistono in `it` e `en` (`npm run i18n:check` pulito) e le schermate sono state provate in entrambe le lingue
- [ ] Commit: `feat(03): design system and ui kit`
