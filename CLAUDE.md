# RightPlace — contesto di progetto per Claude Code

> Questo file sta nella root del repository `bitsharp/rightplace` e Claude Code lo legge automaticamente a ogni sessione, locale o cloud.
> Fonte di verità per il prodotto: il mock-up in `design/project/*.dc.html` (14 schermate + componente TopBar), esportato dall'artifact Claude Design "RightPlace Mockup".

## Cos'è RightPlace

App mobile (iOS + Android) per scoprire **dove va la gente stasera**. L'utente dichiara la sua serata in un locale ("Ci vado" / "Forse") e vede, su una mappa, i punti caldi della città con l'affluenza prevista per fascia d'età e genere. Intorno al nucleo ci sono: una rete di **amici** (follow), una **chat effimera** per ogni serata, un **feed** di foto del giorno dopo, e i **creator** (organizzatori) che pubblicano e sponsorizzano serate tramite abbonamento.

**Lingue UI: italiano e inglese**, entrambe complete al rilascio (lingua del device, cambiabile nel profilo). **Città di lancio: Milano**; il modello dati supporta più città (il mock-up mostra anche Las Palmas, Madrid, Barcellona), attivabili senza codice.

## Le 14 schermate del mock-up (ordine del flusso)

| # | File | Cosa fa |
|---|---|---|
| 1 | `Main.dc.html` | Accesso: email + password, verifica "non sono un robot", consenso privacy |
| 2 | `Profilo.dc.html` | Profilo privato (onboarding): età, genere, toggle posizione, toggle contatti, "Sono un creator" |
| 3 | `Mappa.dc.html` | Mappa: ricerca, toggle **Mappa generale / Mappa amici**, punti caldi SI/FORSE, marker "Tu", card **Sponsorizzata** e **Consigliata per te**, lista amici per locale, tab bar |
| 4 | `Serata.dc.html` | Dichiara la serata: SI / FORSE, modifica/annulla, scadenza, "Chiedi all'AI", "Rimuovi la mia icona" |
| 5 | `Chat.dc.html` | Chat di gruppo della serata: solo amici seguiti che vengono, foto, tag @, si cancella 2 giorni dopo |
| 6 | `GiornoDopo.dc.html` | Il giorno dopo: promemoria, posta foto/testo, visibile ai follower, nel feed dal giorno dopo, scade dopo 7 giorni |
| 7 | `CreaSerata.dc.html` | Creator: crea serata (luogo, nome, descrizione, orario, target età/genere) |
| 8 | `Abbonamento.dc.html` | Creator: scelta piano e pagamento → può sponsorizzare serate |
| 9 | `Amici.dc.html` | Amici: cerca per @tag, segui/non seguire, dove va stasera |
| 10 | `Ricerca.dc.html` | Cerca locali: filtri città e tipo (Club/Rooftop/Bar/Live), recenti, sponsorizzati, affluenza SI/FORSE |
| 11 | `Locale.dc.html` | Dettaglio locale: affluenza a fasce, "Chi ci va" (età media, genere) con soglia k≥3, amici che ci vanno, **Andare e tornare** (taxi, Uber, Free Now, trasporto pubblico ATM), CTA dichiara |
| 12 | `Feed.dc.html` | Feed: post dei seguiti, like, commenti, scadenza 7 giorni, barra storie |
| 13 | `ProfiloApp.dc.html` | Profilo dentro l'app: stesso form del 2 + "Il tuo profilo creator" |
| 14 | `CreatorProfilo.dc.html` | Profilo creator: piano attivo, cambia/annulla, le sue serate (in programma / passate) con adesioni |
| — | `TopBar.dc.html` | Componente: bottone "+" (post) visibile solo dopo la dichiarazione, handle @, campanella novità, storie |

## Principi di prodotto NON negoziabili

1. **Identità pubblica = solo handle `@animale.colore`** (es. `@lince.rosso`), fascia d'età e genere. Email, età esatta, posizione, contatti **non sono mai visibili ad altri utenti**.
2. **Aggregati con k-anonimato**: ogni statistica su un gruppo (affluenza, età media, % genere) viene restituita dal server **solo se il gruppo ha ≥ 3 persone**; altrimenti `null` e la UI mostra "pochi" / il messaggio "meno di 3 persone… dati nascosti". L'affluenza si mostra sempre **a fasce** (`pochi`, `3–10`, `10–20`, `20–30`, `30–50`, `50–100`, `100+`), mai il numero esatto. La regola vive nelle funzioni SQL, non nel client.
3. **Posizione opt-in e grossolana**: il toggle "Posizione" è off di default; se attivo, il client invia solo la posizione **arrotondata a ~500 m** e solo mentre l'app è in primo piano; serve esclusivamente al marker "Tu" e al centraggio della mappa. Nessun tracking in background, nessuna cronologia salvata.
4. **Contatti opt-in e hashati**: l'import contatti serve solo a suggerire amici; si inviano al server solo **hash SHA-256 dei numeri normalizzati E.164**, mai i numeri né i nomi; gli hash non vengono conservati dopo il matching.
5. **Contenuti effimeri per design**: chat di serata cancellata **2 giorni** dopo; post del feed cancellati **7 giorni** dopo; dichiarazioni scadute non consultabili. La cancellazione è un job server (pg_cron), non una promessa della UI.
6. **Visibilità e follow con accettazione (modello Instagram, account privati)**: ogni profilo è privato. Chiunque può trovare un handle in ricerca e vederne solo `handle, age_band, gender, is_creator`; tutto il resto — dove va stasera, foto e post, chat di serata, tag — è visibile a B **solo se B ha richiesto di seguire A e A ha accettato** (`follows.status = 'accepted'`). Una richiesta `pending` non sblocca nulla; A può rifiutare o rimuovere un follower in qualsiasi momento e la visibilità cade subito. "Seguire" nel codice e nelle RPC significa **sempre** follow accettato: la regola vive nelle policy e nelle funzioni SQL, non nel client.
7. **Moderazione obbligatoria** (requisito App Store per UGC): segnala contenuto, blocca utente, filtro automatico sulle foto, rimozione entro 24 h, termini d'uso con tolleranza zero.
8. **Età minima 18 anni**, verificata all'onboarding.
   **Lingue**: ogni testo visibile esiste in italiano **e** inglese dal primo commit; una feature con stringhe mancanti in una delle due lingue non è finita.
9. **Nessuna vendita di dati, nessun SDK pubblicitario.** Le uniche "pubblicità" sono le serate sponsorizzate dai creator, etichettate **SPONSORIZZATA**.
10. **Il check-in resta veloce**: dalla mappa alla dichiarazione in ≤ 3 tap.
11. **Due strati sulla mappa, mai confusi**: lo strato **"di solito"** (`typical_level` 0–3 per venue/giorno/ora, da `venue_typical_busyness`) è grigio, neutro e serve a non mostrare il vuoto; lo strato **"stasera"** (dichiarazioni, `going_band`/`maybe_band`) è colorato e rispetta il principio 2. Lo strato tipico **non** usa mai i "Popular times" di Google (non esposti dall'API, scraping vietato dai termini): nasce da curatela manuale e viene sostituito dalla nostra media storica (k ≥ 3) appena ci sono dati. In UI i due strati hanno etichette diverse ("di solito" / "stasera") e l'uno non si somma mai all'altro.

## Stack e vincoli tecnici

- **Expo SDK (ultimo stabile) + TypeScript strict + Expo Router.** Niente bare workflow salvo necessità motivata.
- Mappa: `react-native-maps` (Apple Maps iOS / Google Maps Android), stile dark. Dati locali da **Google Places API (New)** via Edge Function (mai la chiave Places nel client), con cache in tabella `venues`. **Nessuna libreria o servizio di scraping dei Popular times** (`populartimes`, SerpApi e simili) né in client né in Edge Function.
- Stato: `zustand` per UI/sessione, `@tanstack/react-query` per dati remoti.
- Backend: **Supabase** — Postgres, Auth (email + password), Storage (foto), Realtime (chat), Edge Functions, pg_cron. Tutte le letture aggregate passano da **RPC `security definer`**; mai select dirette su tabelle con dati per-utente altrui.
- Captcha: **Cloudflare Turnstile** collegato a Supabase Auth (captcha protection).
- Email transazionali: SMTP custom (es. **Resend**), perché l'SMTP di default Supabase è limitato a pochi invii/ora.
- Pagamenti creator: **RevenueCat** (StoreKit 2 + Google Play Billing). Vedi prompt 13 per la motivazione.
- Push: `expo-notifications` + Expo Push Service (Edge Function che invia). Locali per i promemoria.
- AI ("Chiedi all'AI"): Edge Function che chiama l'API Claude (modello economico) con i dati del locale; mai la chiave nel client.
- Variabili d'ambiente in `.env` con prefisso `EXPO_PUBLIC_`. **Mai** committare `service_role`, Places key, Anthropic key, Stripe/RevenueCat secret: vivono solo in Supabase Edge Function secrets / EAS secrets.
- Stile: `StyleSheet` + token in `src/theme`. Niente Tailwind/NativeWind.
- Font: Unbounded (display), Inter (body), Space Mono (label mono) via `@expo-google-fonts`.
- **i18n**: `i18next` + `react-i18next` + `expo-localization`; namespace per feature; chiavi in `src/i18n/it/*.json` e `src/i18n/en/*.json`; **nessuna stringa UI hardcoded**, nemmeno nei test (si testa per chiave o con `t` mockato). Date, numeri e plurali via `Intl`. Il contenuto generato dall'AI e le notifiche push rispettano la lingua dell'utente (`profiles.locale`).
- Test: `jest-expo` + `@testing-library/react-native`; SQL con `pgTAP`; e2e con Maestro.
- Lint/format: ESLint (config expo) + Prettier. Zero warning al commit.

## Design system (dal mock-up)

- Dark-first. Background `#0B0B12`, superfici `#15151F`, bordi `#2A2A3A`.
- **Viola `#9D6BFF`** = "Ci vado" / primario / sponsorizzata. **Ciano `#4ED9C7`** = "Forse" / secondario / label informative.
- Testo `#F2F1F8`, secondario `#A3A1B8`. Genere nelle barre: donne `#F2B1CB`, uomini `#86B6E3`.
- Label maiuscole in Space Mono 10–12 px con letter-spacing 1.2–1.5 (es. `SPONSORIZZATA`, `SOLO CHI HA DICHIARATO`).
- Radius: card 16–18, bottoni 14–16, segmented 12 (interno 9), pill 999. Bottone primario alto 56, tap target ≥ 44.
- Tab bar a 5 voci: Mappa · Amici · Chat · Feed · Profilo. TopBar: "+" (solo dopo dichiarazione), handle, campanella, storie.
- Haptics su dichiarazione, follow, like, invio messaggio.

## Expo / EAS: progetto e credenziali

Il progetto EAS esiste già: **non** eseguire `eas init` né crearne un altro. Riferimenti fissi, da usare in `app.config.ts` (prompt 02):

| Chiave | Valore |
|---|---|
| Owner (account Expo) | `bitsharp-slu` |
| Slug | `rightplace` |
| Project ID (`extra.eas.projectId`) | `8eb7e0f8-8c1b-43fe-a730-924c140f2438` |

- `owner: "bitsharp-slu"` è obbligatorio nella config: l'account Expo non coincide con l'utente GitHub (`bitsharp`); senza di esso `eas` cerca il progetto sull'account sbagliato.
- Autenticazione non interattiva: variabile d'ambiente **`EXPO_TOKEN`** (token creato su expo.dev/settings/access-tokens). Vive solo nell'ambiente cloud di Claude Code (claude.ai/code → ambiente Default → variabili) e, in locale, nelle variabili utente di Windows. **Mai** nel repo, in `.env` committati, in `eas.json` o nei prompt.
- Se `EXPO_TOKEN` manca, `eas whoami` fallisce: fermarsi e chiederlo a Luca, non lanciare `eas login`.

## Budget EAS: restare nel piano Free

Il piano Free di EAS dà 30 build cloud/mese a bassa priorità, **di cui al massimo 15 iOS**. EAS Update è gratis fino a 1.000 utenti attivi. Regole vincolanti:

- **Mai lanciare `eas build` nel cloud senza chiedere conferma esplicita a Luca.**
- **Android: sempre `eas build --platform android --local`** (gratis, illimitato). Mai Android nel cloud.
- **iOS cloud: solo build `preview` o `production` richieste esplicitamente.** Obiettivo: ≤ 2 build iOS al mese.
- Sviluppo quotidiano: **Expo Go** finché possibile. Questa app ha dipendenze native non supportate da Expo Go (`react-native-purchases`, eventualmente `expo-contacts`/camera): quando servono si costruisce **un solo dev client** (iOS cloud + Android locale) e lo si ricostruisce solo se cambiano dipendenze native, permessi o config plugin.
- Ogni modifica JS/asset/stringhe va ai tester con **`eas update`**, mai con una nuova build.
- Prima di qualunque build cloud: `npx expo-doctor` e `npx expo prebuild --no-install` in locale devono passare, poi `eas build:list` per controllare la quota usata.
- Le build Free sono in coda a bassa priorità (anche > 1 h nei picchi): lanciarle a fine giornata.

## Modelli: chi fa cosa

Ruoli fissi. Il cambio modello si fa con `/model`; Claude deve **proporre il cambio quando il tipo di lavoro lo richiede** (es. *"Qui serve l'architetto: passa a Opus con `/model`"*).

| Ruolo | Modello | Quando |
|---|---|---|
| **Architetto** | **Claude Fable** (preferito) o **Claude Opus** | Lettura di un nuovo prompt e piano d'attacco; design di schema, RLS e RPC; decisioni su struttura, state management, contratti client/backend; review finale di ogni prompt; audit privacy e moderazione; debugging che non si risolve in 2 tentativi |
| **Sviluppatore** | **Claude Sonnet** | Tutto il resto: test e codice secondo il piano, componenti UI, migration già disegnate, refactor, fix lint/typecheck, documentazione, commit |

Flusso per ogni prompt `NN`:
1. **Architetto**: legge prompt, `CLAUDE.md`, le schermate del mock-up citate e il codice esistente → piano numerato con file da creare/modificare, interfacce/tipi pubblici e **lista dei test**. Nessun codice di produzione, al massimo le firme.
2. `/model sonnet` → **Sviluppatore**: esegue il piano in TDD, una voce alla volta.
3. `/model opus` (o fable) → **Architetto**: review del `git diff`, Definition of Done punto per punto, violazioni dei principi. Poi lo sviluppatore committa.

**Nelle sessioni cloud (e ovunque non sia pratico usare `/model`)**: il modello principale della sessione fa da **Architetto** (piano e review) e **delega l'implementazione al subagente `implementer`** (`.claude/agents/implementer.md`, configurato su Sonnet; fallback `CLAUDE_CODE_SUBAGENT_MODEL` in `.claude/settings.json`). Il modello principale non scrive codice di produzione né test: li fa scrivere a `implementer`, poi rivede il `git diff`. Per i prompt puramente esecutivi (schermata già specificata nel mock-up) Luca può avviare la sessione direttamente con Sonnet.

Decisione architetturale non prevista dal piano (nuova libreria, cambio schema, nuova RPC)? **Fermarsi e chiedere il cambio modello.**

## Clean code e TDD (obbligatori)

**TDD — ciclo red/green/refactor per ogni unità di lavoro:**
1. Prima il test che descrive il comportamento (nome = frase: `it('nasconde l\'età media quando il gruppo ha meno di 3 persone')`).
2. Deve **fallire** per il motivo giusto.
3. Il **minimo** codice che lo fa passare.
4. Refactor a test verdi. Ripetere.
- Vale per funzioni pure (fasce di affluenza, arrotondamento posizione, hashing contatti, TTL), hook e store, componenti (render + interazione), RPC SQL (pgTAP scritto prima della RPC), Edge Functions (Deno test).
- Codice senza test corrispondente → la review lo rifiuta. Niente snapshot come unico test. Mock solo ai confini (Supabase, Places, RevenueCat, notifiche, timer, fotocamera).

**Clean code:**
- Funzioni ≤ ~40 righe, file ≤ ~250; un livello di astrazione per funzione; nomi che dicono cosa, non come.
- Commenti solo sul *perché* (vincolo privacy, bug libreria, decisione prodotto).
- Niente `any`, `@ts-ignore`, `!` non motivato. `zod` ai confini (env, risposte RPC/Edge).
- Logica di dominio in funzioni pure in `src/features/<feature>/domain/`, separata da React e Supabase. Componenti sottili.
- Una sola fonte di verità per stato; niente duplicati tra zustand e TanStack Query.
- Early return; niente flag booleani come parametro; errori tipizzati (`type RpcError = 'INVALID_CREDENTIALS' | …`); mai `catch` vuoti.
- Regola del boy scout; refactor e feature in commit separati.
- SQL: `COMMENT ON FUNCTION` con la garanzia di privacy di ogni RPC; snake_case; una migration = un cambiamento coerente.

## Struttura cartelle attesa

```
app/                      ← route Expo Router
  (auth)/                 ← accesso, registrazione, profilo iniziale
  (tabs)/                 ← map, friends, chat, feed, profile
  venue/[id].tsx, event/[id].tsx, night/[id]/chat.tsx, post/new.tsx
  creator/                ← profilo creator, nuova serata, abbonamento
src/
  components/ui/          ← Button, Chip, SegmentedControl, Card, Sheet, Text, Screen, Avatar, RangeStat, …
  components/app/         ← TopBar, TabBar, VenueMarker, HotSpot, PostCard, MessageBubble, SponsoredCard
  features/               ← auth, profile, venues, map, nights (dichiarazioni), friends, chat, posts, creator, billing, ai, notifications, moderation
  lib/                    ← supabase.ts, env.ts, database.types.ts, analytics.ts
  theme/  i18n/
supabase/
  migrations/  functions/  seed.sql  tests/
design/project/*.dc.html  ← mock-up (fonte di verità visiva)
roadmap/
```

## Convenzioni di lavoro con Claude Code

- Prima di scrivere codice, leggi il prompt corrente in `roadmap/` e **le schermate del mock-up che cita**.
- Rispetta ruoli dei modelli e ciclo TDD; proponi `/model` quando cambia il tipo di lavoro.
- Ogni prompt termina con una **Definition of Done**: verifica ogni punto e riportalo.
- Nessuna libreria fuori da questo file senza spiegare il perché e chiedere conferma.
- Mai modificare migration già applicate: nuova migration.
- Commit convenzionali: `feat(NN): …`, `fix: …`, `chore: …`.
- Azione manuale richiesta (dashboard Supabase, Apple, Play, RevenueCat, Google Cloud)? Fermati e scrivi esattamente cosa deve fare Luca.
- Il mock-up contiene dati di esempio (locali, affluenze, numeri di telefono fittizi): **non copiarli nel seed come se fossero veri**; il seed usa locali reali di Milano presi da Places o dichiaratamente finti.

## Vocabolario di dominio

| Termine | Significato |
|---|---|
| venue | locale (da Google Places): club, rooftop, bar, live |
| event / serata | evento creato da un creator in un venue, con orario e target |
| night | la "serata" logica di un venue in una data: dalle 06:00 alle 06:00 successive |
| declaration | dichiarazione dell'utente per una night o un event: `going` ("Ci vado") o `maybe` ("Forse") |
| band | fascia di affluenza mostrata (`pochi`, `3–10`, … `100+`) |
| age band | `18-24`, `25-34`, `35-44`, `45+` |
| gender | `female`, `male`, `other` (mostrato solo in aggregato) |
| handle | identità pubblica `@animale.colore`, generata, cambiabile una volta (stesse liste in IT; l'handle non si traduce) |
| locale | lingua dell'utente: `it` o `en`, salvata in `profiles.locale` |
| follow | relazione asimmetrica A segue B con `status` `pending` (richiesta inviata) o `accepted` (B ha accettato); "seguire" = `accepted`; "amici" nella UI = chi segui con follow accettato |
| follow request | riga `follows` in `pending`; B la vede in "Richieste" e sceglie Accetta / Rifiuta |
| night chat | chat effimera legata a (venue, night) o a un event, TTL 2 giorni |
| post | foto/testo del giorno dopo, TTL 7 giorni, solo follower |
| creator | utente con profilo creator; può creare event; con abbonamento attivo può sponsorizzarli |
| sponsored | event/venue in evidenza (etichetta SPONSORIZZATA) |
| hot spot | punto caldo sulla mappa: venue con affluenza visibile (≥ 3) — strato "stasera" |
| typical dot | punto grigio dello strato "di solito": venue con `typical_level ≥ 1` nell'ora corrente ma senza hot spot |
| typical_level | affluenza tipica di un venue per giorno/ora: `0` chiuso/vuoto, `1` tranquillo, `2` animato, `3` pieno; da curatela manuale (`source='manual'`) o dalla nostra storia (`source='history'`) |
| k | soglia di anonimato = 3 |
