# Sync dei locali da Google Places: passi per Luca

Tutto si fa dalla tua macchina; l'ambiente di sviluppo di Claude non raggiunge né Google né il progetto remoto.

## 1. Una tantum

1. Google Cloud: abilita **Places API (New)**, crea una chiave API ristretta a quella API (non quella dell'SDK Maps) e imposta una quota giornaliera bassa.
2. Applica le migration al progetto remoto: `npx supabase db push` (vedi `supabase/README.md`).
3. Genera la chiave di amministrazione della sync in locale (non va in nessun file) e imposta i secret; i valori li incolli tu:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
   `npx supabase secrets set SYNC_ADMIN_KEY=<valore generato>`
   `npx supabase secrets set GOOGLE_PLACES_API_KEY=<la tua chiave>`
4. Deploy (anche dopo ogni cambio a `places-sync`): `npx supabase functions deploy places-sync places-detail`
5. Variabili della shell (di sistema, **non** in `.env`):
   - per `npm run venues:sync`: `SUPABASE_URL` (https://<ref>.supabase.co), `SYNC_ADMIN_KEY` (il valore generato sopra, inviato nell'header `x-sync-key`) e `SUPABASE_ANON_KEY`. Quest'ultima deve essere la chiave `anon` **legacy in formato JWT** (Dashboard → Project Settings → API Keys → Legacy API keys → `anon`): serve solo a far passare la richiesta dal gateway delle Functions (`verify_jwt` accetta qualsiasi JWT firmato dal progetto; `anon` è il meno privilegiato). Una chiave `sb_publishable_…` non è un JWT e non passa. La sync **non** usa la service role.
   - per `npm run typical:import`: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, la chiave `service_role` **legacy in formato JWT** (Legacy API keys → `service_role`; una `sb_secret_…` non funziona con la RPC riservata).

## 2. Sync

```
npm run venues:sync -- --city milano --dry-run          # nessuna chiamata a Google: query e stima
npm run venues:sync -- --city milano                    # sync reale, max 10 richieste
npm run venues:sync -- --city milano --city las-palmas --max-requests 12
```

Lo script stampa, per ogni città, le chiamate Places reali (o stimate), i locali inseriti/aggiornati e i demo disattivati. I demo (`demo-%`) di una città si disattivano solo quando ha almeno 10 locali reali attivi. Le città devono essere attive (`cities.is_active`). Le aree usate nelle query stanno in `cities.places_areas`, il raggio in `cities.places_radius_m`.

## 3. Aggiornamento settimanale (opzionale)

Per rispettare i 30 giorni basta lanciare la sync a mano ogni settimana, oppure pianificarla con `pg_net` + Vault. SQL una tantum da eseguire nell'editor SQL del progetto (non è una migration, contiene un segreto):

```sql
-- Salva nel Vault la chiave admin della sync e la anon LEGACY (JWT, non sb_publishable_…): la anon serve
-- solo a passare il gateway delle Functions, la funzione autorizza con l'header x-sync-key.
select vault.create_secret('<SYNC_ADMIN_KEY>', 'sync_admin_key');
select vault.create_secret('<ANON_KEY_LEGACY_JWT>', 'anon_key_legacy');
select cron.schedule('places-sync-weekly-milano', '0 3 * * 1', $$
  select net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/places-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-key', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_admin_key'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key_legacy')),
    body := '{"city_slug": "milano", "max_requests": 10}'::jsonb);
$$);
```

## 4. Strato "di solito"

1. Copia `supabase/seed/typical_busyness.template.csv` in `supabase/seed/typical_busyness_<città>.csv`.
2. Compila a mano le righe con i `google_place_id` dei locali sincronizzati, da informazioni pubbliche del locale stesso. **Mai Popular times.**
3. `npm run typical:import -- --city milano` (o `--file percorso.csv`). L'import è atomico e idempotente; rifiuta place_id sconosciuti o di un'altra città (`UNKNOWN_VENUE`) senza scrivere nulla; non tocca le righe `history`.
