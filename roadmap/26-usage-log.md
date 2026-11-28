# 26 — Registro di utilizzo (solo amministratore)

Leggi `CLAUDE.md` (principi 1, 5, 9; TDD; i18n), `docs/feedback.md` (ruolo `is_support`, schermata protetta, pattern RPC riservate), le migration `20261121000100_feedback_support.sql` (ruolo, guardia, job di purge) e `20261102000200_process_account_deletions.sql` (cancellazione account), `RootNavigator` (rotte protette), `src/features/feedback/support/` (schermata riservata da copiare), le impostazioni (`settingsRows.ts`, `SettingsList.tsx`).

> **Ruoli e metodo**: architetto → questo piano; `/model sonnet` → TDD (pgTAP prima); architetto → review. Nessuna nuova libreria, nessun SDK di analytics (principio 9). Backend con `npx supabase db push`, client con `eas update`.

## Decisioni di Luca (28/11/2026)

| Tema | Decisione |
|---|---|
| Cosa | **Accessi e sessioni**: ogni login e ogni uso dell'app (apertura in primo piano → chiusura, con durata), piattaforma e versione. **Niente** schermate, contenuti, posizione, IP, dispositivo oltre a `ios`/`android`. |
| Durata | **90 giorni**, poi cancellati da un job; subito con la cancellazione dell'account. |
| Chi vede | **Solo l'amministratore** (nuovo ruolo `is_admin`, distinto da `is_support` che oggi hanno tutti i tester). Schermata "Utilizzo" in app + query SQL dalla dashboard. |

Base giuridica e trasparenza: legittimo interesse (sicurezza, funzionamento e miglioramento del servizio), dichiarato nell'informativa privacy (it/en) con finalità, dati, durata e destinatario (solo l'amministratore).

## 1. Database — `supabase/migrations/20261128000100_usage_log.sql` (pgTAP prima: `supabase/tests/43_usage_log.sql`)

- `profiles.is_admin boolean not null default false`: non nel grant di update dei client, non esposto in `public_profiles` né in alcuna RPC per altri utenti (stesso trattamento di `is_support`). Aggiungi alle verifiche di `11_privacy_contract` se elenca le colonne protette.
- `public.usage_events (id bigint identity pk, user_id uuid fk profiles on delete cascade, kind text check in ('login','session'), started_at timestamptz not null default now(), last_seen_at timestamptz not null default now(), ended_at timestamptz, platform text check in ('ios','android','web'), app_version text check (char_length ≤ 32))`, indici `(user_id, started_at desc)` e `(started_at)`. RLS attiva, **nessun** privilegio a `anon`/`authenticated` (revoke all).
- RPC del client (`security definer`, `private.require_user()`):
  - `log_login(p_platform text, p_app_version text) returns void`: riga `kind='login'` (started = last_seen = ended = now). Massimo 20 al giorno per utente (oltre: ignora in silenzio, nessun errore).
  - `start_usage_session(p_platform text, p_app_version text) returns bigint`: chiude (ended_at = last_seen_at) eventuali sessioni aperte dello stesso utente, crea la nuova `kind='session'`. Massimo 200 al giorno (oltre: restituisce null).
  - `touch_usage_session(p_id bigint) returns void`: solo sessione propria e aperta, `last_seen_at = now()`, al massimo una volta ogni 30 s (più frequente: no-op).
  - `end_usage_session(p_id bigint) returns void`: solo propria, `ended_at = now()`.
  - Sessioni rimaste aperte (app uccisa): il job le chiude con `ended_at = last_seen_at` se `last_seen_at < now() - 10 min`.
- RPC dell'amministratore (errore `NOT_ADMIN` se `is_admin` è falso):
  - `get_usage_overview(p_days int default 30, p_search text default null)`: per utente (non cancellato) con eventi nel periodo: `user_id, handle, last_seen_at, logins int, sessions int, total_minutes int` (somma di `last_seen_at - started_at` delle sessioni), `last_platform, last_app_version`; filtro opzionale su handle; ordinato per `last_seen_at desc`, max 500. **Mai email**, età esatta, posizione.
  - `get_user_usage(p_user uuid, p_before timestamptz default null, p_limit int default 50)`: eventi di un utente (kind, started_at, ended_at/last_seen_at, minuti, platform, app_version), più recenti prima, max 100.
- Job pg_cron `purge-usage-events` giornaliero: cancella eventi con `started_at < now() - interval '90 days'` e chiude le sessioni orfane (sopra).
- `COMMENT ON FUNCTION` con la garanzia di privacy su ogni funzione.
- pgTAP: nessun accesso diretto alla tabella per `authenticated`/`anon`; `is_admin` non scrivibile dal client e non leggibile per altri; log_login e sessioni scrivono solo per sé (non si tocca la sessione di un altro); limiti giornalieri e throttling di touch; chiusura delle sessioni aperte all'avvio della nuova; job: purge a 90 giorni e chiusura orfane; RPC admin: `NOT_ADMIN` per utenti normali e per `is_support` senza `is_admin`, dati corretti per l'admin (minuti, conteggi, filtro); cancellazione account → eventi spariti; `11_privacy_contract` e test esistenti verdi.
- Rigenera `src/lib/database.types.ts`.

## 2. Client — `src/features/usage/`

- `api.ts` (zod), `domain/` (calcolo durata/formattazione minuti con `Intl`), `useUsageTracking.ts` montato una volta nel `RootNavigator` solo con sessione attiva: all'arrivo in primo piano `start_usage_session`, ogni 60 s in primo piano `touch_usage_session`, al passaggio in background/inactive o al logout `end_usage_session`. Nessun timer in background. Errori: registrati con il logger esistente (mai `catch` vuoti), mai mostrati all'utente, mai bloccanti.
- `log_login` chiamato dopo ogni login riuscito (email+password; anche dopo la conferma email se crea sessione), una sola volta per login.
- Piattaforma da `Platform.OS`, versione dall'app config (stessa fonte del feedback).
- **Schermata admin**: rotta `app/admin/usage.tsx` (protetta in `RootNavigator`: chi non è admin viene reindirizzato, come il supporto) con: periodo (7 / 30 / 90 giorni, `SegmentedControl`), ricerca per handle, elenco utenti (handle, ultimo accesso relativo con `Intl`, accessi, sessioni, tempo d'uso totale, piattaforma/versione), pull-to-refresh manuale; tap → `app/admin/usage/[userId].tsx` con l'elenco degli eventi (login/sessione, data e ora, durata) e paginazione. Avatar con iniziale (nessuna foto: l'admin non è necessariamente "linked").
- Riga "Utilizzo app" / "App usage" nelle impostazioni (sezione Aiuto e supporto o nuova sezione "Amministrazione"), visibile **solo** con `is_admin` (letto dal proprio profilo come `is_support`).
- TanStack Query con `meta: { persist: false }` per tutti i dati admin.
- i18n IT+EN (namespace `admin`).

## 3. Privacy e documentazione
- Informativa privacy / pagine legali (it/en, `legal.json` o equivalente): paragrafo "Dati di utilizzo": accessi e sessioni (data, ora, durata, piattaforma, versione), finalità (sicurezza, funzionamento e miglioramento del servizio), base giuridica (legittimo interesse), conservazione 90 giorni, visibili solo all'amministratore, cancellati con l'account, nessun SDK di terze parti.
- `docs/usage-log.md`: cosa si registra e cosa no, RPC, job, come nominare l'amministratore (SQL sotto), query SQL pronte per la dashboard (panoramica e dettaglio per handle).
- `docs/privacy-policy.md` / registro dei trattamenti se esistono: aggiungi il trattamento.

## Test client (scritti prima)
- `useUsageTracking`: start in primo piano, touch ogni 60 s (timer finti), end in background e al logout, nessuna chiamata senza sessione, errori non propagati.
- login → `log_login` una volta.
- Schermata admin: elenco, filtro periodo, ricerca, tap → dettaglio, paginazione; non admin → reindirizzato; riga impostazioni visibile solo all'admin.

## Definition of Done
- [ ] pgTAP prima; tabella inaccessibile ai client; RPC admin solo `is_admin`
- [ ] Solo accessi e sessioni (nessuna schermata, contenuto, posizione, IP); 90 giorni; cancellazione con l'account
- [ ] Tracking non bloccante, niente background, niente SDK
- [ ] Informativa privacy aggiornata IT + EN; `docs/usage-log.md`
- [ ] lint/typecheck/test verdi; `11_privacy_contract` verde
- [ ] Commit: `feat(26): usage log visible to the admin only` (backend e client possono essere due commit)
- [ ] Azioni per Luca: `npx supabase db push`; `update public.profiles set is_admin = true where handle = '<il tuo handle>';`; `eas update`
