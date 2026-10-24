# RightPlace — Mock-up (sorgenti degli artboard)

Esportato dall'artifact Claude Design **"RightPlace Mockup"** (versione 1792860804-1371, 24/10/2026):
https://claude.ai/artifact/4kb42MbiuArh8SCr5Cgcwa

Per vedere il mock-up renderizzato e navigabile, apri il link sopra (è l'unico modo: i file `.dc.html`
sono componenti del canvas Design e da soli, aperti nel browser, non si renderizzano perché dipendono dal runtime `support.js`).
Il codice HTML/CSS inline di ogni schermata è comunque leggibile e utilizzabile come riferimento per il porting in React Native.

## Schermate (ordine del flusso, da `project/canvas.json`)

| # | File | Titolo |
|---|---|---|
| 1 | `project/Main.dc.html` | Accesso |
| 2 | `project/Profilo.dc.html` | Profilo privato |
| 3 | `project/Mappa.dc.html` | Mappa |
| 4 | `project/Serata.dc.html` | Dichiara la serata |
| 5 | `project/Chat.dc.html` | Chat di gruppo |
| 6 | `project/GiornoDopo.dc.html` | Il giorno dopo |
| 7 | `project/CreaSerata.dc.html` | Creator: crea serata |
| 8 | `project/Abbonamento.dc.html` | Creator: abbonamento |
| 9 | `project/Amici.dc.html` | Amici |
| 10 | `project/Ricerca.dc.html` | Cerca locali |
| 11 | `project/Locale.dc.html` | Dettaglio locale |
| 12 | `project/Feed.dc.html` | Feed |
| 13 | `project/ProfiloApp.dc.html` | Profilo (dentro l'app) |
| 14 | `project/CreatorProfilo.dc.html` | Profilo creator |
| — | `project/TopBar.dc.html` | Componente barra alta (riusato da Feed e altre schermate) |

## Design token ricavati dai file

- Background `#0B0B12`, superfici `#15151F`, bordi `#2A2A3A`
- Testo `#F2F1F8`, testo secondario `#A3A1B8`
- Viola `#9D6BFF` ("Ci vado" / primario), ciano `#4ED9C7` ("Forse" / secondario)
- Font: Unbounded (display), Inter (body), Space Mono (label)
- Radius: card 16–18, bottoni 14–16, pill 999; altezza bottone primario 56

## Nota per la roadmap

La roadmap in `roadmap/` (v2) è allineata a **tutte** le 14 schermate di questo mock-up: account con email, profilo
privato, mappa generale/amici, dichiarazione, chat di serata, feed del giorno dopo, amici, ricerca, dettaglio locale,
creator con serate e abbonamento. Ogni prompt cita le schermate `.dc.html` che implementa.

**Cosa il mock-up NON rappresenta** (sono decisioni di prodotto che vivono in `roadmap/CLAUDE.md`, non qui):

- **Città di lancio: Milano.** I locali di esempio (Arena Club, Sunset Rooftop, Las Palmas, Madrid, Barcellona…), le
  affluenze, le età, le percentuali e i numeri di telefono nel mock-up sono **dati finti** usati solo per disegnare le
  schermate. I locali reali arrivano da Google Places per Milano (prompt 06); nulla di questi dati va nel seed.
- **Lingue: italiano e inglese.** Il mock-up è solo in italiano. I testi inglesi non esistono qui: vengono scritti in
  fase di implementazione nei file `src/i18n/en/*.json`, con la stessa struttura di quelli italiani ricavati dal mock-up.
  Le etichette in Space Mono (`SPONSORIZZATA`, `SOLO CHI HA DICHIARATO`, …) si traducono anch'esse.
- Trasporti: il mock-up mostra Cabify; a Milano si usa **Free Now** (oltre a Uber, taxi e trasporto pubblico ATM).

Il mock-up resta la fonte di verità **visiva** (layout, colori, componenti, flussi); per contenuti, città e lingue
vale la roadmap.
