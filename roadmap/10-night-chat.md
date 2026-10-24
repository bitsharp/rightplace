# 10 — Chat di serata: realtime, foto, tag, cancellazione dopo 2 giorni

Leggi `CLAUDE.md` (principi 5, 6, 7). Mock-up: `Chat.dc.html`. Backend: `chat_rooms`, `chat_messages`, Storage `chat-photos`, Realtime.

> **Ruoli e metodo**: architetto → piano/interfacce/test; `/model sonnet` → TDD; architetto → review.

## Obiettivo

Dopo aver dichiarato una serata, l'utente entra nella chat di quella serata: vede e scrive **solo con gli amici che segue e che vengono**, può mandare foto (visibili solo ai follower), taggare chi segue; la chat si cancella 2 giorni dopo.

## Istruzioni

1. **Tab Chat** `app/(tabs)/chat.tsx`: lista delle room attive dell'utente (di norma una: la serata dichiarata; più di una se ha anche eventi) con nome locale, "N amici dentro", ultimo messaggio; empty state "Dichiara una serata per entrare nella sua chat".
2. **`night/[id]/chat.tsx`** fedele a `Chat.dc.html`:
   - header "Serata da {locale}", sottotitolo "Solo amici che segui e che vengono", banner informativo "La chat si cancella da sola 2 giorni dopo la serata. Le foto arrivano nel feed il giorno dopo."
   - striscia **FOTO DELLA SERATA · N · SOLO FOLLOWER** con miniature;
   - messaggi: `MessageBubble` testo/foto, miei a destra (viola), altrui a sinistra; evento di sistema `CHAT CREATA`;
   - composer: testo, bottone foto (fotocamera o galleria), **autocomplete `@`** limitato a chi seguo (`PUOI TAGGARE SOLO CHI SEGUI`); se scrivo `@qualcuno` che non seguo → chip "Segui" inline.
   - **Filtro lato client sui soli seguiti**: la room contiene tutti i dichiarati (policy server), ma la UI mostra solo i messaggi di chi seguo + miei; lo stato "N amici dentro" conta i seguiti. Documenta il perché nel codice (principio 6).
3. **Realtime**: canale Supabase Realtime `postgres_changes` su `chat_messages` filtrato per `room_id`; riconnessione; cache TanStack aggiornata in append; `AppState` → resubscribe.
4. **Foto**: `expo-image-picker` → ridimensiona a 1280 px e comprimi (`expo-image-manipulator`), strip EXIF (posizione!) → upload in `chat-photos/<user_id>/<uuid>.jpg` → messaggio `kind='photo'`; lettura via **signed URL** (TTL 1 h) generata da RPC `get_room_messages` (mai URL pubblici). Placeholder sfumato durante il caricamento (come nel mock-up).
5. **Moderazione minima qui** (completata nel prompt 16): lungo-tap su messaggio → Segnala; su utente → Blocca; i bloccati non si vedono.
6. **TTL**: la UI mostra "si cancella tra N ore" quando mancano < 12 h; il job pg_cron del prompt 04 cancella messaggi e file (Edge Function `storage-gc` che elimina gli oggetti dei messaggi cancellati).
7. **Test**: filtro "solo seguiti" (lista mista → solo seguiti + miei); autocomplete `@` propone solo seguiti; pipeline foto rimuove EXIF e rispetta 1280 px; riduzione realtime (append, dedupe per id).

## Definition of Done

- [ ] Due utenti che si seguono e hanno dichiarato lo stesso locale chattano in tempo reale; un terzo dichiarato ma non seguito non compare
- [ ] Una foto inviata appare come miniatura e nel messaggio; il file su Storage non è leggibile senza signed URL
- [ ] EXIF rimosso (verifica con `exiftool` sul file scaricato)
- [ ] Forzando `expires_at` nel passato, il job cancella messaggi e file entro 10 minuti
- [ ] Test scritti prima; nessun `any`
- [ ] Tutte le stringhe nuove esistono in `it` e `en` (`npm run i18n:check` pulito) e le schermate sono state provate in entrambe le lingue
- [ ] Commit: `feat(10): ephemeral night chat with photos`
