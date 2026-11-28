# Registro di utilizzo (solo amministratore)

Prompt 26. Registra **quando** e **per quanto tempo** gli utenti usano l'app, per sicurezza, funzionamento e miglioramento del servizio. Lo vede solo l'amministratore.

## Cosa si registra e cosa no

| Si registra                                                                                       | Non si registra mai                                               |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Ogni login riuscito (email + password, link di conferma email)                                    | Schermate visitate, contenuti, azioni nell'app                    |
| Ogni sessione: inizio, ultimo segno di vita, fine (apertura in primo piano → chiusura/background) | Posizione, indirizzo IP, modello o identificativi del dispositivo |
| Piattaforma (`ios` / `android`) e versione dell'app                                               | Email, età esatta, contatti                                       |

Nessun SDK di terze parti. Nessun timer in background: il client batte ogni 60 s solo mentre l'app è in primo piano.

## Database (migration `20261128000100_usage_log.sql`, pgTAP `43_usage_log.sql`)

- `profiles.is_admin boolean not null default false`: fuori dal grant di update dei client, non in `public_profiles`, non in nessuna RPC verso altri utenti; l'utente legge solo la propria riga (come `is_support`, ma ruolo distinto).
- `public.usage_events`: RLS attiva, **nessun privilegio** a `anon`/`authenticated`. Si passa solo dalle RPC.
- RPC dei client (`security definer`, account cancellato rifiutato da `require_user`):
  - `log_login(p_platform, p_app_version)`: max 20 al giorno, oltre ignora in silenzio.
  - `start_usage_session(p_platform, p_app_version) -> bigint`: chiude le sessioni aperte dello stesso utente (`ended_at = last_seen_at`); max 200 al giorno, oltre `null`.
  - `touch_usage_session(p_id)`: solo sessione propria e aperta, al massimo una volta ogni 30 s.
  - `end_usage_session(p_id)`: solo sessione propria.
- RPC dell'amministratore (`NOT_ADMIN` se `is_admin` è falso, anche per `is_support`): `get_usage_overview(p_days, p_search)` (periodo limitato a 1–90 giorni, max 500 utenti, mai email) e `get_user_usage(p_user, p_before, p_limit)` (max 100 eventi).
- Durata di una sessione: `coalesce(ended_at, last_seen_at) - started_at`; una sessione rimasta aperta (app uccisa) conta fino all'ultimo segno di vita.
- Job `purge-usage-events` (ogni giorno alle 06:45 UTC): chiude le sessioni aperte con `last_seen_at` più vecchio di 10 minuti e cancella gli eventi più vecchi di **90 giorni**.
- `delete_my_account()` cancella subito gli eventi dell'utente (e la riga sparisce comunque in cascata con il profilo).

## Client (`src/features/usage/`)

- `useUsageTracking` (montato una volta in `RootNavigator`, solo con profilo pronto): `domain/tracker.ts` apre la sessione in primo piano, la tocca ogni 60 s, la chiude in background/inactive, allo smontaggio e **prima del logout** (`endActiveUsageSession` in `signOut`). Gli errori vanno in `console.warn`, mai all'utente, mai bloccanti.
- `log_login` parte da `signIn` e da `exchangeAuthCode` dopo un esito positivo, una volta per login, senza far attendere l'accesso.
- Schermata `app/admin/usage.tsx` (periodo 7/30/90, ricerca per handle, pull-to-refresh) e `app/admin/usage/[userId].tsx` (eventi con paginazione). Rotte protette in `RootNavigator` (`profile.isAdmin`); voce "Utilizzo app" nel gruppo Aiuto delle impostazioni, solo per l'admin. I dati admin non vanno mai nella cache su disco (`meta.persist: false`).
- Tolleranza prima del `db push`: `is_admin` si legge con una query a parte; se la colonna non esiste ancora la lettura fallisce in silenzio e vale `false`, il profilo si carica comunque. Le RPC di tracking che mancano danno solo un warning.

## Informativa privacy (testo in `src/i18n/{it,en}/legal.json`)

Paragrafo "Dati di utilizzo": accessi e sessioni (data, ora, durata, piattaforma, versione), finalità (sicurezza, funzionamento e miglioramento del servizio), base giuridica legittimo interesse, conservazione 90 giorni, destinatario solo l'amministratore, cancellazione con l'account, nessun SDK di terze parti. Da riportare anche nel registro dei trattamenti / DPIA (non esiste ancora un `docs/privacy-policy.md`).

## Come nominare l'amministratore (azione manuale)

```sql
update public.profiles set is_admin = true where handle = '<handle senza @>';
-- per togliere: = false. L'app rilegge il profilo al prossimo avvio.
```

Verifica: `select handle from public.profiles where is_admin;` deve elencare solo te.

## Query per la dashboard Supabase (SQL editor)

Panoramica degli ultimi 30 giorni:

```sql
select p.handle,
       count(*) filter (where e.kind = 'login') as accessi,
       count(*) filter (where e.kind = 'session') as sessioni,
       floor(coalesce(sum(extract(epoch from coalesce(e.ended_at, e.last_seen_at) - e.started_at))
         filter (where e.kind = 'session'), 0) / 60) as minuti,
       max(greatest(e.last_seen_at, e.ended_at)) as ultimo_accesso
  from public.usage_events e join public.profiles p on p.id = e.user_id
 where e.started_at >= now() - interval '30 days' and p.deleted_at is null
 group by p.handle
 order by ultimo_accesso desc
 limit 100;
```

Dettaglio di un handle:

```sql
select e.kind, e.started_at, coalesce(e.ended_at, e.last_seen_at) as fine,
       floor(extract(epoch from coalesce(e.ended_at, e.last_seen_at) - e.started_at) / 60) as minuti,
       e.platform, e.app_version
  from public.usage_events e join public.profiles p on p.id = e.user_id
 where p.handle = '<handle senza @>'
 order by e.started_at desc
 limit 100;
```

## Messa in produzione

1. `npx supabase db push` (migration `20261128000100_usage_log`).
2. Nominare l'amministratore (SQL sopra).
3. `eas update` (solo JS e stringhe: nessuna nuova build nativa).
