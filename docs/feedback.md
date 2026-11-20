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

Solo il supporto (service role) legge: i client non hanno né policy né privilegi di lettura, e l'inserimento passa solo dalla RPC `submit_feedback` (10 al giorno per utente, errore `FEEDBACK_LIMIT`).

- **Dashboard Supabase → SQL editor**:

  ```sql
  select f.created_at, p.handle, f.rating, f.screen, f.comment, f.platform, f.app_version, f.screenshot_path
    from public.feedback f join public.profiles p on p.id = f.user_id
   order by f.created_at desc
   limit 100;
  ```

- **Dashboard → Storage → bucket `feedback`**: aprire la cartella `<user_id>/` e il file indicato da `screenshot_path` (bucket privato: dalla dashboard si ottiene un link firmato temporaneo).

Nessuna azione manuale per l'attivazione oltre `npx supabase db push`. L'icona richiede però il modulo nativo `react-native-view-shot`: arriva con la **prossima build** (dev client / preview), non con `eas update`.

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
