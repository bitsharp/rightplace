# RightPlace

App mobile (iOS + Android) per scoprire dove va la gente stasera. Contesto di prodotto, principi e regole di lavoro: [`CLAUDE.md`](CLAUDE.md). Piano di sviluppo: [`roadmap/`](roadmap/00-README.md). Mock-up (fonte di verità visiva): `design/project/*.dc.html`.

## Requisiti

- Node.js 22 LTS e npm
- App **Expo Go** (ultima versione, SDK 58) su iPhone e/o Android
- Nessun Xcode / Android Studio necessario per lo sviluppo quotidiano

## Avvio

```bash
npm install               # installa le dipendenze e attiva l'hook pre-commit (.githooks)
cp .env.example .env      # poi compila i valori (vedi sotto)
npx expo start            # scansiona il QR con Expo Go (Android) o con la Fotocamera (iOS)
```

Se telefono e PC non sono sulla stessa rete: `npx expo start --tunnel`.

L'accesso è ancora finto (prompt 05): dalla schermata **Accedi** usa "Entra in modalità demo" per arrivare alle tab; "Esci" nel Profilo torna all'accesso.

## Variabili d'ambiente

Elenco completo e commentato in [`.env.example`](.env.example). `.env` è ignorato da git.

| Variabile                       | Dove serve      | Note                                              |
| ------------------------------- | --------------- | ------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | client          | validata da `src/lib/env.ts` (zod, solo `https`)  |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | client          | chiave pubblica `anon`                            |
| `GOOGLE_MAPS_ANDROID_API_KEY`   | `app.config.ts` | solo dev client/build Android; Expo Go non la usa |

Mai nel repo, in `.env` o nel client: `service_role`, chiave Google Places, chiave Anthropic, segreti RevenueCat. Vivono in Supabase Edge Function secrets / EAS secrets. `EXPO_TOKEN` resta nelle variabili d'ambiente di sistema.

## Script

| Comando                                   | Cosa fa                                                      |
| ----------------------------------------- | ------------------------------------------------------------ |
| `npm start`                               | dev server Expo                                              |
| `npm test` / `npm run test:watch`         | Jest (`jest-expo` + Testing Library)                         |
| `npm run typecheck`                       | `tsc --noEmit` (TypeScript strict)                           |
| `npm run lint`                            | ESLint (config Expo + Prettier), zero warning                |
| `npm run format` / `npm run format:check` | Prettier                                                     |
| `npm run i18n:check`                      | fallisce se una chiave esiste in una lingua e non nell'altra |
| `npm run doctor`                          | `expo-doctor` (richiede rete verso le API Expo)              |

L'hook `pre-commit` esegue `i18n:check`, `typecheck` e `lint`.

## Struttura

```
app/                   route Expo Router: (auth), (tabs) a 5 voci, venue, event, night, post, creator
src/components/ui      componenti base (prompt 03)
src/components/app     componenti dell'app (TabIcon, AppProviders, …)
src/features/<f>/      domain/ (funzioni pure) · store/ · hook · componenti
src/lib/               env, query client, (supabase dal prompt 04/05)
src/i18n/              it/*.json · en/*.json (namespace per feature) · native/ (testi permessi iOS)
src/theme/             token di design
supabase/              migrations · functions · tests (dal prompt 04)
scripts/               i18n-check
```

## Convenzioni

- **TDD**: prima il test (nome = frase in italiano), poi il codice. Test accanto al file (`*.test.ts(x)`); test di navigazione in `src/__tests__`.
- **i18n**: nessuna stringa UI hardcoded. Ogni testo esiste in `src/i18n/it` **e** `src/i18n/en`. Nei test `t` è mockato e restituisce `namespace:chiave`.
- **Import** con alias `@/` → `src/`.
- **Stile**: `StyleSheet` + token di `src/theme`; niente Tailwind/NativeWind.
- **Permessi** dichiarati solo in `app.config.ts`, con test in `app.config.test.ts`: posizione solo in uso, fotocamera, foto, contatti, notifiche. Niente background location, microfono o Face ID.
- **Commit convenzionali**: `feat(NN): …`, `fix: …`, `chore: …`.
- **Build EAS**: mai senza conferma di Luca; Android solo `--local`. Regole in `CLAUDE.md`.
