# 18 — Backlog: fuori perimetro e v2

Cosa resta fuori anche dalla roadmap completa, e perché. Da riprendere dopo 4–6 settimane di dati reali a Milano.

## Esplicitamente fuori dal primo rilascio

| Idea | Perché aspettare |
|---|---|
| Login social (Apple/Google) | Semplifica l'onboarding ma Apple impone "Sign in with Apple" se c'è un altro social login; email-only evita l'obbligo. Da valutare alla v2 con entrambi insieme |
| Mappa in tempo reale della posizione degli amici | Contraddice il principio 3 (posizione grossolana, solo "Tu"); rischio sicurezza alto |
| Chat 1:1 e DM | Moderazione molto più onerosa; la chat di serata basta per il caso d'uso |
| Video nel feed | Costi Storage/egress e moderazione; prima validare le foto |
| Più città attive | Il dato è pronto (`cities`); si attiva quando Milano ha densità (Roma e Torino le candidate naturali; Las Palmas già nel seed) |
| Pagamenti Stripe per creator | Possibile solo con checkout web esterno; rischio review Apple; valutare quando i volumi giustificano il risparmio di commissione |
| Dashboard web per i locali (B2B) | Vendere ai gestori le intenzioni pre-visita aggregate (k≥3) — pista di ricavo promettente ma prodotto separato |
| Light mode | Token predisposti |

## Candidati v0.2 (per valore stimato)

1. **Trend orario per locale nel dettaglio** ("alle 23 di solito 20+ persone"): la base c'è già (`night_hour_stats` e lo strato "di solito" dei prompt 04/06/07); qui si tratta di mostrare la curva per ora in `venue/[id]`, sempre da aggregati con k ≥ 3, mai per utente. Quando `history` copre la maggior parte del catalogo, dismettere la curatela manuale.
2. **Inviti con link** per far crescere la rete amici (`/u/<handle>` già c'è; aggiungere "invita 3 amici" post-onboarding).
3. **Sign in with Apple + Google** insieme.
4. **Widget iOS/Android** "stasera: 3 locali caldi".
5. **Spagnolo** come terza lingua (struttura i18n già pronta).
6. **Serate ricorrenti** per i creator e statistiche nel tempo.
7. **MapLibre + OpenFreeMap** per uno stile dark identico su iOS e Android.
8. **Suggerimenti amici** oltre ai contatti: persone che dichiarano spesso gli stessi locali (solo con consenso esplicito e soglie k).

## Debito tecnico accettato

- Nessuna coda offline per dichiarazioni/post: l'utente ritenta.
- `Sheet` custom invece di `@gorhom/bottom-sheet`.
- Coda di moderazione minima (view + azioni), senza strumenti avanzati.
- Test SQL eseguiti a mano con `supabase db reset`: aggiungere CI (GitHub Actions + `supabase start`) quando ci sono più contributori.
- Rate limiting applicativo solo dove indicato (AI, contatti, report); da estendere se compaiono abusi.

## Metriche per decidere cosa fare dopo

- % registrazioni completate (email confermata → profilo → handle)
- dichiarazioni per utente attivo a settimana; % utenti che seguono ≥ 3 persone
- % dichiarazioni che portano a un messaggio in chat; % serate con almeno un post il giorno dopo
- locali con affluenza visibile (≥ 3) per serata — se quasi sempre 0, il problema è la densità, non le feature
- creator attivi, serate pubblicate, % serate sponsorizzate, churn abbonamento
- report di moderazione per 1.000 contenuti e tempo medio di gestione
