# Notifiche (prompt 15)

Poche notifiche, tutte utili e tutte disattivabili per categoria dal profilo (`profiles.notification_prefs`).

## Categorie

| Categoria (pref)         | Cosa                                                                                                                          | Dove nasce                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `reminder`               | promemoria serata, ogni giorno scelto alle 18:00 (default) della città, saltato se hai già dichiarato                         | locale (`expo-notifications`)                      |
| `day_after`              | "Com'è andata ieri sera?" alle 11:00 del giorno dopo, finché non posti                                                        | locale                                             |
| `friends`                | richiesta di follow ricevuta, richiesta accettata (mai su rifiuto o rimozione)                                                | trigger su `follows`                               |
| `chat` ("Chat e serate") | nuovi messaggi nelle stanze, da un autore che posso vedere in quella room (stessa funzione SQL della chat) + serata annullata | trigger su `chat_messages` / `events.cancelled_at` |
| `feed`                   | digest alle 12:00 locali: "N amici hanno postato le foto di ieri"                                                             | job `queue-feed-digests` (ogni ora)                |
| `creator`                | adesioni a una tua serata, solo a fasce (3–10, 10–20, …), mai per singola persona                                             | trigger su `declarations`                          |

## Dal trigger al telefono

1. Un trigger chiama `private.enqueue_notification`: **se la categoria è spenta non scrive nulla** (una riga mai accodata non lascia tracce), mai per il proprio evento, mai tra coppie bloccate, mai verso account cancellati.
2. `dispatch-notifications` (pg_cron, ogni minuto) → `private.dispatch_notifications()`:
   - cancella le righe in coda la cui categoria è stata spenta nel frattempo (non le invia, non le marca inviate);
   - **raggruppa** per (utente, categoria, chiave): 5 messaggi nella stessa stanza → 1 push "5 nuovi messaggi da @…";
   - **rate limit**: una push ogni 10 minuti per stanza (e per le richieste di follow); quello che arriva nel frattempo resta in coda e confluisce nella push successiva;
   - costruisce titolo e testo in italiano o inglese secondo `profiles.locale` (`private.render_notification`);
   - chiama `private.invoke_send_push` → `pg_net` → Edge Function `send-push` con `x-push-key` (segreti Vault `send_push_url`, `send_push_key`; senza segreti: notice e nessuna chiamata);
   - segna come inviate e scrive `private.push_log`; pulisce righe inviate da oltre 2 giorni e log da oltre 7.
3. `send-push` legge i token con service role, spedisce a Expo in batch da 100 e cancella il token su `DeviceNotRegistered`.

## Privacy del payload

Mai il testo di un messaggio, mai una foto, mai un numero esatto: solo ids, handle, nome del locale o della serata e fascia. Il testo va nella lingua dell'utente. I token non sono mai restituiti da nessuna RPC; `register_push_token` riassegna un token al nuovo account se lo stesso telefono cambia utente; al logout il client chiama `unregister_push_token`.

## Indicatori in-app (indipendenti dal permesso push)

- Badge **Chat**: numero di **stanze** con un ultimo messaggio visibile non mio più recente dell'ultima lettura locale (`chatLastReadAt`, solo id e istanti).
- Pallino della **campanella** e schermata **Novità**: `get_my_activity` (like e commenti sui miei post, richieste di follow, mie richieste accettate; solo handle, mai il testo dei commenti), "visto" locale (`activitySeenAt`).

## Deep link

`rightplace://night/<id>/chat`, `post/new`, `feed`, `creator`, `friends/requests` (apre la tab Amici), `u/<handle>`, `chat`, `map`. Un URL sconosciuto apre la mappa. Da app chiusa, in background e in primo piano la notifica instrada alla stessa schermata (`useNotificationRouting`); con l'app aperta il banner non compare se sei già nella schermata di destinazione.

## Come verificare la Definition of Done

- **Promemoria locali**: nel dev client, dopo aver accettato il permesso, `Notifications.getAllScheduledNotificationsAsync()` deve elencare `reminder:<data>` (7 giorni) e, dopo una dichiarazione, `dayafter:<data>`. Pubblicando un post `dayafter:<data>` sparisce.
- **Push chat e coalescing** (SQL editor, con segreti Vault configurati): inserisci 5 righe in `chat_messages` di una stanza dove sei membro, con un autore che puoi vedere in quella room (un seguito, o un amico di un tuo amico dichiarato lì), poi aspetta un minuto e controlla `select * from net._http_response order by created desc limit 5;` (una sola chiamata, "5 nuovi messaggi da @…"). Un secondo messaggio entro 10 minuti non parte subito.
- **Preferenze**: spegni "Chat e serate" dal profilo e invia un messaggio: `select count(*) from private.notification_queue` non cresce.
- **Test automatici**: `npm run db:test:local` (pgTAP `23_notifications.sql`), `npm run functions:test` (`send-push`), `npx jest src/features/notifications src/__tests__/notifications.test.tsx`.

## Limiti noti

- Le push remote **non funzionano in Expo Go su Android**: serve il dev client (o una build). Su Expo Go la registrazione del token fallisce senza crash e senza log del token.
- Se la rete manca al logout, il token resta registrato all'account finché un altro account sullo stesso telefono lo registra (viene riassegnato) o `send-push` lo cancella per `DeviceNotRegistered`.
- Il coalescing è per "giro" del dispatcher (1 minuto): una raffica a cavallo di due giri produce la prima push subito e il resto dopo 10 minuti.

## Messaggi diretti (prompt 23)

- Categoria `dm` (preferenza `dm`, attiva di default, toggle "Messaggi" in Profilo → Notifiche) e canale Android `messaggi`.
- Una riga in coda per messaggio, `group_key = dm:<thread_id>`: più messaggi dello stesso thread diventano **una** push ("@handle ti ha scritto" / "N nuovi messaggi da @handle"; in inglese "@handle sent you a message" / "N new messages from @handle").
- **Mai il testo del messaggio** nella push né nella coda: solo `thread_id` e handle del mittente. Deep link `rightplace://dm/<thread_id>`.
- Nessuna push al mittente, a chi ha bloccato o è bloccato, a chi ha spento la categoria. Dettagli in `docs/direct-messages.md`.
