# 05 — Accesso con email, Turnstile, profilo privato e handle

Leggi `CLAUDE.md`. Mock-up: `Main.dc.html` (Accesso), `Profilo.dc.html` (profilo iniziale), `ProfiloApp.dc.html` (profilo dentro l'app). Backend: Supabase Auth email, RPC `complete_profile`, view `public_profiles`.

> **Ruoli e metodo**: architetto → piano/interfacce/test; `/model sonnet` → TDD; architetto → review.

## Obiettivo

Registrazione con email + password + verifica anti-bot + consenso privacy → conferma email → profilo privato (età, genere, posizione, contatti, creator) → handle generato → mappa. Accesso per chi ha già l'account. Modifica profilo dalla tab Profilo.

## Istruzioni

1. **Client Supabase** `src/lib/supabase.ts`: `createClient` con anon key, sessione su `expo-secure-store`, `autoRefreshToken`, `detectSessionInUrl: false`.
2. **Turnstile**: componente `TurnstileBox` con `react-native-webview` che carica il widget (site key da env) e restituisce il token; passato a `signUp`/`signInWithPassword` in `options.captchaToken`. Testo nel mock-up: "Non sono un robot · VERIFICA".
3. **Schermate `(auth)`** fedeli a `Main.dc.html`:
   - `sign-up.tsx`: titolo "Dove va la tua serata?", copy privacy ("Il profilo resta privato…"), email, password (≥ 8, con indicatore), Turnstile, checkbox consenso privacy **obbligatoria** con link alla policy, CTA "Crea account", link "Hai già un account? Accedi".
   - `sign-in.tsx`: email, password, Turnstile, "Password dimenticata" (`resetPasswordForEmail` con deep link `rightplace://reset`).
   - `verify-email.tsx`: "Controlla la tua email", pulsante reinvia (rate-limited), gestione del deep link di conferma (`rightplace://auth/callback`).
   - `reset-password.tsx`.
   - Errori umani: credenziali errate, email già registrata, captcha fallito, rete.
4. **Profilo privato** `profile-setup.tsx` fedele a `Profilo.dc.html` (label `02 / 03 · PROFILO PRIVATO`):
   - "Dicci chi sei, senza dirlo a nessuno. Agli altri compaiono solo la fascia d'età e il genere."
   - **Età**: date picker → `birth_date`; blocco sotto i 18 con messaggio chiaro e logout.
   - **Genere**: chip Donna / Uomo / Altro.
   - **Posizione** (toggle, default off): "Ti mostra sulla mappa in base a dove sei". Se attivato: richiesta permesso *when-in-use* qui; se negato, toggle torna off.
   - **Contatti · facoltativo** (toggle, default off): "Per trovare amici da seguire" — qui si salva solo l'opt-in; il matching avviene nel prompt 09.
   - Checkbox "Sono un creator" → `is_creator`.
   - **Lingua**: segmented Italiano / English, preselezionata dalla lingua del device → `profiles.locale` (usata da notifiche push e AI).
   - CTA "Continua" → `complete_profile` → schermata `handle.tsx`: reveal animato dell'handle (`@lince.rosso`) con haptic, "Questo è il tuo nome qui dentro", pulsante "Cambialo" (una sola volta, `handle_changed_at`), poi "Entra".
5. **Tab Profilo** `app/(tabs)/profile.tsx` fedele a `ProfiloApp.dc.html`: stesso form con "Salva", link "Il tuo profilo creator" (se `is_creator`) / "Diventa creator", sezione Account: email (solo visualizzazione), **lingua** (Italiano / English, cambio immediato della UI + `set_locale`), cambia password, logout, **Elimina account** (doppia conferma → `delete_my_account`), link Privacy e Termini.
6. **Sessione** `useSession()`: `loading | signedOut | unverified | needsProfile | ready`; guard in `app/_layout.tsx` sostituisce il flag finto.
7. **Posizione grossolana**: `src/features/profile/location.ts` — se opt-in, in foreground ogni 15 min: `getCurrentPositionAsync` (accuracy Balanced) → `coarsen` client-side **e** server-side → `update_coarse_location`. Mai in background.
8. **Analytics/Sentry**: `signup_started/completed`, `profile_completed {age_band, gender?}` — **no**: genere e fascia **non** vanno in analytics; solo `profile_completed`. Sentry `sendDefaultPii: false`.
9. **Test**: validatore password, `coarsen` client (stessi casi del test SQL), `useSession` con client mockato, form profilo (18+ gate), `TurnstileBox` (token propagato).

## Definition of Done

- [ ] Registrazione → email di conferma ricevuta → tap sul link apre l'app → profilo → handle → mappa
- [ ] Registrazione con 17 anni bloccata; senza consenso privacy il CTA è disabilitato
- [ ] Accesso, logout, reset password funzionano; Turnstile obbligatorio (senza token Supabase rifiuta)
- [ ] Toggle Posizione off di default; attivandolo compare il permesso iOS/Android; negandolo torna off
- [ ] In `profiles` di un altro utente (query come service role) non c'è nulla di visibile via `public_profiles` oltre handle, fascia, genere, is_creator
- [ ] Elimina account funziona end-to-end
- [ ] Tutto il flusso è completo in italiano e in inglese; le email di Supabase Auth (conferma, reset) usano template bilingui o la lingua del profilo
- [ ] Test scritti prima; nessun `any`; funzioni < 40 righe
- [ ] Commit: `feat(05): email auth, turnstile, private profile, handle`
