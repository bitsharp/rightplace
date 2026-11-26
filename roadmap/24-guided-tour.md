# 24 — Guida interattiva ("Come funziona")

Leggi `CLAUDE.md` (principi 1, 2, 5, 9, 10; design system; TDD; i18n), il flusso di onboarding (`app/profile-setup.tsx`, `RootNavigator`, `Stack.Protected`), l'elenco di Modifica profilo (`src/features/profile/screens/EditProfileScreen.tsx`, sezione "Aiuto e supporto"), gli store persistiti esistenti (`src/features/map/store/mapStore.ts`, `src/features/posts/store/seenStories.ts`: stesso schema di persistenza) e le schermate dove compariranno i fumetti.

> **Ruoli e metodo**: architetto → questo piano; `/model sonnet` → TDD, un blocco = un commit; architetto → review. **Nessuna nuova dipendenza**: overlay e spotlight con `react-native-svg` e `react-native-reanimated` già presenti; tutto arriva con `eas update`. Nessuna migration.

## Decisioni (Luca, 26/11/2026)

- Tre pezzi: **benvenuto** (3 schermate una volta sola), **fumetti sul posto** (prima apertura di ogni schermata), voce **"Come funziona"** in Profilo → Aiuto e supporto che rivede tutto.
- Cosa è stato visto lo ricorda **solo il telefono** (store zustand persistito come gli altri). Nessun dato al server, nessun analytics (principio 9).
- Testi brevi, IT + EN, una frase per fumetto. Le note informative già presenti nelle schermate restano e i fumetti non le ripetono.

## Blocco 1 — Stato della guida (`feat(24): tour state`)
- `src/features/tour/domain/`: tipi puri `TourStepId` (union degli id dei fumetti, elenco sotto) e `TourScreen`; funzione pura `nextStep(screen, seen)` → il primo fumetto non visto di quella schermata in ordine, oppure `null`.
- `src/features/tour/store/tourStore.ts`: zustand `persist` (stesso storage/pattern di `mapStore`, chiave `rightplace.tour`, `version` 1): `welcomeSeen: boolean`, `seenSteps: TourStepId[]`, azioni `markWelcomeSeen`, `markStepSeen(id)`, `resetTour()` (riporta tutto a non visto). Si azzera anche all'uscita dall'account se gli altri store per-utente lo fanno (verifica `signOutCleanup`); altrimenti resta per dispositivo.
- Test: `nextStep` (ordine, tutti visti → null), store (persistenza, reset, migrate con valore non valido → default).

## Blocco 2 — Benvenuto (`feat(24): welcome slides`)
- Schermata `app/welcome.tsx` → `WelcomeScreen`: 3 pagine orizzontali con paginazione a puntini, "Salta" sempre visibile, "Avanti" / "Inizia" sull'ultima. Illustrazioni semplici con `react-native-svg` e i token (niente immagini nuove pesanti): 1) **"Dove va la gente stasera"** — mappa con punti caldi, grigio = "di solito", viola = "stasera"; 2) **"Dichiara la tua serata"** — "Ci vado" / "Forse" in 3 tap, gli amici ti vedono sulla mappa amici; 3) **"La tua privacy"** — mai numeri esatti (fasce, "pochi" sotto 3), foto solo per gli amici, chat 2 giorni, post e messaggi 7 giorni, posizione solo se la attivi.
- Compare **una volta**, subito dopo l'onboarding completo (profilo + handle) e prima dei tab, per gli utenti che non l'hanno visto — inclusi quelli già registrati alla prima apertura dopo l'update. Guardia in `RootNavigator` coerente con `Stack.Protected` esistente; "Salta" e "Inizia" chiamano `markWelcomeSeen` e vanno ai tab. Non deve allungare il percorso dichiarazione (principio 10): dopo il benvenuto si arriva alla mappa.
- Accessibilità: ogni pagina ha titolo come header, bottoni ≥ 44, testo scalabile.
- Test: prima volta → benvenuto; dopo "Salta"/"Inizia" → tab e non ricompare; utente con `welcomeSeen` → direttamente ai tab; navigazione tra le pagine.

## Blocco 3 — Fumetti sul posto (`feat(24): contextual tips`)
- Componenti in `src/features/tour/components/`:
  - `TourAnchor`: wrapper che registra la posizione di un elemento (`measureInWindow` su layout) per un `TourStepId` in un registro in memoria (context, non persistito).
  - `TourOverlay`: montato una volta per schermata (o nel root), mostra il primo fumetto non visto della schermata a fuoco quando la sua ancora è misurata: sfondo scuro con **buco** attorno all'ancora (SVG `Path`/mask, angoli arrotondati), fumetto con freccia sopra o sotto secondo lo spazio, testo + "Ho capito"; tap sul fumetto, su "Ho capito" o fuori → `markStepSeen` e passa al successivo della stessa schermata. Animazione di comparsa breve con reanimated; rispetta "Riduci movimento" (`AccessibilityInfo.isReduceMotionEnabled`) senza animazioni.
  - Mai più di un fumetto alla volta; mai sopra il benvenuto o un modal aperto; nessun fumetto se l'ancora non è presente (es. "+" visibile solo dopo la dichiarazione → quel fumetto aspetta).
  - `accessibilityViewIsModal` sul fumetto, focus del lettore di schermo sul testo.
- Fumetti (id → ancora → testo, IT/EN nel namespace `tour`):
  | id | Schermata / ancora | Messaggio (senso) |
  |---|---|---|
  | `map.viewToggle` | Mappa: selettore Amici / Mappe | Amici: dove vanno i tuoi amici. Mappe: i punti caldi della città. |
  | `map.hotSpot` | Mappa: colonna dei bottoni o primo punto caldo visibile (scegli l'ancora stabile: preferisci la colonna `map-controls` se il punto caldo non è misurabile in modo affidabile su react-native-maps) | Tocca un locale per vedere chi ci va e dichiarare la serata. |
  | `venue.declare` | Dettaglio locale: bottone CI VADO | Dichiara la tua serata: Ci vado o Forse. |
  | `venue.bands` | Dettaglio locale: riquadri CI VANNO / FORSE | Contiamo a fasce, mai le singole persone. |
  | `topbar.plus` | TopBar: bottone "+" (solo dopo la dichiarazione) | Domani pubblica le foto della serata: si cancellano dopo 7 giorni. |
  | `chat.night` | Chat di serata (lista o accesso dalla serata) | La chat della serata si cancella dopo 2 giorni. |
  | `friends.search` | Amici: ricerca per @handle | Cerca gli amici per @handle e manda una richiesta. |
  | `profile.message` | Profilo di un amico: bottone Messaggio | Scrivigli in privato: i messaggi durano 7 giorni. |
  Testi definitivi brevi; nessuna ripetizione delle note già presenti in pagina.
- Test: overlay mostra il primo fumetto non visto quando l'ancora è misurata; "Ho capito" → successivo → nessuno; fumetto già visto non ricompare; ancora assente → niente; reduce motion → niente animazione (render immediato); un fumetto alla volta.

## Blocco 4 — "Come funziona" (`feat(24): how it works entry`)
- Riga "Come funziona" / "How it works" in Profilo → Aiuto e supporto (prima del feedback): apre il benvenuto in modalità "rivedi" (stessa schermata, "Chiudi" invece di "Salta", torna indietro) e chiama `resetTour()` così i fumetti ricompaiono alla prossima apertura di ogni schermata. Messaggio Toast "I suggerimenti ricompariranno nelle schermate" IT/EN.
- Aggiorna il test che elenca tutte le righe delle impostazioni.
- Test: tap sulla riga → benvenuto in modalità rivedi; reset dei fumetti; chiusura → torna al profilo.

## Documentazione
- `docs/tour.md`: cosa vede l'utente e quando, elenco fumetti, come aggiungerne uno (nuovo id + `TourAnchor` + testi IT/EN + test), stato solo sul dispositivo.

## Definition of Done
- [ ] 4 commit, ognuno con jest/typecheck/lint (zero warning)/`i18n:check`/`format:check` verdi
- [ ] Benvenuto una volta sola (anche per gli utenti già registrati), saltabile, rivedibile
- [ ] Fumetti uno alla volta, solo con ancora presente, mai ripetuti, reset da "Come funziona"
- [ ] Nessuna nuova dipendenza, nessuna migration, nessun dato al server: distribuibile con `eas update`
- [ ] Il percorso mappa → dichiarazione resta ≤ 3 tap (i fumetti si chiudono con un tap e non bloccano il CI VADO)
- [ ] IT + EN complete
