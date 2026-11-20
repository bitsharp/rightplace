# Feedback in-app

Accanto al cuore nella TopBar (mappa, amici, feed) c'è un'icona "fumetto con stella", sempre visibile. Al tocco l'app cattura uno screenshot della schermata corrente (`react-native-view-shot`, solo su azione esplicita dell'utente), apre un foglio con anteprima, voto da 1 a 5 stelle (obbligatorio) e commento (max 1000 caratteri), e lo invia al supporto. L'utente può rimuovere lo screenshot prima di inviare; se chiude il foglio senza inviare, la bozza viene scartata e nulla lascia il telefono.

## Cosa viene salvato

Tabella `public.feedback` (migration `20261120000500_feedback.sql`):

| Colonna                             | Contenuto                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `user_id`                           | chi ha scritto (profilo)                                                                                |
| `rating`, `comment`                 | voto 1–5 e testo (anche vuoto)                                                                          |
| `screen`                            | percorso della schermata **senza id né handle**, es. `/venue/[id]`, `/u/[id]` (normalizzato nel client) |
| `screenshot_path`                   | `<user_id>/<uuid>.jpg` nel bucket privato `feedback` (JPEG, lato lungo max 1080 px), oppure `null`      |
| `app_version`, `platform`, `locale` | versione dell'app, `ios`/`android`, `it`/`en`                                                           |
| `created_at`                        | quando                                                                                                  |

## Come Luca legge i feedback

Solo il supporto legge (account `is_support` dall'app, oppure service role dalla dashboard): i client non hanno né policy né privilegi di lettura, e l'inserimento passa solo dalla RPC `submit_feedback` (10 al giorno per utente, errore `FEEDBACK_LIMIT`).

- **Dashboard Supabase → SQL editor**:

  ```sql
  select f.created_at, p.handle, f.rating, f.screen, f.comment, f.platform, f.app_version, f.screenshot_path
    from public.feedback f join public.profiles p on p.id = f.user_id
   order by f.created_at desc
   limit 100;
  ```

- **Dashboard → Storage → bucket `feedback`**: aprire la cartella `<user_id>/` e il file indicato da `screenshot_path` (bucket privato: dalla dashboard si ottiene un link firmato temporaneo).

Nessuna azione manuale per l'attivazione oltre `npx supabase db push`. L'icona richiede però il modulo nativo `react-native-view-shot`: arriva con la **prossima build** (dev client / preview), non con `eas update`.

## Il team di supporto riceve i feedback nell'app

Niente email: i feedback arrivano **dentro RightPlace** agli account del supporto, con strumenti che esistono già (coda notifiche, `send-push`, Edge Function di firma delle foto). Migration `20261121000100_feedback_support.sql`.

- **Chi è supporto**: `profiles.is_support boolean not null default false`. I client non possono scriverla (non è nel grant di update di `profiles`) e non è esposta agli altri utenti (né in `public_profiles` né in alcuna RPC); l'utente la legge solo sul proprio profilo. Si imposta solo con SQL (vedi sotto).
- **Push**: un trigger `after insert on public.feedback` accoda nella coda notifiche una riga per ogni account `is_support` (categoria `support`, `group_key = 'feedback'`, canale Android `supporto`). Il dispatcher le coalesce: "Nuovo feedback ★★★★☆ su /venue/[id]" / "New feedback ★★★★☆ on /venue/[id]", oppure "N nuovi feedback" / "N new feedback", nella lingua dell'account, con deep link `rightplace://support/feedback`. Nella push non ci sono mai il commento, lo screenshot o l'autore (la coda contiene solo voto e schermata). Il supporto la riceve anche se ha bloccato l'autore (è lavoro), ma non per i propri feedback. Chi è supporto può spegnerla dal profilo → Notifiche → "Feedback ricevuti" (la voce compare solo per il supporto).
- **Casella**: voce "Feedback ricevuti" in Modifica profilo (solo `is_support`) → schermata `app/support/feedback.tsx`: voto, data, @handle, schermata, piattaforma e versione, commento intero, miniatura dello screenshot (tap → visualizzatore a schermo intero), paginazione all'indietro e pull-to-refresh. La rotta è protetta in `RootNavigator`: chi non è supporto viene reindirizzato.
- **RPC** (solo `is_support`, altrimenti `NOT_SUPPORT`): `get_support_feedback(p_before, p_limit)` restituisce id, voto, commento, schermata, `has_screenshot`, versione, piattaforma, lingua, data e `author_handle` (mai email né `user_id`); `get_feedback_screenshot_paths(p_ids)` (max 50) restituisce i path per la firma.
- **Edge Function `feedback-screenshot-urls`** (JWT dell'utente, `verify_jwt` attivo, stesso pattern di `post-photo-urls`): chiama `get_feedback_screenshot_paths` con il JWT del chiamante e firma per 1 ora i path del bucket `feedback`. Nessun nuovo secret.

### Come rendere "supporto" un account (azione manuale per Luca)

1. Applicare la migration: `npx supabase db push`.
2. Deploy della funzione: `npx supabase functions deploy feedback-screenshot-urls`.
3. Nel SQL editor del progetto:
   ```sql
   update public.profiles set is_support = true where handle = '<handle senza @>';
   ```
   (per togliere: `= false`; le push in coda di chi non è più supporto vengono scartate). L'app rilegge il profilo al prossimo avvio.

   Fase di test (decisione di Luca, 20/11/2026): **tutti gli utenti attivi sono supporto**:
   ```sql
   update public.profiles set is_support = true where deleted_at is null;
   ```
   Ognuno riceve una push per ogni feedback e vede tutti i feedback con gli screenshot (che possono mostrare contenuti privati di altri). Prima del lancio pubblico riportare il ruolo al solo team:
   ```sql
   update public.profiles set is_support = false where handle not in ('<handle1>', '<handle2>');
   ```
4. Ridistribuire anche `send-push` (accetta il nuovo canale `supporto`): `npx supabase functions deploy send-push --no-verify-jwt`. Le push richiedono la configurazione già descritta per le notifiche (secret `SEND_PUSH_KEY`, Vault `send_push_url` / `send_push_key`). Il canale Android `supporto` lo crea l'app all'avvio: basta `eas update`.

## Ritenzione e privacy

- Il job `purge-old-feedback` (ogni giorno alle 06:30 UTC) cancella i feedback più vecchi di **180 giorni** e mette i loro screenshot in `private.storage_deletion_queue` (bucket `feedback`), svuotata dalla Edge Function `storage-gc` come per chat e post.
- `delete_my_account()` cancella subito i feedback dell'utente e accoda i suoi screenshot.
- Lo screenshot può mostrare contenuti di altri utenti (feed, chat, profili): per questo è visibile solo al supporto, l'utente lo vede in anteprima e può toglierlo, e la nota nel foglio lo dichiara ("lo vede solo il supporto e viene cancellato dopo 180 giorni").
- Il percorso della schermata non contiene mai id o handle altrui (`normalizeScreenPath`).
- Nessun dato di posizione, contatti o email viaggia col feedback.

## Da citare nell'informativa privacy (prompt 16)

Aggiungere a `docs/privacy-policy.md` (it/en) e al registro dei trattamenti/DPIA: finalità "supporto e miglioramento del prodotto", dati (voto, commento, schermata, **screenshot della schermata su azione esplicita dell'utente**, versione app, piattaforma, lingua), base giuridica (consenso implicito dall'azione esplicita dell'utente / legittimo interesse), destinatari (solo il supporto), ritenzione 180 giorni, cancellazione con l'account.

## Codice

`src/features/feedback/`: `domain/` (percorso normalizzato, regole del form), `captureScreenshot.ts`, `sendFeedback.ts` (upload in `feedback/<uid>/<uuid>.jpg` + RPC), `useOpenFeedback.ts` (cattura **prima** di aprire il foglio), `FeedbackHost.tsx` (montato una volta nel `RootNavigator`), `store/feedbackStore.ts`.
