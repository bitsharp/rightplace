# FIX-01 — Feedback dei tester (board Miro, 13 nov 2026)

Leggi `CLAUDE.md`. Questo non è un prompt di feature: è un pacchetto di **fix** da fare in commit separati (`fix: …`), uno per gruppo, **prima** del prompt 15. Niente migration e niente RPC nuove: se un fix sembra richiederle, fermati e segnalalo.

> **Ruoli e metodo**: architetto → piano/test; `/model sonnet` → TDD; architetto → review. Ogni fix nasce da un test che riproduce il difetto.

## Gruppo A — dati che non si aggiornano (`fix(profile,friends): refresh after mutations`)

Sintomo comune: una mutazione va a buon fine ma la UI mostra il dato vecchio finché non si chiude e riapre l'app. Causa probabile: cache TanStack Query non invalidata dopo la RPC e nessun refetch al ritorno in primo piano.

1. **Profilo — numero di telefono**: dopo il salvataggio, il numero non compare (o "non resta salvato") finché non si riavvia l'app. Dopo `onSuccess` della mutazione invalidare la query del profilo; il form deve mostrare il valore salvato senza riavvio.
2. **Richiesta di follow accettata**: chi ha inviato la richiesta continua a vederla "in attesa" e non vede la persona tra i seguiti finché non riavvia. Invalidare le query `following`/`search`/`map friends` quando: (a) si torna in primo piano (`AppState` → `refetchOnWindowFocus`/`focusManager`), (b) si apre la tab Amici. Lo stesso lato ricevente dopo Accetta/Rifiuta.
3. **Regola generale**: ogni mutazione (dichiarazione, follow, like, commento, profilo) invalida le query che dipendono dal dato; un test per ciascuna. Configurare una sola volta `focusManager` di TanStack Query su `AppState` in `src/lib/` (test con `AppState` mockato).

## Gruppo B — mappa (`fix(map): own declaration and hot spots`)

1. **"Nella mappa non compare dove va l'utente"**: la mia dichiarazione di stasera deve essere sempre visibile a me, indipendentemente da k: il venue dichiarato ha un marker/etichetta "Ci vai" (o "Forse") in entrambe le viste e la card in basso lo propone per primo. Il dato arriva da `get_my_declaration` (esiste già): non serve cambiare `get_city_map`.
2. **"Nella mappa generale non si vedono gli utenti"**: è **voluto** che non si vedano le persone (principio 1 e 2): la mappa generale mostra solo aggregati a fasce. Verificare però che gli **hot spot** vengano disegnati: con `supabase/dev-data/demo_activity.sql` caricato, `get_city_map('milano','general')` restituisce 3 venue con `is_hot_spot = true` (verificato il 13 nov). Se il client riceve `is_hot_spot` e non li disegna, è un bug da correggere con test sul riduttore della mappa. Se li disegna, il "vuoto" è dovuto ai pochi dati reali e si risolve con lo strato "di solito" (CSV manuale, principio 11) e con la crescita degli utenti: **nessuna** altra fonte è ammessa (niente Popular times).
3. La vista **amici** resta com'è: solo dove vanno i seguiti con follow accettato.

## Gruppo C — condivisione (`fix(profile): hide share until web links work`)

"Condividi il mio @tag" apre un link `https://rightplace.app/u/<handle>` che risponde 404 (vedi `docs/deep-links.md`: dominio e file di associazione non ancora attivi). Nascondere il bottone dietro il flag `EXPO_PUBLIC_SHARE_ENABLED` (stesso schema di `EXPO_PUBLIC_CREATOR_ENABLED`: `zod` in `env.ts`, default spento, regola pura in `domain/`, test con flag acceso/spento). Il codice resta; si riattiva quando il dominio è pronto (prompt 17).

## Gruppo UI — miglioramenti piccoli (`fix(ui): phone icon and handle change`)

1. In "Andare e tornare" sostituire la parola "Chiama" con l'icona cornetta (tap target ≥ 44, `accessibilityLabel` tradotto).
2. "Non posso cambiare nome": l'handle è **rigenerabile una volta** (`CLAUDE.md`, RPC `regenerate_handle` esiste già): non si sceglie, si estrae un altro `@animale.colore`. Verificare che nel profilo in-app ci sia il punto d'ingresso con il testo "Puoi cambiarlo una sola volta"; se manca, aggiungerlo. Il nome mostrato è e resta l'handle; un nome libero non è previsto (principio 1).

## Fuori da questo pacchetto

- "Non vedo le notifiche con l'app aperta", "non vedo le notifiche della chat", "non vedo se qualcuno ha scritto o messo un cuore" → prompt **15** (notifiche e indicatori in-app).
- "Nella chat non vedo i messaggi dei follower di follower" → prompt **19** (cambio di regola, richiede migration).

## Definition of Done

- [ ] Salvo il telefono nel profilo → compare subito; riapro la schermata → c'è ancora
- [ ] A invia richiesta, B accetta → A vede B tra i seguiti al ritorno in primo piano, senza riavvio
- [ ] Dichiaro un locale → sulla mappa (entrambe le viste) il locale è marcato "Ci vai"
- [ ] Con i dati demo caricati la mappa generale di Milano mostra 3 hot spot
- [ ] Con `EXPO_PUBLIC_SHARE_ENABLED` assente il bottone di condivisione non esiste; con `true` c'è
- [ ] Un test per ogni fix, scritto prima; lint/typecheck/test verdi; stringhe in `it` e `en`
- [ ] Un commit per gruppo, messaggi `fix(...)`
