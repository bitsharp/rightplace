# 22 — Restyle dell'interfaccia (mock-up del 24/11/2026)

Leggi `CLAUDE.md` (principi 1, 2, 3, 6, 11; design system; TDD) e guarda il riferimento visivo `design/restyle/2026-11-mockup.webp` (5 schermate: home mappa "STASERA MILANO", mappa con toggle Mappe/Amici, dettaglio locale, "La tua serata", profilo a elenco).

> **Ruoli e metodo**: architetto → questo piano; `/model sonnet` → TDD, un blocco = un commit; architetto → review di ogni blocco. Tutto arriva ai tester con `eas update`: **nessuna nuova dipendenza nativa** (niente `expo-linear-gradient`, niente `expo-blur`: gradienti e bagliori con `react-native-svg`, già presente).

## Decisioni di Luca (24/11/2026) e adattamenti ai principi

Il mock-up è un riferimento di stile, non di contenuto. Dove contraddice i principi vince il principio:

| Nel mock-up | Nell'app |
|---|---|
| "CI SONO 38 / FORSE 24", "23 persone" (numeri esatti) | **Fasce** (`3–10`, `20–30`…) con lo stesso stile grafico grande; sotto k = 3 "pochi" (principio 2). Mai numeri esatti. |
| Volti delle persone sulla mappa generale | Volti **solo nella "Mappa amici"** e solo per chi è un amico (foto visibile secondo la regola del principio 1: follow accettato in una delle due direzioni, mai con blocco). La mappa generale mostra solo i punti caldi a fasce e lo strato "di solito". |
| Nome e cognome "Francesco Reale", "Milano, Italia" | **@handle** + fascia d'età · genere; nessun nome reale (principio 1). La città mostrata è la città della mappa scelta (non la posizione). |
| "Condividi la tua posizione con gli amici" | **Non si implementa** (principio 3: posizione solo per il marker "Tu"). Nessun segnaposto finto. |
| "Amici della serata (12)", "I tuoi amici" con volti | Ammesso: sono amici (follow accettato) e il loro numero non è un aggregato anonimo. Foto solo se visibile per il principio 1, altrimenti iniziale. |
| "1.2 km", "Taxi ~5 min", "Uber ~5 min" | La distanza solo se la posizione è attiva (cella grossolana, principio 3); niente tempi stimati inventati: i riquadri di "Andare e tornare" mostrano icona e nome del servizio, senza minuti. |

## Blocco 1 — Font e colori (`feat(22): new display font and color tokens`)
- Font display: **Barlow Condensed** (ExtraBold Italic 800 per i titoli grandi tipo "STASERA MILANO", "TOCQUEVILLE 13", Bold per i sottotitoli) via `@expo-google-fonts/barlow-condensed` (pacchetto JS + font, nessun codice nativo: arriva con `eas update`). Inter resta per il testo, Space Mono per le label mono. Aggiorna `src/theme/tokens.ts` (`fonts.display`, eventuale `fonts.displayItalic`), il caricamento font all'avvio e la riga "Font" del `CLAUDE.md`. Rimuovi `@expo-google-fonts/unbounded` se non più usato.
- Colori: viola più acceso come nel mock-up (`#B14CFF` circa per primario/glow; verifica il contrasto AA sul fondo scuro), superfici con angoli più tondi (card 20–24), pill piene viola per il primario e contorno per i secondari (come "CI VADO" / "FORSE" / "TUTTI"). Tutto via token; nessun hex nei componenti.
- Componente `Glow` (react-native-svg, gradiente radiale viola) per i bagliori dietro i punti caldi e i titoli.
- Test: snapshot non ammessi come unico test → test sui token (contrasto con funzione pura `contrastRatio`), sul caricamento dei font, sui componenti base aggiornati (Button varianti, Chip, SegmentedControl).

## Blocco 2 — Foto profilo ovunque per gli amici (`feat(22): friends' profile photos everywhere`)
- Migration nuova (pgTAP prima): aggiungi l'id dell'amico dove oggi c'è solo l'handle, senza cambiare chi è restituito:
  - `get_city_map` vista amici (`friends_going` → anche gli id, es. `friends jsonb` con `{user_id, handle}`), drop + create con stesse regole;
  - `get_venue_stats` (`friends` jsonb: aggiungi `user_id`), e `get_event_detail` se ha lo stesso campo;
  - `get_my_activity`: aggiungi `actor_id` (solo per righe già visibili).
  Test: stesse righe di prima, id coerenti, nessun id di non amici, `11_privacy_contract` verde.
- Client: foto (con `useAvatarUrls`, batch per schermata, `persist: false`) in: marker amici della "Mappa amici", "I tuoi amici" nel dettaglio locale, "Amici della serata" nella dichiarazione/"La tua serata", bolle della chat di serata (accanto all'handle), Novità, barra in alto accanto al mio @handle. Ricerca utenti e richieste di follow restano con l'iniziale (principio 1). Fallback iniziale ovunque.
- Test componenti e integrazione con `renderApp` (foto per amico visibile, iniziale altrimenti, una chiamata `avatar-urls` per schermata).

## Blocco 3 — Mappa (`feat(22): restyled map home`)
- Titolo grande "STASERA {CITTÀ}" (Barlow Condensed italic, "{città}" in viola) con sottotitolo "Scopri dove andare, con chi e cosa c'è stasera." e icona filtri; toggle **Mappe / Amici** a pill in alto (stesso `SegmentedControl` restilizzato); barra città/ricerca in basso con icona "vai alla mia posizione" (solo se la posizione è attiva).
- Stile mappa **Android**: JSON di stile scuro con strade in viola tenue (`customMapStyle`); **iOS**: resta Apple Maps scuro (nessun cambio nativo). Punti caldi con `Glow` viola/ciano e anello; dimensione per fascia come oggi; typical dot grigi invariati (principio 11).
- Card del locale in basso (la prima dei "punti caldi" o la mia serata): foto di copertina se c'è, nome, **fascia** di affluenza ("20–30 persone" / "pochi"), distanza solo con posizione attiva, chip tag (tipo locale), freccia → dettaglio.
- Mappa amici: marker con le foto degli amici (blocco 2) raggruppati per locale (max 2 volti + "+N").
- Test: componenti nuovi, mappa generale senza volti (test esplicito), card con fascia e mai numero esatto, "pochi" sotto k.

## Blocco 4 — Dettaglio locale e "La tua serata" (`feat(22): restyled venue and declaration screens`)
- Dettaglio: foto di copertina grande a tutta larghezza con sfumatura in basso (se assente, gradiente viola), nome in Barlow Condensed italic maiuscolo, indirizzo (+ distanza solo con posizione), stato "Aperto · Chiude alle …" dagli orari, due riquadri grandi **CI VANNO {fascia}** / **FORSE {fascia}** (mai numeri esatti; "pochi" sotto k), "I tuoi amici" con volti e "Vedi tutti", bottoni CI VADO (pieno) / FORSE / annulla (contorno), tag del locale; resto invariato (statistiche k ≥ 3, Andare e tornare, sito, Google Maps, chat).
- "La tua serata" (schermata/foglio di dichiarazione): titolo grande "LA TUA SERATA", card del locale, CTA "DICHIARA DOVE SEI", "Andare e tornare" a riquadri (Taxi / Uber / Mezzi, senza tempi), "Amici della serata (N)" con volti; nessun blocco "condividi posizione".
- Test: fasce e "pochi", nessun numero esatto renderizzato (test che cerca cifre esatte del conteggio fittizio), nessun "condividi posizione", navigazione invariata.

## Blocco 5 — Profilo a elenco (`feat(22): restyled profile`)
- Header: foto grande con matita per cambiarla, **@handle** (mai nome reale), fascia d'età · genere, città della mappa; contatori e griglia dei post restano (sotto o in una tab "Post").
- "Modifica profilo" diventa un elenco a righe come nel mock-up: **Impostazioni account** (Lingua, Notifiche, Privacy — posizione/contatti/telefono/bloccati —, Città della mappa, @tag), **Aiuto e supporto** (feedback; per il supporto "Feedback ricevuti"), **Informazioni** (Chi siamo, Termini e condizioni, Privacy Policy: aprono le pagine legali esistenti), bottone **Esci** a contorno, "Elimina account" in fondo. Ogni riga apre la sotto-schermata con il form di oggi: nessuna impostazione persa (test che le elenca tutte).
- Test di navigazione per ogni riga e per Esci.

## Definition of Done
- [ ] 5 commit, uno per blocco, ognuno con lint/typecheck/test verdi e `i18n:check` pulito (IT + EN)
- [ ] Nessun numero esatto di persone in nessuna schermata; "pochi" sotto k = 3 (test)
- [ ] Volti solo nella mappa amici e solo per amici (foto per principio 1), mai nella mappa generale (test)
- [ ] Nessun nome reale, nessuna condivisione di posizione
- [ ] Nessuna nuova dipendenza nativa: tutto distribuibile con `eas update`; l'unica migration è quella del blocco 2 (`npx supabase db push`)
