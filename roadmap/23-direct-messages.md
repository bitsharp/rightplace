# 23 — Messaggi diretti (DM) tra amici

Leggi `CLAUDE.md` (principi 1, 5, 6, 7; TDD; i18n), le migration `20261108000100_night_chat.sql` (pattern RPC unica di scrittura, Realtime, purge), `20261114000100_notifications.sql` + `20261121000100_feedback_support.sql` (coda notifiche, categorie, canali, coalescenza), `20261115000100_chat_friends_of_friends.sql` (`private.is_linked`), `20261116000100_spots.sql` (ultimo check di `reports.target_kind`) e il codice di `src/features/chat/` (composer, lista messaggi, azioni messaggio, realtime) da riusare.

> **Ruoli e metodo**: architetto → questo piano; `/model sonnet` → TDD, pgTAP prima della migration; architetto → review. Nessuna nuova libreria, nessuna dipendenza nativa: arriva con `eas update` + `npx supabase db push` + deploy di `send-push`.

## Decisioni di Luca (24/11/2026)

| Tema | Decisione |
|---|---|
| Chi può scrivere | **Solo amici**: `private.is_linked(a, b)` (follow accettato in una delle due direzioni, nessun blocco). Nessuna "richiesta di messaggio" dagli sconosciuti. Un blocco o la caduta del legame chiude subito la conversazione (lettura e scrittura). |
| Durata | Ogni messaggio si cancella **7 giorni** dopo l'invio (job pg_cron, principio 5). La conversazione vuota sparisce dalla casella. |
| Contenuti | **Testo ed emoji** (1–1000 caratteri): barra emoji rapida, link cliccabili, copia, segnala, blocca. Niente foto. |

## 1. Database — `supabase/migrations/20261124000300_direct_messages.sql` (pgTAP prima: `supabase/tests/39_direct_messages.sql`)

- `public.dm_threads (id uuid pk, user_a uuid, user_b uuid, created_at, last_message_at)` con `check (user_a < user_b)`, `unique (user_a, user_b)`, FK a `profiles` on delete cascade.
- `public.dm_messages (id bigint identity pk, thread_id fk cascade, sender_id fk profiles, text text check 1–1000 dopo trim, created_at default now())`, indice `(thread_id, created_at desc)`.
- `public.dm_reads (thread_id, user_id, last_read_at)` pk composta (per il "non letto").
- RLS attiva su tutte e tre; **nessun** insert/update/delete diretto per `authenticated` (revoke). Select su `dm_messages` solo se il chiamante è un membro del thread **e** `private.is_linked(membri)` (serve a Realtime); select su `dm_threads` stessa regola.
- RPC `security definer`, `search_path` vuoto, `COMMENT ON FUNCTION` con la garanzia di privacy:
  - `open_dm_thread(p_handle text) returns uuid`: trova/crea il thread ordinato con l'utente dell'handle; errore `NOT_LINKED` se non linked (anche con blocco, senza distinguerlo), `SELF` su se stessi.
  - `send_dm(p_thread uuid, p_text text) returns table(id bigint, created_at timestamptz)`: membro + linked, testo valido, rate limit (es. 30 al minuto per mittente → `RATE_LIMITED`); aggiorna `last_message_at`; accoda la push (sotto).
  - `get_dm_threads(p_limit int default 50)`: le mie conversazioni ancora linked e con almeno un messaggio non scaduto: `thread_id, other_user_id, other_handle, last_text (troncato 80), last_message_at, last_sender_is_me, unread boolean`. Mai email/età esatta.
  - `get_dm_messages(p_thread uuid, p_before timestamptz default null, p_limit int default 50)`: messaggi del thread (membro + linked), `id, sender_is_me, sender_id, text, created_at`, più recenti prima.
  - `mark_dm_read(p_thread uuid)`: upsert in `dm_reads`.
  - `get_dm_unread_count() returns int` (per il badge del tab Chat).
- Push: nuova categoria `dm` nel check di `private.notification_queue.category` (drop/add constraint con nome, mantenendo `support`), chiave `dm` in `set_my_notification_prefs` (default attiva), `private.push_channel('dm') = 'messaggi'`, testi del dispatcher IT/EN coalescenti per (destinatario, thread): "@handle ti ha scritto" / "@handle sent you a message", "N nuovi messaggi da @handle" / "N new messages from @handle"; **mai il testo del messaggio nella push**; deep link `rightplace://dm/<thread_id>`; niente push al mittente né se il destinatario ha bloccato. Rispetta `create or replace` mantenendo identico il resto delle funzioni toccate.
- Purge: job `purge-expired-dms` ogni 10 minuti (o dentro `purge_expired_content` con create or replace identico nel resto): cancella `dm_messages` con `created_at < now() - interval '7 days'` e i thread senza messaggi.
- Moderazione: `reports.target_kind` esteso con `'dm'` (drop/add constraint con tutti i valori attuali); `report_content` (o la RPC esistente) accetta `dm` solo se il chiamante è membro del thread del messaggio. Il blocco esistente basta a chiudere il thread (via `is_linked`).
- `delete_my_account()` / processo di cancellazione: i thread spariscono via cascade; verificalo nel test.
- Realtime: `alter publication supabase_realtime add table public.dm_messages` (guardato come in night_chat).
- pgTAP: struttura e check; nessun privilegio di scrittura diretta; `open_dm_thread` linked ok / non linked `NOT_LINKED` / bloccato `NOT_LINKED` / pending non basta; `send_dm` testo vuoto e > 1000 rifiutati, rate limit, non membro rifiutato, dopo un blocco rifiutato e `get_dm_messages` vuoto; `get_dm_threads` non mostra thread non più linked; `unread` e `mark_dm_read`; push accodata al destinatario con categoria `dm` e senza testo nei params; nessuna push col prefs `dm` spento; purge a 7 giorni; report `dm` solo da membro; `11_privacy_contract` e test esistenti verdi.
- Rigenera `src/lib/database.types.ts`.

## 2. Client — `src/features/dm/`

- `api.ts` (zod su ogni risposta, errori tipizzati `type DmError = 'NOT_LINKED' | 'RATE_LIMITED' | 'INVALID_TEXT' | 'UNKNOWN'`), `keys.ts`, `hooks.ts` (TanStack Query, `meta: { persist: false }`: i DM non vanno mai su disco), `realtime.ts` (canale per thread su `dm_messages` filtrato per `thread_id`, invalida/aggiunge in cache; riusa lo schema di `src/features/chat/realtime.ts`).
- `domain/`: funzioni pure (ordinamento, raggruppamento per giorno, anteprima, scadenza "si cancella tra N giorni").
- Schermate:
  - **`app/dm/[threadId].tsx`** → `DmThreadScreen`: header con avatar (foto per principio 1 via `useAvatarUrls`) e @handle (tap → profilo), banner "I messaggi si cancellano 7 giorni dopo l'invio", lista (riusa `MessageList`/bolle dove possibile, altrimenti componente sottile dedicato), composer testo con `QuickEmojiBar` e `KeyboardAvoidingView` di `react-native-keyboard-controller`, azioni su pressione lunga: copia (`expo-clipboard`), segnala (solo messaggi altrui), blocca utente. Haptics all'invio. `mark_dm_read` all'apertura e a ogni nuovo messaggio ricevuto con la schermata a fuoco. Stato "non potete più scrivervi" se `NOT_LINKED` (composer disattivato).
  - **Casella DM nel tab Chat**: in `ChatListScreen` un segmento/sezione "Messaggi" accanto alle chat di serata (stesso `SegmentedControl`), righe con avatar, @handle, anteprima, ora relativa (`Intl`), pallino non letto; stato vuoto che spiega che si scrive dal profilo di un amico.
  - **Profilo pubblico** (`PublicProfileScreen`): bottone "Messaggio" visibile solo se linked (usa l'informazione già disponibile nella schermata sul follow accettato in una delle due direzioni; se non c'è, aggiungila senza nuove RPC se possibile, altrimenti il bottone chiama `open_dm_thread` e gestisce `NOT_LINKED`). Tap → `open_dm_thread(handle)` → `router.push('/dm/<id>')`.
- Badge non letti sul tab Chat (`get_dm_unread_count`, invalidato da realtime e da focus).
- Routing notifiche: `rightplace://dm/<id>` in `useNotificationRouting`; canale Android `messaggi` creato all'avvio come gli altri; toggle "Messaggi" in Profilo → Notifiche.
- `RootNavigator`: rotta `dm/[threadId]` nelle schermate pronte/protette come le altre rotte autenticate.
- i18n: namespace `dm` in `src/i18n/it/dm.json` e `src/i18n/en/dm.json` (+ chiavi notifiche/profilo nei namespace esistenti); `npm run i18n:check` pulito.

## 3. Documentazione
- `docs/direct-messages.md`: regole (chi, durata, contenuti), RPC, push senza testo, purge, moderazione, comandi per Luca.
- `docs/notifications.md`: categoria `dm` e canale `messaggi`.
- `CLAUDE.md`: riga nel vocabolario (`dm`) e nella tabella del principio 5 (DM 7 giorni).

## Test client (scritti prima)
- api: parsing zod, mappatura errori.
- hooks/realtime: nuovo messaggio dal canale entra in cache; persist false.
- `DmThreadScreen`: invio (testo trim, vuoto disabilitato), emoji inserita, copia, segnala solo altrui, `NOT_LINKED` → composer disattivato, mark read.
- Casella: righe, non letto, stato vuoto, tap → thread.
- `PublicProfileScreen`: bottone "Messaggio" solo se linked; tap apre il thread.
- Routing della push `dm`.

## Definition of Done
- [ ] pgTAP prima, poi migration; nessuna scrittura diretta sulle tabelle DM; solo linked, blocco chiude
- [ ] Messaggi cancellati dopo 7 giorni dal job; DM mai persistiti su disco nel client
- [ ] Push `dm` senza testo del messaggio, coalescente, disattivabile
- [ ] Segnala / blocca / copia funzionanti; report `dm` solo da membro
- [ ] IT + EN complete; lint/typecheck/test verdi; `11_privacy_contract` verde
- [ ] Commit: `feat(23): direct messages between friends`
- [ ] Azioni per Luca: `npx supabase db push`, `npx supabase functions deploy send-push --no-verify-jwt` (nuovo canale), `eas update`
