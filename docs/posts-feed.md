# Il giorno dopo: post, feed, storie (prompt 11)

## Finestra di vita di un post

1. Si pubblica durante o dopo una serata che ho dichiarato: `get_post_target()` ammette la mia dichiarazione più recente, **attiva o scaduta da meno di 24 ore** (regola `canPost`, usata dal "+" della TopBar).
2. Il trigger `posts_set_window` calcola `visible_from` = fine della serata (**06:00 del giorno dopo nel fuso della città**; se la serata è già finita, un istante già passato) e `expires_at = visible_from + 7 giorni`. Il client non sceglie mai le date.
3. Fino a `visible_from` il post lo vede solo l'autore (compare nella sua "storia"). Poi lo vedono i follower accettati, mai tra bloccati. Dopo `expires_at` sparisce da ogni lettura, e `purge-expired-content` (ogni 5 minuti) lo cancella con likes e commenti.

## Perché due file per una foto

Il post vive 7 giorni, il messaggio in chat 2. Un solo file condiviso verrebbe cancellato per primo dalla chat (o resterebbe oltre i 2 giorni). Il client prepara la foto una volta (1280 px, EXIF tolto), la carica in `posts/<uid>/<uuid>.jpg` e, solo se la chat è viva, anche in `chat-photos/<uid>/<uuid>.jpg`; `create_post` inserisce il post e il messaggio `photo` nella stessa transazione. Limite noto: se `create_post` fallisce dopo gli upload, i file restano orfani (backlog: pulizia degli orfani).

## Cache solo in memoria

Le foto dei post usano URL firmati da 1 ora (`post-photo-urls`) che cambiano a ogni richiesta. `expo-image` le tiene con `cachePolicy: 'memory'` e `cacheKey` = id del post: nessuna copia su disco, quindi nessuna foto sopravvive ai suoi 7 giorni sul telefono. Le query di feed, storie, commenti e URL hanno `meta: { persist: false }`. Su disco resta solo lo store delle "storie viste" (chiavi `userId:latestPostAt`, al massimo 200, svuotato all'uscita dall'account).

## Come verificare la Definition of Done

Con due account A (autore) e B (follower accettato), sul database locale o su un ambiente di prova:

1. **Chat subito, feed alle 06:00.** A dichiara una serata e pubblica una foto. Nella chat della serata B la vede subito; nel feed di B no. Per simulare le 06:00:
   ```sql
   update posts set visible_from = now() - interval '1 minute', expires_at = now() + interval '7 days' where user_id = '<id di A>';
   ```
   Ora B vede il post nel feed.
2. **Sparisce dopo 7 giorni.**
   ```sql
   update posts set expires_at = now() - interval '1 minute' where user_id = '<id di A>';
   ```
   Il post sparisce subito dal feed; entro 5 minuti lo cancella il job (`select count(*) from posts` e la coda `private.storage_deletion_queue` con il file).
3. **Non follower.** Un terzo account C (o B con richiesta `pending`) non vede il post né in app né con `select * from posts` da client.
4. **Like e commenti con due account.** B mette like e commenta; il contatore di A coincide dopo il pull-to-refresh.
5. **Storie.** Con un post di A pubblicato nelle ultime 24 ore e già visibile, B vede l'anello sfumato; aperta la storia l'anello diventa grigio e resta tale finché A non pubblica un altro post.

I test pgTAP (`supabase/tests/20_posts_feed.sql`) coprono la finestra a Milano e a Las Palmas, la paginazione con 25 post a pari `visible_from`, i blocchi e gli errori; `npm run db:test:local` li esegue.
