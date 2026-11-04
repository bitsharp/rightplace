# Sync dei locali da Google Places: passi per Luca

Tutto si fa dalla tua macchina; l'ambiente di sviluppo di Claude non raggiunge né Google né il progetto remoto.

## 1. Una tantum

1. Google Cloud: abilita **Places API (New)**, crea una chiave API ristretta a quella API (non quella dell'SDK Maps) e imposta una quota giornaliera bassa.
2. Applica le migration al progetto remoto: `npx supabase db push` (vedi `supabase/README.md`).
3. Imposta il secret (il valore lo incolli tu, non va mai in un file):
   `npx supabase secrets set GOOGLE_PLACES_API_KEY=<la tua chiave>`
4. Deploy: `npx supabase functions deploy places-sync places-detail`
5. Nella shell (variabili di sistema, **non** in `.env`):
   `SUPABASE_URL` (https://<ref>.supabase.co) e `SUPABASE_SERVICE_ROLE_KEY`. Quest'ultima deve essere la chiave `service_role` **legacy in formato JWT** (Dashboard → Project Settings → API Keys → Legacy API keys → `service_role`): la Edge Function la confronta con la `SUPABASE_SERVICE_ROLE_KEY` iniettata da Supabase e il gateway delle Functions verifica il JWT. Le nuove chiavi `sb_secret_…` non funzionano con questa protezione.

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
-- <SERVICE_ROLE_KEY> deve essere la chiave service_role LEGACY (JWT), non una sb_secret_…:
-- la funzione la confronta con la SUPABASE_SERVICE_ROLE_KEY iniettata da Supabase.
select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
select cron.schedule('places-sync-weekly-milano', '0 3 * * 1', $$
  select net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/places-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')),
    body := '{"city_slug": "milano", "max_requests": 10}'::jsonb);
$$);
```

## 4. Strato "di solito"

1. Copia `supabase/seed/typical_busyness.template.csv` in `supabase/seed/typical_busyness_<città>.csv`.
2. Compila a mano le righe con i `google_place_id` dei locali sincronizzati, da informazioni pubbliche del locale stesso. **Mai Popular times.**
3. `npm run typical:import -- --city milano` (o `--file percorso.csv`). L'import è atomico e idempotente; rifiuta place_id sconosciuti o di un'altra città (`UNKNOWN_VENUE`) senza scrivere nulla; non tocca le righe `history`.
