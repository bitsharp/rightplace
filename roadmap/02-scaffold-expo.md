# 02 — Scaffold del progetto Expo

Leggi `CLAUDE.md`. Crea il progetto Expo nella cartella corrente (repo con `CLAUDE.md`, `roadmap/`, `design/`).

> **Ruoli e metodo** (vedi `CLAUDE.md`): architetto (Fable/Opus) → piano, interfacce, lista test, niente codice; `/model sonnet` → implementazione in TDD una voce alla volta; architetto → review del diff contro la Definition of Done. Proponi il cambio modello quando il tipo di lavoro cambia.

## Obiettivo

App Expo TypeScript che si avvia su Expo Go, con routing (auth + 5 tab), env validate, font, lint e test pronti. Nessuna funzionalità di prodotto.

## Istruzioni

1. **Inizializza** con `npx create-expo-app@latest . --template blank-typescript` + Expo Router (ultimo SDK stabile). Rimuovi il codice di esempio.
2. **`app.config.ts`**: `name: "RightPlace"`, `slug: "rightplace"`, `scheme: "rightplace"`, `ios.bundleIdentifier` / `android.package` = `it.bitsharp.rightplace`, `userInterfaceStyle: "dark"`, splash e icona placeholder `#0B0B12`. Android `config.googleMaps.apiKey` da env.
   Permessi dichiarati **solo** quelli che il prodotto usa, con testo in italiano che spiega il perché: `NSLocationWhenInUseUsageDescription` ("Per mostrarti sulla mappa, solo mentre usi l'app"), `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` (foto del giorno dopo), `NSContactsUsageDescription` (trova amici, facoltativo). **Nessun** permesso di posizione in background.
3. **Dipendenze**:
   runtime: `expo-router`, `react-native-maps`, `@supabase/supabase-js`, `react-native-url-polyfill`, `@react-native-async-storage/async-storage`, `expo-secure-store`, `zustand`, `@tanstack/react-query`, `@tanstack/query-async-storage-persister`, `expo-font`, `@expo-google-fonts/{unbounded,inter,space-mono}`, `expo-haptics`, `expo-notifications`, `expo-linking`, `expo-constants`, `expo-location`, `expo-localization`, `i18next`, `react-i18next`, `expo-image`, `expo-image-picker`, `expo-image-manipulator`, `expo-contacts`, `expo-crypto`, `expo-blur`, `zod`, `react-native-webview` (Turnstile).
   dev: `eslint`, `eslint-config-expo`, `prettier`, `jest-expo`, `@testing-library/react-native`, `typescript`.
   **Non** installare ora `react-native-purchases` (prompt 13): richiede dev client e consumerebbe quota EAS.
4. **Struttura cartelle** come da `CLAUDE.md`, con placeholder.
5. **Routing**:
   - `app/_layout.tsx`: font, splash, `QueryClientProvider` con persister, tema dark, guard di sessione (flag finto in zustand per ora).
   - `app/(auth)/`: `sign-in.tsx`, `sign-up.tsx`, `profile-setup.tsx` (placeholder).
   - `app/(tabs)/_layout.tsx` con **5 tab**: `map`, `friends`, `chat`, `feed`, `profile` — icone e colori come nel mock-up (attiva viola, inattiva `#A3A1B8`), altezza 72.
   - Route modali/stack: `venue/[id]`, `event/[id]`, `night/[id]/chat`, `post/new`, `creator/index`, `creator/new-event`, `creator/billing` (placeholder).
6. **Env** `src/lib/env.ts` validato con `zod`; `.env.example` completo; `.env*` in `.gitignore`.
7. **Lint/format/test**: script `lint`, `format`, `typecheck`, `test`, `test:watch`.
8. **Theme bootstrap** `src/theme/tokens.ts` con i colori del `CLAUDE.md` (il resto nel prompt 03).
9. **i18n**: `i18next` + `react-i18next` + `expo-localization`; `src/i18n/index.ts` (rilevamento lingua device → `it`/`en`, fallback `en`, persistenza scelta in AsyncStorage), namespace per feature (`common`, `auth`, `map`, …) in `src/i18n/it/*.json` e `src/i18n/en/*.json`. Script `npm run i18n:check` che fallisce se una chiave esiste in una lingua e non nell'altra (da eseguire nel pre-commit). Permessi iOS (`InfoPlist` descriptions) localizzati con `locales` in `app.config.ts` (`it`, `en`).
10. **README.md**: avvio, env, convenzioni.
11. **Nessuna build EAS.** Tutto su Expo Go (verifica con `npx expo-doctor` che le dipendenze lo permettano; `react-native-maps`, `expo-location`, `expo-contacts`, `expo-image-picker` funzionano in Expo Go).

## Definition of Done

- [ ] `npx expo start` → app in Expo Go su iOS e Android; tab bar a 5 voci navigabile
- [ ] `typecheck`, `lint`, `test` puliti; test presente almeno per `env.ts` (schema) e per il guard di navigazione
- [ ] Permessi dichiarati = solo location-when-in-use, camera, photo library, contacts, notifications
- [ ] `.env` ignorato; `.env.example` completo
- [ ] Cambiando la lingua del device tra italiano e inglese la UI placeholder cambia lingua; `npm run i18n:check` passa
- [ ] `eas build:list` vuoto
- [ ] Ogni funzione/componente ha test scritti prima; nessun `any`
- [ ] Commit: `feat(02): scaffold expo project`
