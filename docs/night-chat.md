# Chat di serata

Come funziona, perché è fatta così e come verificarla. Regole di prodotto: `CLAUDE.md`, principi 5, 6 e 7.

## Chi vede cosa (principio 6)

La stanza (`chat_rooms`) esiste dalla prima dichiarazione su una serata o un evento e contiene **tutti** i dichiarati. Ma ognuno legge solo i propri messaggi e quelli di chi segue con follow **accettato**, e mai attraverso un blocco. La regola vive in SQL (`private.can_see_chat_author`, usata da `get_room_messages`, `get_my_chat_rooms`, `get_chat_photo_paths` e dalla policy di lettura, quindi anche da Realtime). Il client la ripete (`visibleMessages`, `parseInsertedMessage`) solo come difesa in profondità: per esempio una cache vecchia dopo un unfollow non deve mostrare nulla.

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

1. **Tempo reale e non seguiti**: con tre account A, B, C che hanno dichiarato lo stesso locale, A segue B (accettato) e non C. B e A si scrivono in tempo reale; i messaggi di C non compaiono ad A (né dal vivo né ricaricando).
2. **Foto non pubblica**: copia il path di una foto dalla tabella `storage.objects` e prova `https://<ref>.supabase.co/storage/v1/object/public/chat-photos/<path>` e la stessa senza token: deve rispondere errore. Con un URL firmato (da `chat-photo-urls`) funziona per 1 ora.
3. **EXIF**: scarica con l'URL firmato una foto scattata con la posizione attiva e lancia `exiftool foto.jpg`: nessun tag GPS, nessuna `Make/Model`.
4. **Scadenza**: `update chat_rooms set expires_at = now() - interval '1 minute' where id = '<room>';` Entro 10 minuti (di solito 5) la stanza, i messaggi e i file sono spariti: `select count(*) from chat_messages where room_id = '<room>'` e `select count(*) from storage.objects where bucket_id = 'chat-photos' and name like '<user>/%'`; la coda `private.storage_deletion_queue` torna vuota.
5. **Lingue**: apri la chat con l'app in italiano e in inglese (profilo → lingua).
