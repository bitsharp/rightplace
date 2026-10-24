# 09 — Amici: cerca per @tag, richieste di follow con accettazione, contatti hashati

Leggi `CLAUDE.md` (principi 1, 4, 6). Mock-up: `Amici.dc.html`. Backend: `follows` (con `status`), `blocks`, RPC `search_users`, `request_follow`, `cancel_follow_request`, `accept_follow`, `decline_follow`, `unfollow`, `remove_follower`, `get_follow_requests`, `match_contacts`, `set_my_phone_hash`.

> **Ruoli e metodo**: architetto → piano/interfacce/test; `/model sonnet` → TDD; architetto → review.

## Obiettivo

Tab Amici: cerca persone per `@tag`, **manda una richiesta di follow**; chi la riceve la accetta o rifiuta, e solo da quel momento vedi dove va stasera, i suoi post e la sua chat (modello Instagram con account privati). Suggerimenti dai contatti (opt-in) senza mai inviare numeri o nomi al server.

## Istruzioni

1. **`app/(tabs)/friends.tsx`** fedele a `Amici.dc.html`:
   - campo con prefisso `@` fisso; contatore "Segui N persone";
   - risultati `FriendRow`: avatar (iniziale, colore dall'hash dell'handle), `@tag`, meta "18–24 · Donna", riga venue "Stasera: Arena Club" **solo se il follow è accettato** (il server già lo garantisce); bottone a tre stati da `follow_state`: **Richiedi** (`none`) → **Richiesta inviata** (`pending`, tap = ritira) → **Seguito** (`accepted`, tap = smetti di seguire con conferma); se `follows_me` e io non lo seguo, etichetta "Ti segue" accanto al bottone; empty state "Nessun utente con questo tag.";
   - senza query: in cima sezione **Richieste** (`get_follow_requests`, badge con il conteggio nella tab bar): riga con handle + meta + **Accetta / Rifiuta**; poi lista dei seguiti; poi sezione **Suggeriti dai contatti** (se opt-in). Nel profilo: lista **I tuoi follower** con azione "Rimuovi" (silenziosa).
   - copy chiaro sul perché: sotto il campo di ricerca, hint "Chi accetta la tua richiesta ti mostra dove va e cosa posta."
   - menu lungo-tap su una riga: Blocca / Segnala (→ `block_user`, `report`).
2. **Richiesta / accettazione** con optimistic update e haptic: `request_follow` e `cancel_follow_request` aggiornano solo `follow_state` nella lista; `accept_follow` invalida `['followers']` e la richiesta sparisce; quando **io** vengo accettato (realtime su `follows` dove `follower_id = me` o al refetch), invalida `['cityMap', 'friends']`, `['feed']`, `['stories']`, `['venueStats']`, `['friends']`. Mai mostrare dati di un seguito prima che il server confermi `accepted`.
3. **Contatti (opt-in)** `src/features/friends/contacts.ts`:
   - permesso `expo-contacts` solo quando l'utente attiva il toggle (profilo) o tocca "Trova amici dai contatti";
   - normalizza i numeri in **E.164** (prefisso default dal paese del device o della città: `+39` per Milano), scarta non validi, **hash SHA-256** con `expo-crypto` di ogni numero + salt pubblico dell'app (`EXPO_PUBLIC_CONTACTS_SALT`), invia solo gli hash a `match_contacts` in batch ≤ 500;
   - mostra i match come suggerimenti; i nomi dei contatti restano **solo sul device** (si può mostrare "dalla tua rubrica: Marco" accanto all'handle, ma non lasciano il telefono).
   - per **farsi trovare**: all'attivazione del toggle, l'utente inserisce il proprio numero (mai salvato in chiaro) → `set_my_phone_hash(hash)`; disattivando → `clear_my_phone_hash`.
4. **Blocchi**: utente bloccato scompare da ricerca, feed, chat, statistiche amici in entrambe le direzioni (server-side, prompt 04); UI: lista "Bloccati" nel profilo con Sblocca.
5. **Deep link** `rightplace://u/<handle>` e `https://rightplace.app/u/<handle>` → apre la ricerca con il profilo pubblico minimo (handle, fascia, genere) e il bottone **Richiedi**; bottone "Condividi il mio @tag" nel profilo (`Share.share`). È il modo previsto per farsi seguire da amici conosciuti offline.
6. **Test**: normalizzazione E.164 (casi: `345 123 4567`, `+39 345 1234567`, `0039…`, fissi `02 …`, numeri esteri, stringhe sporche); hashing deterministico; batching; `FriendRow` mostra il venue solo con `follow_state='accepted'`; i tre stati del bottone e le transizioni; sezione Richieste con Accetta/Rifiuta; richiesta optimistic + rollback; badge conteggio.

## Definition of Done

- [ ] Cerco `@volpe` → risultati con handle, fascia, genere e **nessun** venue; Richiedi → "Richiesta inviata"; l'altro utente vede la richiesta in Richieste e accetta → la persona compare in Mappa amici, feed e storie; finché è `pending` non compare da nessuna parte
- [ ] Rifiuto o Rimuovi follower → l'altro torna a non vedere nulla di mio (verificato anche con select diretta come quell'utente)
- [ ] Il venue di stasera di una persona è visibile solo dopo che ha accettato la mia richiesta
- [ ] Con contatti attivi: in rete (`react-native-network-logger`) partono solo hash di 64 caratteri, nessun numero né nome
- [ ] Bloccare un utente lo rimuove ovunque; sbloccarlo lo riporta
- [ ] Link `rightplace.app/u/<handle>` apre il profilo
- [ ] Test scritti prima; nessun `any`
- [ ] Tutte le stringhe nuove esistono in `it` e `en` (`npm run i18n:check` pulito) e le schermate sono state provate in entrambe le lingue
- [ ] Commit: `feat(09): friends search, follow, hashed contacts`
