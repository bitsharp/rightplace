# Messaggi diretti (DM)

Messaggi privati uno a uno **solo tra amici**, nella sezione "Messaggi" del tab Chat e dal pulsante "Messaggio" sul profilo di un amico.

## Regole (decise da Luca, 24/11/2026)

| Tema                  | Regola                                                                                                                                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chi                   | Solo chi ha un follow **accettato** in una delle due direzioni e nessun blocco (`private.is_linked`). Nessuna richiesta di messaggio dagli sconosciuti. Un blocco o la caduta del follow chiude **subito** la conversazione, in lettura e in scrittura.       |
| Durata                | Ogni messaggio si cancella **7 giorni** dopo l'invio (job pg_cron `purge-expired-dms`, ogni 10 minuti; i messaggi più vecchi di 7 giorni non sono comunque leggibili anche prima del job). Un thread senza messaggi sparisce dalla casella e viene eliminato. |
| Contenuti             | Testo ed emoji, 1–1000 caratteri. Link cliccabili, copia, segnala, blocca. Niente foto.                                                                                                                                                                       |
| Rate limit            | 30 messaggi al minuto per mittente (`RATE_LIMITED`).                                                                                                                                                                                                          |
| Cancellazione account | I thread e i messaggi spariscono per cascade quando l'utente Auth viene eliminato; subito, alla richiesta di cancellazione, i follow cadono e le conversazioni si chiudono.                                                                                   |

## Database (migration `20261124000300_direct_messages.sql`, pgTAP `39_direct_messages.sql`)

- `dm_threads (id, user_a, user_b, created_at, last_message_at)` con `user_a < user_b`, `dm_messages (id uuid, thread_id, sender_id, text, created_at)`, `dm_reads (thread_id, user_id, last_read_at)`. RLS attiva; **nessuna scrittura diretta** per i client. Select su thread e messaggi solo se sei membro **e** ancora linked (`private.can_read_dm_thread`), anche per Realtime. `dm_reads` non è leggibile dai client.
- RPC `security definer`: `open_dm_thread(handle)` (`NOT_LINKED` per sconosciuto, pending, bloccato, handle inesistente: nessuna distinzione; `SELF`), `send_dm(thread, text)` (`NOT_LINKED`, `INVALID_TEXT`, `RATE_LIMITED`), `get_dm_threads(limit)`, `get_dm_messages(thread, before, limit)` (vuoto se non linked), `mark_dm_read(thread)`, `get_dm_unread_count()` (conversazioni con un messaggio non letto dell'altro).
- Segnalazione: `report('dm', <id messaggio>)`, accettata solo da un membro del thread del messaggio (`INVALID_ARGUMENT` altrimenti). Il blocco esistente chiude il thread.
- Decisione: l'id del messaggio è `uuid` (non `bigint`) perché `reports.target_id` è uuid.

## Push

Categoria `dm`, canale Android `messaggi`, coalescenza per thread, **mai il testo del messaggio** (vedi `docs/notifications.md`).

## Client

`src/features/dm/` (api con zod, hooks TanStack Query con `persist: false`: i DM non vanno mai su disco, realtime per thread). Schermata `app/dm/[threadId].tsx`; casella nel tab Chat (segmento "Messaggi"); badge sul tab Chat; pulsante "Messaggio" sul profilo pubblico se linked. Finché `db push` non è stato fatto, le schermate DM mostrano errore e il badge resta a zero; tutto il resto funziona.

## Azioni per Luca

1. `npx supabase db push` (migration `20261124000300_direct_messages.sql`).
2. `npx supabase functions deploy send-push --no-verify-jwt` (nuovo canale `messaggi`).
3. `eas update` (canale Android `messaggi` creato all'avvio: nessuna nuova build).
