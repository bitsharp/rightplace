# Presenze stimate ("bot") sullo strato "stasera"

Decisione di Luca (26 nov 2026, rischio accettato): per non far sembrare vuota l'app al lancio, i locali più frequentati secondo lo
strato "di solito" ricevono **presenze stimate** generate dal server, diverse ogni giorno. Principi 2 e 11 di `CLAUDE.md`.

**Nessuna etichetta in UI (decisione di Luca, 26 nov 2026, rischio accettato):** l'app non scrive STIMA/ESTIMATE da nessuna parte
(né testo né etichette accessibili); le fasce sembrano tutte persone. L'unica spiegazione è il paragrafo dei termini d'uso
(`legal.json`, it/en). Le RPC espongono ancora `is_estimate`, che il client usa solo per scegliere il messaggio neutro di "Chi ci va".

## Cosa sono e cosa non sono

- **Solo affluenza.** Nessun profilo finto, nessun @handle, nessuna riga in `declarations`. Tabella `private.night_bot_presence`
  (`venue_id`, `night_date`, `going`, `maybe`): nessun privilegio a `anon`/`authenticated`, RLS attiva.
- Vengono **sommate** alle dichiarazioni vere nelle **fasce** di: `get_city_map` (vista generale), `get_venue_stats`, `search_venues`,
  `get_recommended_venue` (card "più caldo stasera"), `get_busiest_tonight`. Ogni RPC espone `is_estimate`; il client non lo mostra.
- **Non** entrano in: mappa amici, chat, feed, notifiche, adesioni degli eventi dei creator (`get_event_detail`, `get_event_attendance`,
  `get_city_events`, `get_my_creator_events`), storia tipica (`refresh_typical_from_history` legge solo `declarations`), spot.
- Mai il numero esatto, né dei veri né dei bot: solo fasce.

## Garanzia k (principio 2)

Età media, % genere, amici e ogni statistica su persone si calcolano **solo sulle dichiarazioni vere** e solo se le persone vere sono
**≥ 3**: i bot non sbloccano mai un dato personale. Se la fascia include stime ma le persone vere sono < 3, il client scrive il messaggio neutro
"Statistiche non ancora disponibili" (non "meno di 3 persone", che contraddirebbe la fascia mostrata, e senza parlare di stime). Test con valori noti in
`supabase/tests/40_night_bots.sql` (3 veri di 20/30/40 anni + bot: età media 30, donne 67 %, uomini 33 %).

## Generazione

`private.generate_night_bots(p_night date default <night corrente, Europe/Rome>)`: per ogni città attiva, i locali attivi non spot con
**livello tipico di picco** della sera (massimo di `typical_level` sulle ore 21–02, stessa precedenza history > manual > apify) ≥ 2,
**massimo 14 per città**: entrano tutti i locali di livello 3 (con un ordine pseudo-casuale che cambia ogni giorno, fino al massimo), poi i
livello 2 scelti in modo deterministico per giorno (circa **1 su 3**, via hash di locale + data) fino al massimo. Numeri deterministici per
(locale, data) con `hashtext`: stabili durante la serata, diversi ogni giorno. Idempotente (cancella e reinserisce la stessa night).

| Livello di picco | `going` | `maybe` |
| ---------------- | ------- | ------- |
| 3 (pieno)        | 10–35   | 4–14    |
| 2 (animato)      | 3–12    | 1–6     |

Costanti in testa alla funzione (tarate da `20261126000200_night_bots_tuning.sql`, test in `41_night_bots_tuning.sql`; la migration rigenera subito le stime di stasera). Job pg_cron `generate-night-bots` ogni giorno alle **05:10 UTC** (06:10 a Roma in inverno, 07:10 in
estate: la night nuova inizia alle 06:00 locali, quindi tra le 06:00 e il job la night non ha ancora stime); lo stesso job cancella
le righe più vecchie di 2 giorni.

## Interruttore

```sql
update private.feature_flags set enabled = false where name = 'night_bots';
```

Effetto immediato su tutte le RPC (`private.night_bot_counts` restituisce 0/0 e `is_estimate` è falso); il generatore non scrive.
I bot si spengono **tutti insieme**, mai uno per uno. Per riaccendere: `enabled = true`.

Rigenerare a mano (per esempio subito dopo il primo `db push`): `select private.generate_night_bots();`

## Rischi accettati

- Percezione di affluenza non reale e delusione degli utenti.
- Rischio di "pratica commerciale ingannevole" (UE): senza etichetta in UI l'unica mitigazione è il paragrafo dei termini d'uso.
- Rischio di rifiuto o rimozione in revisione degli store (App Store / Play) se le stime vengono giudicate fuorvianti.
- Perdita di fiducia degli utenti se scoprono che parte dell'affluenza non è fatta di persone.
- Revisione degli store (App Store / Play).
- Fiducia dei creator, che vedono locali con affluenza stimata.

**Prima del lancio pubblico: parere legale.**
