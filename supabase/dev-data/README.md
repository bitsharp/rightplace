# Dati di test per la mappa (SOLO progetto di sviluppo)

Due script SQL per far vedere ai tester una **mappa generale** non vuota. **Non lanciarli in produzione.**

| File                   | Cosa fa                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `demo_map.sql`         | Crea 60 utenti demo e le loro dichiarazioni di stasera su ~8 locali reali di Milano. Idempotente. |
| `demo_map_cleanup.sql` | Rimuove tutto ciò che ha creato `demo_map.sql` e verifica che non resti nulla.                    |

## Cosa crea `demo_map.sql`

- **Guardia**: si ferma con un errore se la città `milano` non è attiva o se esistono più di 500 profili non demo
  (soglia pensata per non lanciarlo per sbaglio su un progetto con utenti veri; la costante è `c_max_real`).
- **60 utenti** `demoNN@demo.rightplace.invalid` in `auth.users` (`raw_user_meta_data = {"demo": true, ...}`), con
  password casuale mai salvata: nessuno può accedere. Profili completi: handle `demo.NN`, fasce d'età 18-24 / 25-34 /
  35-44 / 45+, genere misto, città Milano. Sono 60 (non 40) perché i gruppi sotto sommano a 60 e una dichiarazione
  per utente per sera è un vincolo di tabella.
- **Dichiarazioni per stasera** (mix "Ci vado" / "Forse") su 8 locali di Milano scelti dinamicamente
  (`source = 'places'`, mai spot, club e bar per primi, ordine per nome; i locali finti del seed `demo-%` solo se
  mancano quelli veri). Gruppi da 25, 12, 8, 5, 4, 3 persone: 6 hot spot in fasce diverse (`20–30`, `10–20`, `3–10`).
  Altri 2 locali hanno 2 e 1 dichiarazioni: **sotto k = 3**, quindi non sono hot spot e non compaiono sulla mappa
  (principio 2: nessun numero sotto soglia).
- Non tocca `venue_typical_busyness` (lo strato grigio "di solito" resta curatela reale), né utenti, locali e dati non demo.

## Come lanciarli

- **SQL editor di Supabase** (progetto di sviluppo): incolla il file e premi Run. L'ultima query mostra
  `get_city_map('milano','general')` vista da `demo01`: gli hot spot hanno `is_hot_spot = true`.
- **psql**: `psql "$DEV_DB_URL" -v ON_ERROR_STOP=1 -f supabase/dev-data/demo_map.sql`
  (con `ON_ERROR_STOP` la guardia ferma davvero lo script).

## Rilancio quotidiano

Le dichiarazioni scadono alle 06:00 (fine della night): dopo quell'ora la mappa torna vuota. **Rilancia
`demo_map.sql` ogni giorno dopo le 06:00** (ora di Milano); lo script cancella le dichiarazioni demo vecchie e ne crea di nuove.

Opzionale, **SOLO sul progetto di sviluppo**: farlo girare da pg_cron (cron è in UTC; 05:15 UTC = 06:15 o 07:15 a Milano).
`demo_map.sql` è un unico blocco `do`: incolla il suo contenuto al posto dei puntini.

```sql
select cron.schedule('demo-map-daily', '15 5 * * *', $job$ ...contenuto di demo_map.sql, senza la query di verifica finale... $job$);
-- per rimuoverlo:
select cron.unschedule('demo-map-daily');
```

## Cosa vedono i tester

- Gli handle `demo.01` ... `demo.60` compaiono nella **ricerca utenti** (come ogni profilo: handle, fascia d'età, genere).
  Sono profili privati e non seguibili in modo utile: nessuno li accetta.
- Le dichiarazioni demo contano nello **storico "di solito"**: il job settimanale `refresh-typical-from-history`
  le conta (solo come numeri, senza user id) in `private.night_attendance` e può derivarne livelli `source = 'history'`
  per quei locali. **Prima del go-live fai la pulizia** (sotto) e, se serve, azzera lo storico con le righe opzionali
  commentate in `demo_map_cleanup.sql`.

## Pulizia

Lancia `demo_map_cleanup.sql` (stesso modo). Cancella `auth.users` con email `%@demo.rightplace.invalid`: le cascade
rimuovono profili, dichiarazioni, follow, messaggi. La query finale deve mostrare `0` in tutte le righe.
Se hai attivato il cron, rimuovilo prima con `cron.unschedule('demo-map-daily')`.
