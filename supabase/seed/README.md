# Strato "di solito" (curatela manuale)

`typical_busyness.template.csv` contiene solo le intestazioni. Per una città copia il template in
`typical_busyness_<slug>.csv` (es. `typical_busyness_milano.csv`), compilalo **dopo** `npm run venues:sync`
e importalo con `npm run typical:import -- --city <slug> [--file percorso.csv]`.

| Colonna           | Valori                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------- |
| `google_place_id` | place_id del locale già sincronizzato nella stessa città                               |
| `weekday`         | 0–6 (0 = domenica)                                                                     |
| `hour_from`       | 0–23, incluso                                                                          |
| `hour_to`         | 0–23, incluso. Se è minore di `hour_from` la fascia scavalla la mezzanotte (sab → dom) |
| `level`           | 0 chiuso/vuoto, 1 tranquillo, 2 animato, 3 pieno                                       |

Fonti ammesse: informazioni pubbliche **del locale stesso** (sito, profili social, orari di apertura, giorni forti
dichiarati). **Mai** i "Popular times" di Google né servizi che li copiano. I file con dati reali non vanno
committati finché non sono stati verificati a mano. L'import è atomico e idempotente e non tocca le righe `history`.
