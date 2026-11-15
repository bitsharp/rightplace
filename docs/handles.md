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

Uno ogni **30 giorni** (`profiles.handle_changed_at`), per `set_handle` e per `regenerate_handle`. Il profilo non ha un campo "completato" e lo step @tag segue subito `complete_profile`: il limite vale quindi sempre, e la prima scelta è libera (`handle_changed_at` è nullo finché non si cambia). Errore: `HANDLE_CHANGE_TOO_SOON`. Impostare lo stesso handle già in uso è un no-op.

## RPC

- `set_handle(p_handle)`: normalizza, poi `INVALID_HANDLE`, `HANDLE_NOT_ALLOWED`, (no-op se uguale al proprio), `HANDLE_CHANGE_TOO_SOON`, `HANDLE_TAKEN`.
- `is_handle_available(p_handle)`: `available | invalid | not_allowed | taken`, solo `authenticated`. Rivela solo ciò che la ricerca per handle già rivela.
- `regenerate_handle()`: nuovo `animale.colore` casuale, stesso limite.

## Privacy e moderazione

- Il client mostra l'avviso **"Non usare nome e cognome: il tuo @tag è visibile a tutti"** accanto al campo.
- Un handle offensivo o che impersona qualcuno si segnala come qualunque utente (`report`). Nel prompt 16 il moderatore potrà forzare un nuovo handle.
