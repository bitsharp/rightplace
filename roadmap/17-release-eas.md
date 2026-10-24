# 17 — Build con EAS, TestFlight, Google Play, OTA

Leggi `CLAUDE.md` (Budget EAS). Prerequisiti: prompt 16 completato; Apple Developer approvato; Play Console attivo; progetto Supabase **prod** (EU) con migration applicate (`supabase db push --linked`) e **tutte le configurazioni del prompt 01 ripetute su prod** (Email auth, Turnstile, SMTP, bucket privati, secrets Edge, pg_cron); prodotti IAP creati; RevenueCat con le chiavi prod.

> **Ruoli e metodo**: architetto → piano e runbook; `/model sonnet` → config e script in TDD dove ha senso; architetto → review. **Nessuna build cloud senza conferma esplicita di Luca.**

## 1. Ambienti

- `eas.json` con profili `development` (dev client), `preview` (TestFlight + APK interno), `production`.
- Variabili per ambiente con **EAS Environment Variables** (`eas env:create`): Supabase URL/anon dev vs prod, Maps key, Turnstile site key, Sentry, PostHog, RevenueCat keys, `EXPO_PUBLIC_ENV`. Badge "DEV" in TopBar quando non è prod.
- Edge Functions deployate su prod: `supabase functions deploy --project-ref <prod>` per `places-sync`, `places-detail`, `storage-gc`, `send-push`, `revenuecat-webhook`, `ask-ai`, `moderate-image`, `export-data`, `delete-account`. Secrets impostati con `supabase secrets set`.
- Webhook RevenueCat puntato alla URL prod.

## 2. Configurazione store

- `eas build:configure`; `eas credentials` gestisce certificati e keystore.
- `app.config.ts`: `version "0.1.0"`, `appVersionSource: "remote"`, `autoIncrement`.
- Icona e splash definitivi (dark, wordmark RightPlace), `adaptiveIcon` con background `#0B0B12`.
- **Universal/App Links**: `https://rightplace.app/u/<handle>` e `/e/<event>`; `associatedDomains`, `intentFilters autoVerify`; pubblica `apple-app-site-association` e `assetlinks.json` sul dominio (Cloudflare Pages) con landing minima + privacy + termini + pagina moderazione/contatti.
- iOS capabilities: Push Notifications, Associated Domains, In-App Purchase. Android: `POST_NOTIFICATIONS`, billing.

## 3. Build — restando nel piano EAS Free

| Cosa | Dove | Build cloud |
|---|---|---|
| Sviluppo | dev client già costruito nel prompt 13 (+ Expo Go dove possibile) | 0 |
| Android preview/production | `--local` | 0 |
| iOS preview (TestFlight) | cloud | 1 |
| iOS production (store) | cloud | 1 |
| Fix JS/asset/stringhe | `eas update` | 0 |

Prima di ogni build iOS cloud: `npx expo-doctor` → `npx expo prebuild --no-install -p ios` in copia temporanea → `eas build:list --platform ios` (quota usata).

```powershell
eas build --platform android --profile preview --local --output .\build\rightplace-preview.aab
eas build --platform ios --profile preview --no-wait      # SOLO con conferma di Luca
```

Nuova build iOS serve solo per: nuova dipendenza nativa, cambio permessi/entitlements, cambio scheme/domini, aggiornamento SDK, icona/splash. Altrimenti OTA. Quota esaurita → attendere il mese o Starter 19 $ per un solo mese.

## 4. Distribuzione tester

- **iOS**: `eas submit --platform ios` → TestFlight; gruppo interno fino a 100 senza review; external testing richiede una review leggera (1–2 gg).
- **Android**: `eas submit --platform android` → **Internal testing**; **Data safety form**: posizione approssimativa (opzionale, non condivisa), foto/video, messaggi, info personali (email, età, genere), contatti (hash, non conservati), ID utente, dati acquisto; tutto non venduto; cancellabile. **Nessun** "location precisa", nessun advertising ID.
- Metadati **in italiano e inglese** (store listing localizzati): nome, sottotitolo "Dove va la tua serata" / "Where your night goes", descrizione, screenshot 6.7"/6.1" e Android (via Maestro o manuali), categoria Social Networking/Lifestyle, paese di lancio **Italia** (altri paesi disattivati nella distribuzione), età **17+ (Apple) / 18+ (Google)**, link privacy e termini, **URL per segnalazioni/moderazione**.
- **Privacy nutrition labels** Apple coerenti con la Data safety.
- Note per la review Apple: account di test (email + password), spiegazione che il contenuto è UGC con moderazione (segnala/blocca/filtro/SLA 24 h), come provare l'abbonamento in sandbox.

## 5. OTA con EAS Update

- `eas update:configure`; canali `preview` e `production`; `checkAutomatically: "ON_LOAD"`, `fallbackToCacheTimeout: 0`.
- Runbook: fix JS → `eas update --channel preview --message "..."`; rollback → `eas update:republish`.

## 6. Monitoraggio e operatività

- Sentry alert su nuovi issue prod; release tagging.
- Supabase: Reports (DB size, egress, Storage), alert su quota; **Pro attivo** prima dei tester.
- PostHog: funnel signup → profilo → prima dichiarazione → prima chat → primo post; creator: serata → sponsorizzazione.
- Places e Anthropic: quote e alert di spesa in Google Cloud e Anthropic Console.
- Job settimanale `places-sync` attivo su prod; log controllato.
- `docs/release-runbook.md`: nuova build, OTA, rollback, rotazione chiavi, procedura incidenti (contenuto illecito segnalato, data breach: notifica entro 72 h).

## Definition of Done

- [ ] Build preview iOS su TestFlight (≥ 2 iPhone) e Android Internal testing (≥ 2 device) con prod Supabase
- [ ] Registrazione reale su prod: email di conferma arriva (SMTP Resend), Turnstile attivo
- [ ] Link `rightplace.app/u/<handle>` apre l'app; senza app mostra la landing
- [ ] `eas update` di prova arriva ai tester al riavvio; Sentry riceve un crash di test con release
- [ ] Webhook RevenueCat prod risponde (test da dashboard RevenueCat); acquisto sandbox su build TestFlight funziona
- [ ] Data safety e nutrition labels compilate e coerenti; metadati e screenshot caricati
- [ ] Build usate in questo prompt: ≤ 2 iOS cloud, 0 Android cloud
- [ ] `docs/release-runbook.md` scritto
- [ ] Commit: `chore(17): eas build, submit and update pipeline`
