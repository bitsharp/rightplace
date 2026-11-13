# 19 — Chat di serata: amici e amici di amici

Leggi `CLAUDE.md` (principi 5, 6, 7) e `roadmap/10-night-chat.md`. Mock-up: `Chat.dc.html`. Backend: `private.can_see_chat_author`, `get_room_messages`, `get_my_chat_rooms`, `get_chat_photo_paths`.

> **Ruoli e metodo**: architetto → piano/interfacce/test pgTAP; `/model sonnet` → TDD; architetto → review (è un cambio di regola di privacy: review obbligatoria).

## Obiettivo

Decisione di prodotto (13 nov 2026): due persone che **non** si seguono ma che vengono alla stessa serata e hanno **un amico in comune presente alla stessa serata** devono potersi leggere e scrivere nella chat. Oggi vedo solo chi seguo (follow accettato) e me stesso.

## Regola (vive solo in SQL)

Definizioni, tutte su follow `accepted` e mai attraverso un blocco:

- `linked(a, b)`: esiste un follow accettato in **una delle due direzioni** tra `a` e `b`.
- Nella room R, io vedo l'autore X se: `X = me`, **oppure** `linked(me, X)`, **oppure** esiste `Y` **dichiarato nella stessa room R** tale che `linked(me, Y)` e `linked(Y, X)`.
- Se `is_blocked_pair(me, X)` è vero, X è invisibile sempre, anche con amici in comune.
- La regola vale in modo identico per messaggi, foto (`get_chat_photo_paths`), conteggio "N amici dentro", autocomplete `@` e anteprime in `get_my_chat_rooms`.

Perché "Y nella stessa room" e non un amico in comune qualunque: la ragione sociale è "c'è un amico in comune alla festa"; senza questo vincolo la cerchia visibile crescerebbe a tutta la rete a 2 salti e il principio 6 si svuoterebbe. Perché `linked` è simmetrico: chi mi segue (e che ho accettato) mi ha già dato fiducia; nella chat di una serata a cui veniamo entrambi la relazione è di fatto reciproca.

## Istruzioni

1. **Migration** `supabase/migrations/<ts>_chat_friends_of_friends.sql`:
   - `private.is_linked(a uuid, b uuid) returns boolean` (follow accettato in una direzione o nell'altra, no blocco).
   - `private.can_see_chat_author(p_room_id uuid, p_author uuid)` sostituisce la firma attuale: aggiunge il caso "amico in comune dichiarato nella room". Aggiorna i chiamanti (`get_room_messages`, `get_my_chat_rooms`, `get_chat_photo_paths`). `COMMENT ON FUNCTION` con la garanzia di privacy aggiornata.
   - Nessun cambio a tabelle o policy di scrittura.
2. **pgTAP prima** (`supabase/tests/`): A–B si seguono → visibili; A–C non si seguono, B dichiarato nella stessa room e linked con entrambi → A vede C; stesso caso ma B dichiarato in **un'altra** room → A non vede C; A ha bloccato C → invisibile anche con B; follow `pending` non conta; follow in direzione inversa conta.
3. **Client**: togliere il filtro lato client "solo seguiti" introdotto nel prompt 10 (punto 2, "Filtro lato client"): la UI mostra **tutto ciò che la RPC restituisce**; la regola non è più ricostruibile nel client. Autocomplete `@` sugli autori visibili nella room. Sottotitolo header: "Amici e amici di amici che vengono" (IT/EN); banner invariato.
4. **Prompt 15** (push chat) e **prompt 16** (moderazione): "da uno che seguo" diventa "da un autore che posso vedere nella room"; usare la stessa funzione SQL, mai una copia.
5. **Documentazione**: aggiornare `docs/night-chat.md` e il principio 6 in `CLAUDE.md` (già fatto nel commit di roadmap: verificare che il testo corrisponda a quanto implementato).

## Definition of Done

- [ ] pgTAP: i 6 casi sopra passano, scritti prima della migration
- [ ] Due utenti che non si seguono, con un amico in comune dichiarato nello stesso locale, si leggono e si scrivono in tempo reale; senza l'amico in comune non si vedono
- [ ] Il blocco prevale sempre
- [ ] Nessun filtro di visibilità nel client; `anon` non esegue nessuna RPC toccata
- [ ] Stringhe in `it` e `en`; lint/typecheck/test verdi
- [ ] Commit: `feat(19): night chat visible to friends of friends in the same room`
