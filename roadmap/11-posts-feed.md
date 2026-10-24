# 11 — Il giorno dopo, feed, like, commenti, storie

Leggi `CLAUDE.md` (principi 5, 6, 7). Mock-up: `GiornoDopo.dc.html`, `Feed.dc.html`, barra storie in `TopBar.dc.html`. Backend: `posts`, `post_likes`, `post_comments`, RPC `get_feed`, `get_stories`, Storage `posts`.

> **Ruoli e metodo**: architetto → piano/interfacce/test; `/model sonnet` → TDD; architetto → review.

## Obiettivo

Chi ha dichiarato una serata può pubblicare una foto o due righe ("Com'è andata ieri sera?"). Il post compare **subito nella chat della serata**, nel **feed dal giorno dopo** (06:00) e si cancella **dopo 7 giorni**. Il feed mostra solo chi seguo, con like e commenti. La barra storie evidenzia i seguiti con un post di oggi.

## Istruzioni

1. **`post/new.tsx`** fedele a `GiornoDopo.dc.html`:
   - raggiungibile dal "+" della TopBar (solo con una dichiarazione attiva o scaduta da < 24 h) e dalla notifica promemoria (prompt 15);
   - label `IL GIORNO DOPO`, "Com'è andata ieri sera?", pulsante `AGGIUNGI UNA FOTO` (fotocamera/galleria, stessa pipeline del prompt 10: 1280 px, EXIF strip), campo "Descrizione", nota "La foto compare subito nella chat della serata, visibile solo ai tuoi follower. Nel feed arriva il giorno dopo e si cancella dopo una settimana.";
   - `Pubblica sul profilo` → upload in `posts/<user_id>/…` → insert `posts` con `visible_from` = prossime 06:00 (o ora, se la serata è già di ieri) e `expires_at = visible_from + 7 giorni`; invia anche un messaggio `photo` nella chat della serata se ancora attiva;
   - torna alla schermata di provenienza (`rp_from` nel mock-up → usa il router history).
2. **Feed** `app/(tabs)/feed.tsx` fedele a `Feed.dc.html`:
   - `TopBar` con storie; banner informativo "Vedi solo le persone che segui. Le foto di ieri sera arrivano oggi e si cancellano dopo una settimana.";
   - `PostCard`: avatar/handle, "Arena Club · ieri sera", `SCADE TRA N GG`, foto (signed URL, `expo-image` con cache), caption, **like** (toggle optimistic, cuore pieno viola), **commenti** (apre sheet con lista e composer, max 300 caratteri);
   - paginazione a cursore (`get_feed`), pull-to-refresh, empty state con link "Segui altre persone per vedere più foto" → tab Amici.
3. **Storie** (`get_stories`): nella TopBar, "La tua storia" + seguiti con post visibile oggi, anello sfumato viola→ciano se non ancora visto (stato "visto" solo locale, AsyncStorage); tap → scorrimento a schermo intero dei post di quella persona di oggi.
4. **Visibilità e TTL**: nulla da fare nel client oltre a mostrare la scadenza: RLS e pg_cron (prompt 04) garantiscono follower-only, finestra temporale e cancellazione; Edge `storage-gc` elimina i file dei post scaduti.
5. **Moderazione**: lungo-tap su post/commento → Segnala; su autore → Blocca (prompt 16 aggiunge il filtro automatico sulle foto in upload).
6. **Test**: calcolo `visible_from`/`expires_at` (serata di ieri vs stasera, cutoff 06:00, fuso città); like optimistic + rollback; "scade tra N gg"; storie "non viste" → "viste"; `canPost` (dichiarazione attiva o scaduta < 24 h).

## Definition of Done

- [ ] Pubblico una foto dopo una dichiarazione: compare subito nella chat della serata; nel feed dei miei follower solo dopo le 06:00 (test forzando `visible_from`); sparisce dopo 7 giorni (forzando `expires_at`)
- [ ] Un non-follower non vede il post né via UI né via select diretta
- [ ] Like e commenti funzionano con due account; il contatore è coerente dopo refresh
- [ ] Barra storie mostra i seguiti con post di oggi e distingue visti/non visti
- [ ] Test scritti prima; nessun `any`
- [ ] Tutte le stringhe nuove esistono in `it` e `en` (`npm run i18n:check` pulito) e le schermate sono state provate in entrambe le lingue
- [ ] Commit: `feat(11): day-after posts, feed, likes, comments, stories`
