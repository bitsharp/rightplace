# @handle

L'handle è l'**unica identità pubblica** (insieme a fascia d'età e genere). Alla registrazione ne viene generato uno `animale.colore` (default); l'utente può sceglierne uno suo (decisione di Luca, 15 nov 2026).

## Regole di formato

Una sola regola, in SQL (`private.is_valid_handle`) e nel client (`src/features/profile/domain/handle.ts`, stessi casi di test):

- da 3 a 20 caratteri, solo `a-z`, `0-9`, `.` e `_`;
- inizia con una lettera (quindi mai solo cifre), non finisce con `.` o `_`, niente `..`;
- si salva in minuscolo (`lower(trim)`): l'unicità è quindi case-insensitive.

Gli handle già generati più lunghi di 20 caratteri (animale lungo + colore + cifre) restano validi: il check della tabella accetta anche la vecchia forma `animale.colore[cifre]`. `generate_handle()` non ne produce più di oltre 20 caratteri.

## Blocklist

Tabella `private.handle_blocklist` (nessun accesso dai client), seed minimo da estendere nel prompt 16:

- **riservati** (`rightplace`, `admin`, `support`, `help`, `staff`, `moderator`, `mod`, `official`, `team`, `system`, `root`, `null`, `undefined`): uguaglianza o prefisso dell'handle ripulito da `.`, `_` e cifre (`ad.min`, `admin_1`, `rightplace.milano` sono bloccati);
- **vietati** (insulti e slur comuni IT/EN, parole di almeno 4 lettere per evitare falsi positivi): sottostringa dell'handle ripulito.

## Limite di cambio

Durante l'onboarding l'handle è **libero**: nello step @tag (subito dopo `complete_profile`) l'utente lo sceglie o lo rigenera quante volte vuole (`set_handle`, `regenerate_handle`), senza limite e senza far partire alcun orologio. Il limite di **30 giorni** parte quando preme **"Continua"**, cioè quando il client chiama `confirm_handle()`: da lì `set_handle` e `regenerate_handle` rispondono `HANDLE_CHANGE_TOO_SOON` finché non sono passati 30 giorni da `profiles.handle_changed_at`. Impostare lo stesso handle già in uso è un no-op.

Stato: `profiles.handle_confirmed_at` (null = handle non ancora confermato). `confirm_handle()` lo valorizza e imposta `handle_changed_at = now()`; è idempotente (una seconda chiamata non sposta le date). In onboarding `set_handle`/`regenerate_handle` non toccano `handle_changed_at`.

Gating: il client deriva lo stato di sessione `needsHandle` da `handle_confirmed_at is null` (con profilo già completo): finché non è confermato l'app principale non si apre, anche dopo aver chiuso e riaperto l'app (si torna allo step @tag). Il valore è letto solo sul proprio profilo (RLS).

Backfill (migration `20261117000200_handle_onboarding.sql`): i profili già oltre l'onboarding, cioè con `birth_date is not null` (lo stesso criterio con cui il client esce da "profilo privato"), ricevono `handle_confirmed_at = coalesce(handle_changed_at, created_at)`, quindi il loro limite attuale non cambia. Chi ha `birth_date` nullo passerà dallo step @tag.

### Un cambio gratuito per tutti (migration `20261117000300_handle_free_change.sql`)

Decisione di Luca: ogni utente, anche già registrato, può cambiare il proprio @tag **almeno una volta** dopo l'onboarding senza attendere i 30 giorni (il backfill aveva fatto partire il limite dalla data di conferma e bloccava gli account esistenti). Colonna `profiles.handle_free_change_used boolean not null default false`: tutti, utenti esistenti inclusi, partono con il cambio gratuito disponibile.

- Dopo la conferma, se `handle_free_change_used = false`, `set_handle` e `regenerate_handle` cambiano l'handle subito (anche entro 30 giorni da `handle_changed_at`), impostano `handle_free_change_used = true` e `handle_changed_at = now()`: da lì il limite di 30 giorni vale come prima.
- Consumano il gratuito solo i cambi riusciti: i rifiuti (`INVALID_HANDLE`, `HANDLE_NOT_ALLOWED`, `HANDLE_TAKEN`) e il no-op (stesso handle) no. In onboarding (`handle_confirmed_at is null`) nulla cambia e il gratuito non si consuma; nemmeno `confirm_handle()` lo consuma.
- Il client legge `handle_free_change_used` solo sul proprio profilo (RLS, come `handle_confirmed_at`) e mostra "Puoi cambiarlo subito una volta; poi una volta ogni 30 giorni"; dopo l'uso mostra la data del prossimo cambio.

## RPC

- `set_handle(p_handle)`: normalizza, poi `INVALID_HANDLE`, `HANDLE_NOT_ALLOWED`, (no-op se uguale al proprio), `HANDLE_CHANGE_TOO_SOON` (solo dopo `confirm_handle` e dopo aver usato il cambio gratuito), `HANDLE_TAKEN`.
- `is_handle_available(p_handle)`: `available | invalid | not_allowed | taken`, solo `authenticated`. Rivela solo ciò che la ricerca per handle già rivela.
- `regenerate_handle()`: nuovo `animale.colore` casuale, stesso limite (libero fino a `confirm_handle`).
- `confirm_handle()`: fine dell'onboarding dell'handle e inizio del limite di 30 giorni; idempotente, solo `authenticated`, restituisce nulla.

## Privacy e moderazione

- Il client mostra l'avviso **"Non usare nome e cognome: il tuo @tag è visibile a tutti"** accanto al campo.
- Un handle offensivo o che impersona qualcuno si segnala come qualunque utente (`report`). Nel prompt 16 il moderatore potrà forzare un nuovo handle.
