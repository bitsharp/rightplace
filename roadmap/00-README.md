# RightPlace — Roadmap di sviluppo con Claude Code (v2, allineata al mock-up completo)

Roadmap operativa per costruire l'app iOS + Android di RightPlace con **Claude Code in Visual Studio Code**, a partire dalle 14 schermate del mock-up in `design/project/`.
Ogni file `NN-*.md` è un prompt autonomo da eseguire **in sequenza**; ognuno termina con una Definition of Done da verificare prima di passare al successivo.

> La v1 di questa roadmap descriveva un MVP anonimo e su invito. Questa v2 segue il mock-up completo: account, amici, chat, feed, creator. È più lunga (≈ 7–9 settimane part-time) e ha più fornitori. Se vuoi un primo rilascio più rapido, il **Milestone A** qui sotto è un'app usabile da sola.

## Stack

| Livello | Scelta | Costo iniziale |
|---|---|---|
| Client | Expo (React Native) + TypeScript + Expo Router | 0 |
| i18n | i18next + react-i18next + expo-localization (IT + EN) | 0 |
| Mappa | `react-native-maps` (Apple Maps iOS, Google Maps Android) | 0 (Maps SDK mobile illimitato) |
| Dati locali | Google Places API (New) via Edge Function, cache in DB | free tier per SKU (Text Search 5k/mese, Details 10k/mese) |
| Backend | Supabase: Postgres, Auth email, Storage, Realtime, Edge Functions, pg_cron | Free → **Pro 25 $/mese** consigliato dal Milestone B (Storage foto, no pausa) |
| Captcha | Cloudflare Turnstile | 0 |
| Email | Resend (SMTP custom per Supabase Auth) | 0 fino a 3.000/mese |
| Pagamenti creator | RevenueCat (StoreKit 2 + Play Billing) | 0 fino a 2.500 $/mese di ricavi |
| Push | Expo Push Service | 0 |
| AI | API Claude (modello economico) da Edge Function | pay-per-use, pochi €/mese |
| Errori / analytics | Sentry Free, PostHog EU Free | 0 |
| Build | EAS Build Free + Update Free (regole in `CLAUDE.md`) | 0 |
| Store | Apple Developer 99 $/anno, Google Play 25 $ una tantum | fissi |

## Struttura della roadmap

```
roadmap/
├── 00-README.md                  ← questo file
├── CLAUDE.md                     ← da copiare nella root del repo
├── 01-setup-account.md           ← checklist MANUALE: account, chiavi, costi
├── 02-scaffold-expo.md           ← progetto, struttura, lint, env, tab bar
├── 03-design-system.md           ← token e UI kit dalle 14 schermate
├── 04-supabase-schema.md         ← schema completo, RLS, RPC k-anonime, TTL
├── 05-auth-profile.md            ← accesso email, Turnstile, profilo privato, handle
├── 06-venues-search.md           ← Google Places, ricerca locali, città/tipo
├── 07-map.md                     ← mappa generale/amici, punti caldi, "Tu", card
├── 08-venue-and-declaration.md   ← dettaglio locale, statistiche, dichiara serata
├── 09-friends.md                 ← cerca @tag, follow, contatti hashati
├── 10-night-chat.md              ← chat di serata realtime, foto, TTL 2 giorni
├── 11-posts-feed.md              ← il giorno dopo, feed, like, commenti, storie
├── 12-creator-events.md          ← profilo creator, crea serata, adesioni
├── 13-creator-billing.md         ← abbonamento RevenueCat, sponsorizzazioni
├── 14-ask-ai.md                  ← "Chiedi all'AI" via Edge Function
├── 15-notifications.md           ← promemoria locali, push chat/feed/adesioni
├── 16-moderation-qa-privacy.md   ← moderazione UGC, audit privacy/GDPR, QA
├── 17-release-eas.md             ← EAS, TestFlight, Play, OTA
└── 18-backlog.md                 ← fuori perimetro e v2
```

## Milestone

| Milestone | Prompt | Cosa si può provare | Stima |
|---|---|---|---|
| **0 — Preparazione** | 01 | account e chiavi | ½–1 giorno (manuale) |
| **A — Nucleo** | 02 → 08 | accesso, profilo, ricerca locali, mappa con punti caldi, dichiarazione, dettaglio locale | 3 settimane |
| **B — Social** | 09 → 11 | amici, chat di serata, foto e feed | 2 settimane |
| **C — Creator & AI** | 12 → 14 | serate dei creator, abbonamento, sponsorizzate, Chiedi all'AI | 1,5 settimane |
| **D — Rilascio** | 15 → 17 | notifiche, moderazione, audit, TestFlight + Play | 1,5–2 settimane |

Dopo il Milestone A conviene già una build `preview` per 5–10 amici a Milano: il valore del prodotto si misura lì, prima di costruire il social.

## Come usare i prompt in Claude Code (VS Code)

1. `mkdir C:\projects\rightplace\app && cd C:\projects\rightplace\app && git init`
2. Copia `CLAUDE.md` nella root del repo; copia `roadmap/` e `design/` dentro il repo (il mock-up è la fonte di verità visiva: Claude Code deve poterlo leggere).
3. Apri la cartella in VS Code → pannello Claude Code.
4. Per ogni prompt, in ordine, con il **flusso architetto → sviluppatore → architetto**:
   - `/model opus` (o fable) → *"Leggi roadmap/NN-xxx.md, CLAUDE.md e le schermate del mock-up citate. Fai da architetto: piano numerato, interfacce e lista dei test. Niente codice."* Leggi il piano e correggilo se serve;
   - `/model sonnet` → *"Esegui il piano in TDD, una voce alla volta: test rosso → codice → verde → refactor."*;
   - `/model opus` → *"Review del diff contro la Definition of Done e i principi del CLAUDE.md."*;
   - **verifica tu la Definition of Done**, poi `git commit -m "feat(NN): <titolo>"`;
   - solo allora il prompt successivo.
5. Se un prompt fallisce a metà: *"riprendi il prompt NN dal punto X"*, non ripartire da zero.

### Regole d'oro

- **Un prompt = un commit.**
- **Fable/Opus progettano e revisionano, Sonnet implementa.** Se Claude Code non chiede il cambio modello quando cambia natura il lavoro, fallo tu con `/model`.
- **Test prima del codice, sempre.**
- **Mai saltare 04 (schema + RLS) e 16 (moderazione + privacy).** Il k-anonimato, i TTL e la visibilità ai soli follower si fanno nel database.
- **Nessuna build EAS cloud prima del prompt 17**, e lì max 2 iOS/mese (regole in `CLAUDE.md`).
- Dati di esempio del mock-up (locali, affluenze, telefoni) **non** diventano dati veri nel seed.
- Libreria non elencata nel `CLAUDE.md`? Chiedi perché prima di accettare.

## Decisioni già prese (per non riaprirle a ogni prompt)

- **Account con email + password** (come nel mock-up), non anonimo. L'identità pubblica resta però l'handle generato: email mai visibile.
- **Affluenze sempre a fasce** e statistiche solo con gruppi ≥ 3: è ciò che il mock-up mostra ("30–50", "pochi", "meno di 3 persone… dati nascosti").
- **Posizione e contatti opt-in**, grossolana la prima, hashati i secondi.
- **Pagamenti creator in-app via RevenueCat** (IAP Apple/Google), non Stripe: l'abbonamento sblocca una funzione dentro l'app (sponsorizzare), e Apple lo tratta come acquisto digitale. Stripe resterebbe possibile solo con checkout web esterno e rischio di rifiuto in review.
- **Trasporti ("Andare e tornare")**: solo deep link verso app esterne (Uber, Free Now, Google Maps transit) e `tel:` ai radiotaxi di Milano (02 8585, 02 6969, 02 4040) — nessuna integrazione API.
- **Multi-città nel dato, una città nel lancio**: **Milano**; le altre si attivano cambiando una riga in `cities`.
- **Due lingue dal primo giorno**: italiano e inglese, con `i18next`; la lingua segue il device ed è cambiabile nel profilo. Niente spagnolo nel primo rilascio.
- **Follow con accettazione, come gli account privati di Instagram** (decisione del 24/10/2026): l'handle è cercabile da tutti (serve per trovarsi), ma dove vai, foto, chat e tag sono visibili solo a chi ha chiesto di seguirti **e** che tu hai accettato. Nessuna visibilità reciproca automatica: se voglio vedere anche io, mando la mia richiesta.
- **Mappa a due strati per il cold start** (decisione del 24/10/2026): la mappa non è mai vuota perché mostra sempre uno strato **"di solito"** (affluenza tipica del locale per giorno e ora, grigio e neutro) sotto lo strato **"stasera"** (le nostre dichiarazioni, colorato, solo con k ≥ 3). Lo strato tipico **non** viene dai "Popular times" di Google: non sono esposti dall'API Places e lo scraping viola i termini di Google Maps Platform. Si parte da una curatela manuale del catalogo di Milano (tabella `venue_typical_busyness`) e si sostituisce progressivamente con la media storica delle nostre dichiarazioni (job settimanale, sempre k ≥ 3). I due strati restano visivamente distinti: l'utente deve sempre capire cosa è "di solito" e cosa è "stasera".

## Costi (riepilogo)

- Fissi: 99 $/anno Apple, 25 $ Google Play, ~10 €/anno dominio.
- Milestone A: 0 €/mese (tutti i free tier).
- Dal Milestone B: **Supabase Pro 25 $/mese** (foto in Storage, nessuna pausa, backup) — di fatto obbligatorio con utenti reali.
- Dal Milestone C: commissioni store sugli abbonamenti creator (15 % sotto 1 M$/anno con lo Small Business Program Apple; 15 % Google sul primo 1 M$), RevenueCat gratis sotto 2.500 $/mese.
- API Claude e Places: pochi euro al mese ai volumi di un lancio cittadino; entrambe con quota/alert impostati nel prompt 01.
