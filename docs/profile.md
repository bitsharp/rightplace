# Profilo in stile Instagram e foto profilo

Schermata 13 (`ProfiloApp.dc.html`), riletta nel formato "profilo Instagram": foto, contatori, e sotto i post.

## Cosa vede chi

| Chi guarda                                                       | Foto profilo    | Contatori (post, follower, seguiti) | Griglia dei post                             | Elenchi follower / seguiti |
| ---------------------------------------------------------------- | --------------- | ----------------------------------- | -------------------------------------------- | -------------------------- |
| Io                                                               | sì              | sì                                  | tutti i miei post attivi                     | sì (dai contatori)         |
| Follow accettato con il proprietario, in una delle due direzioni | sì              | sì                                  | solo i post già nella finestra "giorno dopo" | no, solo i numeri          |
| Richiesta in attesa, sconosciuto                                 | no (l'iniziale) | `null` (trattino)                   | lucchetto "Profilo privato"                  | no                         |
| Bloccato in una direzione qualsiasi                              | no              | profilo "non trovato"               | niente                                       | no                         |

La regola vive nel database, non nel client:

- `private.can_see_avatar(viewer, owner)` e `get_avatar_paths(user_ids)` decidono chi può avere un URL della foto. La Edge Function `avatar-urls` firma (1 ora) solo i path restituiti da `get_avatar_paths`, col JWT dell'utente. Il bucket `avatars` è privato e senza policy di lettura. La foto non compare in `public_profiles`, nelle ricerche (`search_users`) né in nessuna RPC di elenco: i client la chiedono sempre alla funzione di firma, in un'unica richiesta per elenco.
- `get_profile_summary(user_id)` restituisce l'identità pubblica a chiunque e i conteggi solo a me e ai follower accettati (principio 6). Un conteggio `null` non è mai trasformato in zero dal client.
- `get_user_posts(user_id, …)` usa `private.visible_posts()`, la stessa fonte di feed e storie: post attivi (7 giorni, principio 5), mai oltre un blocco.

"Seguire" nel codice è sempre follow accettato. La foto di una persona (decisione del 20/11/2026) si vede solo se c'è un legame, cioè un follow accettato in una delle due direzioni (`private.is_linked`): i follower accettati del proprietario e le persone che il proprietario segue. Nell'elenco dei miei follower vedo quindi la foto di tutti, perché ognuno ha un follow accettato verso di me. Richieste in attesa, sconosciuti e qualunque blocco mostrano l'iniziale.

## Foto: file e cache

- Ritaglio quadrato dal selettore di sistema (`allowsEditing`, `aspect [1, 1]`), poi `preparePhoto` a 512 px JPEG: ricodificare toglie l'EXIF (posizione compresa, principio 3). Caricamento in `avatars/<uid>/<uuid>.jpg`, poi `set_avatar(path)`; il file precedente va in `private.storage_deletion_queue` e `storage-gc` lo cancella.
- Le URL firmate cambiano a ogni richiesta: `expo-image` le tiene solo in memoria (`cachePolicy: 'memory'`, chiave = id utente), le query hanno `meta: { persist: false }` e `staleTime` di 50 minuti. Nessuna foto altrui va su disco.
- Eliminazione account: `delete_my_account()` accoda l'avatar e azzera `avatar_path`.

## Foto degli amici su mappa e liste: se non si vede

- **Vedo l'iniziale**: è il comportamento corretto quando la persona non ha caricato una foto o non c'è un follow accettato con me in nessuna delle due direzioni (`private.is_linked`), oppure c'è un blocco. Il server non firma l'URL e il client non può "indovinarlo".
- **Vedo l'iniziale ma la foto c'è e il legame c'è**: sui marker della mappa la bitmap viene congelata; `MapMarkers` tiene il tracking acceso finché le foto dei volti non hanno chiamato `onLoad`/`onError` (tetto 3 s, `PHOTO_WAIT_MS`). Se la rete è lenta oltre il tetto, il marker resta con l'iniziale fino al prossimo cambio di contenuto.
- Gli URL sono in cache per singolo utente (50 minuti, solo memoria, `['avatarUrls','user',id]`): dopo cambio o rimozione foto vengono dimenticati. Una lista con più di 100 persone si divide in più richieste a `avatar-urls`.

## Moderazione (principio 7)

Nessuna superficie nuova da moderare in modo diverso:

- la foto profilo è visibile solo a chi ha con me un follow accettato in una delle due direzioni; **segnala utente** (`report('user', id)`) e **blocca** esistono già e dal profilo pubblico si raggiungono con "Segnala o blocca" (e con il tocco lungo sulle liste). Un blocco nasconde subito la foto in entrambe le direzioni;
- sui post della griglia il tocco lungo apre le stesse azioni del feed (segnala, blocca autore, elimina il proprio);
- il filtro automatico sulle foto, la rimozione entro 24 ore e i termini di tolleranza zero restano nel prompt 16 e valgono anche per `avatars` quando verrà fatto (da collegare lì: oggi nessun filtro automatico controlla le foto profilo).

## Navigazione

- `/profile` (tab): barra in alto (anche nella tab Chat, per l'icona feedback), avatar (tocco = Cambia foto / Rimuovi), "N post · N follower · N seguiti", Modifica profilo, Condividi (solo con `EXPO_PUBLIC_SHARE_ENABLED`), griglia a 3 colonne con paginazione a cursore (30 per pagina).
- `/profile/edit`: tutto il form di prima (foto, @tag, data, genere, posizione, contatti, lingua, città, notifiche, telefono, condividi, bloccati, link creator, account).
- `/profile/map-view` ("Mappa all'avvio"): preferenza `defaultView` (`general` di default, oppure `friends`) nello store `rightplace.map` (v3; ogni stato precedente riparte dalla generale). La vista corrente `view` non è persistita: a ogni avvio vale `defaultView`, e il selettore Mappe/Amici sulla mappa cambia solo la sessione in corso. Scegliere la preferenza sposta anche la vista corrente, finché il selettore non è stato usato in questa sessione.
- `/profile/followers` (con "Rimuovi") e `/profile/following` (segui già / richiesta, tocco lungo per segnalare o bloccare).
- `/u/<handle>`: stesso layout, con Segui / Richiesta inviata / Segui già.
- Tocco su una miniatura con foto: `PhotoViewer` che scorre tra le foto dei post caricati. Su un post solo testo: foglio con la didascalia intera.
