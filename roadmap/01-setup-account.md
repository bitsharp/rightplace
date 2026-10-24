# 01 — Setup account e strumenti (checklist MANUALE)

> Lo fa Luca, non Claude Code. Spunta ogni riga. Le voci marcate **[Milestone B/C]** possono aspettare.

## Strumenti sul PC (Windows)

- [ ] Node.js LTS (≥ 20), Git, VS Code + estensione Claude Code
- [ ] `npm i -g eas-cli supabase`
- [ ] Android Studio (SDK + emulatore) e JDK 17 — necessari per le build Android **locali**
- [ ] Docker Desktop — per `supabase start` in locale (test pgTAP veloci); altrimenti si usa il progetto cloud dev
- [ ] App **Expo Go** su iPhone e Android
- [ ] Maestro CLI (test e2e) — può aspettare il prompt 16

## Account

| Servizio | Azione | Costo |
|---|---|---|
| **Expo** | Account, organizzazione `bitsharp` | 0 |
| **Supabase** | Progetti `rightplace-dev` e `rightplace-prod`, regione **EU (Frankfurt)** | 0 (Free) → Pro 25 $/mese dal Milestone B |
| **Cloudflare** | Account; **Turnstile** widget "RightPlace" (site key + secret) | 0 |
| **Resend** | Account, dominio verificato (es. `mail.rightplace.app`), SMTP credentials | 0 |
| **Google Cloud** | Progetto `rightplace`; abilita *Maps SDK for Android* e *Places API (New)*; **due chiavi**: una per Android limitata al package, una server-side limitata a Places (va solo nelle Edge Function) | 0 (free tier per SKU) |
| **Apple Developer Program** | Iscrizione (organizzazione Bitsharp con D-U-N-S, o individuale) | 99 $/anno |
| **Google Play Console** | Account **organizzazione** (evita i 12 tester × 14 giorni obbligatori per i nuovi account personali) | 25 $ |
| **Sentry**, **PostHog EU** | Progetti | 0 |
| **GitHub** | Repo privato `bitsharp/rightplace` | 0 |
| Dominio | `rightplace.app` (o sottodominio bitsharp.it): landing, privacy, universal link | ~10 €/anno |
| **RevenueCat** [C] | Progetto, app iOS + Android, prodotti abbonamento | 0 |
| **App Store Connect / Play Console** [C] | Prodotti in-app: `creator_monthly`, `creator_yearly` | — |
| **Anthropic Console** [C] | API key con limite di spesa mensile (es. 20 $) | pay-per-use |

## Configurazioni Supabase (progetto dev; ripetere su prod nel prompt 17)

- [ ] Auth → Providers → **Email ON**, "Confirm email" ON; tutti gli OAuth **OFF**; Anonymous OFF
- [ ] Auth → **Captcha protection** → Turnstile, incolla il secret
- [ ] Auth → SMTP settings → Resend (altrimenti il rate limit di default blocca le registrazioni)
- [ ] Auth → Rate limits: sign-up e password reset prudenti (es. 10/ora per IP)
- [ ] Auth → Password: minimo 8 caratteri, leaked-password protection ON
- [ ] Database → Extensions: `pg_cron`, `pgcrypto`, `postgis` (per le query geografiche), `pg_net` (per chiamare Edge Function dai job)
- [ ] Storage → bucket `posts` e `chat-photos` **privati** (accesso solo via signed URL)
- [ ] Edge Functions → secrets: `GOOGLE_PLACES_KEY`, `ANTHROPIC_API_KEY` [C], `REVENUECAT_WEBHOOK_SECRET` [C], `EXPO_ACCESS_TOKEN` (push)

## Chiavi (password manager, MAI nel repo)

```
# client (EXPO_PUBLIC_*)
EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY   (dev e prod)
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY
EXPO_PUBLIC_TURNSTILE_SITE_KEY
EXPO_PUBLIC_SENTRY_DSN
EXPO_PUBLIC_POSTHOG_KEY / EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY   [C]
EXPO_PUBLIC_INVITE_BASE_URL=https://rightplace.app

# solo server (Edge Function secrets / EAS secrets)
SUPABASE_SERVICE_ROLE_KEY, GOOGLE_PLACES_KEY, TURNSTILE_SECRET, RESEND_API_KEY,
ANTHROPIC_API_KEY [C], REVENUECAT_WEBHOOK_SECRET [C], EXPO_ACCESS_TOKEN
```

## Repo

```powershell
mkdir C:\projects\rightplace\app; cd C:\projects\rightplace\app; git init
# copia CLAUDE.md nella root, poi le cartelle roadmap\ e design\
```

## Definition of Done

- [ ] CLI installate e login fatti (`eas login`, `supabase login`)
- [ ] Supabase dev in EU con Email auth + Turnstile + SMTP Resend configurati e **un'email di conferma di test ricevuta**
- [ ] Chiavi Google create con le restrizioni giuste (Android key → package; Places key → solo Places API)
- [ ] Iscrizione Apple inviata; Play Console creato
- [ ] Repo con `CLAUDE.md`, `roadmap/`, `design/project/*.dc.html`
