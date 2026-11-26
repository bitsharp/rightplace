# Guida interattiva ("Come funziona")

Prompt 24. Tutto vive sul telefono: nessun dato al server, nessun analytics (principio 9), nessuna migration.
Si distribuisce con `eas update`.

## Cosa vede l'utente e quando

1. **Benvenuto** (3 pagine: "Dove va la gente stasera", "Dichiara la tua serata", "La tua privacy"). Compare una volta, dopo
   l'onboarding completo (profilo + @handle) e prima dei tab, anche per chi era già registrato alla prima apertura dopo
   l'aggiornamento. "Salta" è sempre visibile; "Inizia" sull'ultima pagina porta alla mappa.
   La decisione è in `app/index.tsx` (reindirizza a `/welcome` se `welcomeSeen` è falso, dopo l'idratazione dello store).
2. **Fumetti sul posto**: alla prima apertura di una schermata, un fumetto alla volta con un buco di luce attorno
   all'elemento indicato. Si chiude con "Ho capito", toccando il fumetto o fuori; poi compare il successivo della
   stessa schermata. Mai prima che il benvenuto sia stato visto, mai su una schermata non a fuoco, mai se l'ancora
   non è presente (il fumetto aspetta: es. il "+" esiste solo dopo la dichiarazione). Con "Riduci movimento" attivo
   non c'è nessuna animazione.
3. **Come funziona**: Profilo → Aiuto e supporto → "Come funziona" riapre il benvenuto in modalità "rivedi"
   (`/welcome?mode=review`, "Chiudi" al posto di "Salta", torna al profilo) e azzera i fumetti.

## Fumetti

| id                | Schermata (`TourScreen`) | Ancora                                                                                                   |
| ----------------- | ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `map.viewToggle`  | `map`                    | selettore Amici / Mappe                                                                                  |
| `map.hotSpot`     | `map`                    | colonna bottoni `map-controls` (il punto caldo non è misurabile in modo affidabile su react-native-maps) |
| `topbar.plus`     | `map`                    | bottone "+" della TopBar (solo dopo la dichiarazione)                                                    |
| `venue.declare`   | `venue`                  | barra con il bottone CI VADO                                                                             |
| `venue.bands`     | `venue`                  | riquadri CI VANNO / FORSE                                                                                |
| `chat.night`      | `chat`                   | selettore Serate / Messaggi della lista chat                                                             |
| `friends.search`  | `friends`                | campo di ricerca per @handle                                                                             |
| `profile.message` | `userProfile`            | bottone Messaggio sul profilo di un amico                                                                |

L'ordine dei fumetti di una schermata è quello di `TOUR_STEPS` in `src/features/tour/domain/steps.ts`.

## Come aggiungere un fumetto

1. Nuovo id in `TourStepId` e una riga in `TOUR_STEPS` (con la sua schermata e la posizione nell'ordine).
2. `<TourAnchor id="…">` attorno all'elemento da indicare (usa `style`/`testID` se il wrapper cambia il layout).
3. Se la schermata non ha ancora un overlay: `<TourOverlay screen="…" />` nella radice della schermata
   (e il nome in `TourScreen`).
4. Testo in `tips.<id>` in `src/i18n/it/tour.json` e `src/i18n/en/tour.json`, una frase, senza ripetere le note già in pagina.
5. Test: l'integrazione in `src/__tests__/tourTips.test.tsx`; la logica pura in `domain/`.

## Stato

`useTourStore` (zustand `persist`, chiave `rightplace.tour`, versione 1): `welcomeSeen`, `seenSteps`,
`markWelcomeSeen`, `markStepSeen`, `resetTour`. Come `mapStore`, resta **per dispositivo** e non si azzera all'uscita
dall'account. Nei test lo stato di partenza è "tutto visto" (`src/test/tourState.ts`, `markTourSeen`); le suite sulla
guida usano `markTourUnseen`. `measureInWindow` si simula con `src/test/measure.ts`.
