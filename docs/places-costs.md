# Google Places: costi della ricerca (prompt 20)

Stima approvata da Luca. Prezzi di listino globale; verificare sempre il listino corrente in Google Cloud prima di cambiare i numeri.

## Cosa costa cosa

| Chiamata                                    | Dove                                       | SKU                   | Gratis al mese | Poi                                              |
| ------------------------------------------- | ------------------------------------------ | --------------------- | -------------- | ------------------------------------------------ |
| Autocomplete (New), per richiesta           | `places-search`                            | Autocomplete Requests | 10.000         | 2,83 USD / 1.000                                 |
| Place Details, selezione dalla ricerca      | `places-detail` con `place_id`             | Details Pro           | 5.000          | 17 USD / 1.000                                   |
| Place Details, orari di apertura del locale | `places-detail` con `venue_id` (30 giorni) | Details Enterprise    | 1.000          | circa 20 USD / 1.000 (da verificare sul listino) |

Il costo cambia in base ai campi richiesti, non alla chiamata:

- La selezione usa la field mask `id,displayName,formattedAddress,location,types,primaryType`: tutti campi Pro. **Niente `regularOpeningHours`**, che porterebbe la chiamata in Enterprise.
- Gli orari restano al dettaglio locale, come prima (Enterprise, cache 30 giorni).

## Sessioni: perché la selezione conviene

Le richieste Autocomplete di una stessa digitazione condividono un `sessionToken`. Se la sessione termina con una Place Details che porta lo stesso token, **le Autocomplete della sessione non sono fatturate** (si paga la sola Details Pro). Se la sessione è abbandonata, ogni Autocomplete è pagata.

Se il luogo scelto è già in cache e aggiornato da meno di 30 giorni, `places-detail` risponde senza chiamare Google: la sessione resta aperta e le Autocomplete si pagano, ma costa meno di una Details.

## Stima con 1.000 utenti attivi al mese

Ipotesi: ogni sessione = circa 6 richieste Autocomplete (3 caratteri minimo, debounce 300 ms); il 60% delle sessioni finisce con una selezione.

| Sessioni per utente al mese | Autocomplete (richieste) | Details Pro | Costo stimato                                                              |
| --------------------------: | -----------------------: | ----------: | -------------------------------------------------------------------------- |
|                           1 |                   ~6.000 |        ~600 | **0 USD** (dentro le quote gratuite)                                       |
|                           3 |                  ~18.000 |      ~1.800 | **0 USD** (Autocomplete delle sessioni chiuse gratis, Details sotto 5.000) |
|                           8 |                  ~48.000 |      ~4.800 | **circa 28 USD** con Details Pro                                           |

Il terzo scenario è dominato dalle Autocomplete delle sessioni abbandonate (circa 40% di 8.000 sessioni, per ~6 richieste ciascuna, meno le 10.000 gratuite).

## Tetti che proteggono il conto

- **30 sessioni di ricerca per utente nelle ultime 24 ore**, contate dal server: `consume_places_search_session(user, sessionToken)`. Un token nuovo conta una sessione, uno già visto è gratis. Il client non può evitare il conteggio. Oltre il limite `places-search` risponde 429 e l'app mostra un messaggio; il catalogo resta usabile.
- Input minimo 3 caratteri e debounce 300 ms nell'app; massimo 80 caratteri e 5 suggerimenti nel server.
- Nessuna chiamata senza JWT utente; chiave solo nelle Edge Function; senza chiave la funzione si rifiuta (fail-closed).
- **Azione consigliata a Luca**: impostare in Google Cloud (API e servizi, Places API (New), Quote) un limite giornaliero di richieste sulla chiave. È l'ultima difesa contro un account che crei molti utenti.
