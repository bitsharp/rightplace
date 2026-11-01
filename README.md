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

Il primo avvio porta alla registrazione (email, password, verifica anti-bot, consenso privacy) → conferma email → profilo privato → handle → mappa. Per provarlo sul progetto Supabase dev servono le impostazioni di **Supabase Auth** qui sotto.

**UI kit** (solo in sviluppo): link "Apri la UI kit" in Accedi e in Profilo, oppure `rightplace:///ui-kit`. Mostra tutti i componenti del design system nei vari stati, da confrontare con `design/project/*.dc.html`.

## Variabili d'ambiente

Elenco completo e commentato in [`.env.example`](.env.example). `.env` è ignorato da git.

| Variabile                       | Dove serve      | Note                                              |
| ------------------------------- | --------------- | ------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | client          | validata da `src/lib/env.ts` (zod, solo `https`)  |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | client          | chiave pubblica `anon`                            |
| `GOOGLE_MAPS_ANDROID_API_KEY`   | `app.config.ts` | solo dev client/build Android; Expo Go non la usa |

Mai nel repo, in `.env` o nel client: `service_role`, chiave Google Places, chiave Anthropic, segreti RevenueCat. Vivono in Supabase Edge Function secrets / EAS secrets. `EXPO_TOKEN` resta nelle variabili d'ambiente di sistema.

## Supabase Auth (dashboard del progetto dev)

1. **Authentication → Sign In / Providers → Email**: _Confirm email_ attivo, lunghezza minima password 8.
2. **Authentication → URL Configuration**: Site URL `rightplace://`; Redirect URLs `rightplace://**` e `exp://**` (Expo Go).
3. **Authentication → Emails → Templates**: in _Confirm signup_ e _Reset password_ incolla `supabase/templates/confirmation.html` e `recovery.html`, con gli oggetti indicati in `supabase/config.toml`.
4. **Captcha** (quando Cloudflare è pronto): in _Attack Protection_ attiva Turnstile con la secret key e metti la site key in `EXPO_PUBLIC_TURNSTILE_SITE_KEY`. Il widget deve consentire l'hostname `rightplace.app`. Finché la site key è vuota, il riquadro anti-bot non compare e il captcha di Supabase va lasciato spento.
5. L'SMTP di default di Supabase invia poche email all'ora: per i test reali serve Resend (SMTP custom).

## Script

| Comando                                   | Cosa fa                                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm start`                               | dev server Expo                                                                    |
| `npm test` / `npm run test:watch`         | Jest (`jest-expo` + Testing Library)                                               |
| `npm run typecheck`                       | `tsc --noEmit` (TypeScript strict)                                                 |
| `npm run lint`                            | ESLint (config Expo + Prettier), zero warning                                      |
| `npm run format` / `npm run format:check` | Prettier                                                                           |
| `npm run i18n:check`                      | fallisce se una chiave esiste in una lingua e non nell'altra                       |
| `npm run doctor`                          | `expo-doctor` (richiede rete verso le API Expo)                                    |
| `npm run db:reset` / `npm run db:test`    | Supabase locale (Docker): migration + seed, test pgTAP — vedi `supabase/README.md` |
| `npm run db:test:local`                   | pgTAP su Postgres semplice, senza Docker                                           |
| `npm run db:types`                        | rigenera `src/lib/database.types.ts`                                               |

L'hook `pre-commit` esegue `i18n:check`, `typecheck` e `lint`.

## Struttura

```
app/                   route Expo Router: (auth), (tabs) a 5 voci, venue, event, night, post, creator
src/components/ui      componenti base: Button, Chip, SegmentedControl, Sheet, Toggle, campi, … (prompt 03)
src/components/app     componenti dell'app: TabBar, TopBar, HotSpot, PostCard, … (solo visuali, dati via props)
src/features/<f>/      domain/ (funzioni pure) · store/ · hook · componenti
src/lib/               env, query client, database.types.ts (generato), supabase client dal prompt 05
src/i18n/              it/*.json · en/*.json (namespace per feature) · native/ (testi permessi iOS)
src/theme/             tokens.ts (unico posto con colori hex, oltre a mapStyle.ts), typography.ts, useTheme()
supabase/              migrations · seed · tests pgTAP · README con le garanzie di privacy
scripts/db/            runner pgTAP senza Docker + shim degli oggetti Supabase
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
