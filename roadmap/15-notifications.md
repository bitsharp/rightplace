# 15 — Notifiche: promemoria locali e push (chat, feed, adesioni)

Leggi `CLAUDE.md`. Mock-up: "Promemoria: posta una foto o scrivi due righe" in `GiornoDopo.dc.html`, campanella in `TopBar.dc.html`. Backend: `push_tokens`, Edge Function `send-push`, trigger DB.

> **Ruoli e metodo**: architetto → piano/interfacce/test; `/model sonnet` → TDD; architetto → review.

## Obiettivo

Poche notifiche, tutte utili: promemoria del weekend (locale), "com'è andata ieri sera?" (locale), nuovi messaggi nella chat di serata, post dei seguiti, adesioni per i creator (push). Tutto disattivabile per categoria.

## Istruzioni

1. **Permesso**: non all'onboarding ma alla **prima dichiarazione**, con sheet pre-permission "Vuoi sapere quando i tuoi amici scrivono nella chat della serata?" → Sì / Non ora (non richiedere più di una volta a settimana).
2. **Locali** (`expo-notifications`):
   - **Promemoria serata**: giovedì/venerdì/sabato alle 19:00 (configurabile: giorni e ora), testi dal pool ("Dove va la tua serata?"…); cancellata per il giorno se l'utente ha già dichiarato; tap → mappa.
   - **Il giorno dopo**: se ieri ho dichiarato e non ho ancora postato, alle 11:00: "Com'è andata ieri sera? Posta una foto o scrivi due righe." → `post/new`. Schedulata al momento della dichiarazione, cancellata se posto.
   - Fuso: quello della **città**.
3. **Push** (Expo Push Service):
   - registra `ExpoPushToken` in `push_tokens` dopo il permesso; rimuovi al logout.
   - Edge Function `send-push` (service role): riceve `{user_ids, title, body, data}` → chiama Expo Push API in batch ≤ 100, gestisce `DeviceNotRegistered` cancellando il token. Chiamata da trigger DB via `pg_net` **con coalescing**: una tabella `notification_queue` e un job pg_cron ogni minuto che raggruppa (es. "3 nuovi messaggi da @volpe.viola e altri").
   - Eventi: **nuova richiesta di follow** ("@volpe.viola vuole seguirti" → `rightplace://friends/requests`, coalescing "3 nuove richieste"); **richiesta accettata** ("@orso.grigio ha accettato la tua richiesta" → `rightplace://u/<handle>`); nessuna push su rifiuto o rimozione; nuovo `chat_messages` nella mia room da uno che seguo (max 1 push ogni 10 min per room); nuovo `posts` visibile di un seguito (digest 1/giorno alle 12:00: "3 amici hanno postato le foto di ieri"); per creator: adesioni alla serata al raggiungimento di soglie (`3–10`, `10–20`, …) — mai per singola persona; serata annullata → dichiarati.
   - Testi delle push nella **lingua dell'utente** (`profiles.locale`), con template IT/EN lato server.
   - Payload **senza contenuti sensibili**: niente testo del messaggio, niente foto; solo "Nuovo messaggio nella chat di Arena Club".
   - Android: canali `promemoria`, `amici`, `chat`, `feed`, `creator`.
4. **Preferenze** nel profilo: toggle per categoria + giorni/ora del promemoria; salvate in `profiles.notification_prefs jsonb`; il server le rispetta prima di accodare.
5. **Campanella** TopBar: pallino se ci sono novità non viste (nuovi post/storie, richieste di follow in attesa); stato "visto" locale.
6. **Deep link** dalle notifiche: `rightplace://night/<id>/chat`, `rightplace://post/new`, `rightplace://feed`, `rightplace://creator`, `rightplace://friends/requests`, `rightplace://u/<handle>`.
7. **Test**: `nextReminderDates` (giorni, ora legale, già dichiarato), scheduling "giorno dopo" cancellato al post, coalescing della coda (N messaggi → 1 push), rispetto delle preferenze, payload senza contenuti, token rimosso su `DeviceNotRegistered`.

## Definition of Done

- [ ] Prima dichiarazione → pre-permission; accettando, token in `push_tokens` e notifiche locali schedulate (`getAllScheduledNotificationsAsync`)
- [ ] Messaggio in chat da un seguito → push entro 1 min; 5 messaggi in 2 min → 1 solo push
- [ ] Posto una foto → il promemoria "giorno dopo" viene cancellato
- [ ] Disattivando "chat" nelle preferenze non arrivano più push chat (gli altri sì)
- [ ] Tap su ogni notifica apre la schermata giusta da app chiusa, in background e in primo piano
- [ ] Test scritti prima; nessun `any`
- [ ] Tutte le stringhe nuove esistono in `it` e `en` (`npm run i18n:check` pulito) e le schermate sono state provate in entrambe le lingue
- [ ] Commit: `feat(15): local reminders and coalesced push notifications`
