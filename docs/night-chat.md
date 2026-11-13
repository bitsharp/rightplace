# Chat di serata

Come funziona, perché è fatta così e come verificarla. Regole di prodotto: `CLAUDE.md`, principi 5, 6 e 7.

## Chi vede cosa (principio 6)

La stanza (`chat_rooms`) esiste dalla prima dichiarazione su una serata o un evento e contiene **tutti** i dichiarati. Ma ognuno legge solo i messaggi degli autori che **può vedere in quella room**. Un autore X è visibile a me se:

1. X sono io; oppure
2. `linked(me, X)`: esiste un follow **accettato** in una delle due direzioni (`private.is_linked`); oppure
3. esiste un `Y` **dichiarato nella stessa room** (dichiarazione non annullata, stanza viva) con `linked(me, Y)` e `linked(Y, X)`.

In ogni caso **il blocco prevale**: se tra me e X c'è un blocco (in una direzione o nell'altra) X è invisibile anche con amici in comune, e un blocco tra me e Y, o tra Y e X, fa sì che Y non faccia da ponte. Una richiesta `pending` non conta, né come legame diretto né come ponte.

Perché `Y` deve essere nella stessa room: la ragione sociale è "c'è un amico in comune alla serata". Senza questo vincolo la cerchia visibile crescerebbe a tutta la rete a due salti e il principio 6 si svuoterebbe. Perché `linked` è simmetrico: chi mi segue e ho accettato mi ha già dato fiducia, e nella chat di una serata a cui veniamo entrambi la relazione è di fatto reciproca.

La regola vive in **una sola funzione SQL**, `private.can_see_chat_author_for(viewer, room, author)`; `private.can_see_chat_author(room, author)` è il wrapper con `auth.uid()`. La usano `get_room_messages`, `get_my_chat_rooms` (anche `friends_inside`, `photo_count`, ultimo messaggio), `get_chat_photo_paths`, il trigger delle push di chat (`private.notify_chat_message`) e la policy `chat_messages_read`. Il client non ricostruisce nulla: mostra ciò che restituiscono le RPC e Realtime. Se arriva via Realtime un messaggio di un autore di cui non conosce l'handle (un amico di amico), ricarica `get_room_messages` invece di inventarlo.

**Realtime passa dalla policy.** Realtime valuta `chat_messages_read` per ogni abbonato: per questo la policy usa la stessa funzione, altrimenti i messaggi degli amici di amici non arriverebbero in tempo reale. Poiché le policy girano con i privilegi del chiamante, `authenticated` ha `EXECUTE` solo sul wrapper `can_see_chat_author(uuid, uuid)` (usa `auth.uid()`, quindi risponde solo su di me); `is_linked` e `can_see_chat_author_for` restano privati.

**Effetto dell'uscita dell'amico in comune.** La visibilità è valutata a ogni lettura, non congelata al momento del messaggio. Se `Y` annulla la dichiarazione o uno dei due follow cade (o compare un blocco), A e C smettono di vedersi, **anche i messaggi passati**. È la scelta conservativa.

Si entra con una dichiarazione non annullata (anche scaduta alle 06:00) finché la stanza è viva; `undeclare` cancella la riga e chiude l'accesso. Si scrive solo con `send_chat_message`.

## Foto: perché URL firmati

Il bucket `chat-photos` non ha policy di lettura. L'app non riceve mai un path: `get_room_messages` non lo restituisce. Per mostrare le foto chiama `chat-photo-urls` con gli id dei messaggi; la funzione chiede i path al database **con il JWT dell'utente** (quindi decide la visibilità il database) e firma solo quelli, per 1 ora.

Pipeline di invio: selettore (`exif: false`) → `preparePhoto` (lato lungo ≤ 1280 px, mai ingrandita, ricodifica JPEG 0.7: la ricodifica non copia il blocco EXIF, quindi la posizione dello scatto non esce dal telefono) → upload in `chat-photos/<user_id>/<uuid>.jpg` → `send_chat_message` con quel path. Il file originale non viene mai caricato. La RPC accetta solo path esattamente `<mio id>/<uuid>.jpg`.

## Scadenza e cancellazione dei file (principio 5)

- La stanza scade 2 giorni dopo la fine della serata (`chat_rooms.expires_at`).
- `purge-expired-content` (pg_cron, ogni 5 minuti) cancella stanze e messaggi; un trigger mette in coda i file; subito dopo `invoke_storage_gc` chiama `storage-gc`, che li rimuove da Storage e svuota la coda. Se la funzione non risponde i file restano in coda e vengono ritentati al giro dopo.
- La UI avvisa "Si cancella tra N ore" solo quando mancano meno di 12 ore.
- Nulla della chat viene scritto nella cache su disco dell'app (`meta: { persist: false }`).

## Come verificare la Definition of Done

1. **Tempo reale e amici di amici**: con tre account A, B, C che hanno dichiarato lo stesso locale, A segue B e B segue C (accettati), A e C non si seguono. A e C si leggono e si scrivono in tempo reale. Se B annulla la dichiarazione (o C dichiara un altro locale e B resta solo nel primo), A e C non si vedono più. Con un blocco tra A e C non si vedono mai.
2. **Foto non pubblica**: copia il path di una foto dalla tabella `storage.objects` e prova `https://<ref>.supabase.co/storage/v1/object/public/chat-photos/<path>` e la stessa senza token: deve rispondere errore. Con un URL firmato (da `chat-photo-urls`) funziona per 1 ora.
3. **EXIF**: scarica con l'URL firmato una foto scattata con la posizione attiva e lancia `exiftool foto.jpg`: nessun tag GPS, nessuna `Make/Model`.
4. **Scadenza**: `update chat_rooms set expires_at = now() - interval '1 minute' where id = '<room>';` Entro 10 minuti (di solito 5) la stanza, i messaggi e i file sono spariti: `select count(*) from chat_messages where room_id = '<room>'` e `select count(*) from storage.objects where bucket_id = 'chat-photos' and name like '<user>/%'`; la coda `private.storage_deletion_queue` torna vuota.
5. **Lingue**: apri la chat con l'app in italiano e in inglese (profilo → lingua).
