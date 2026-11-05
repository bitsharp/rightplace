# Contatti: cosa parte dal telefono e cosa no

Il principio 4 di `CLAUDE.md` in pratica. Vale per "Trova amici dai contatti" (`src/features/friends/contacts.ts`) e per "Farsi trovare" nel profilo (`src/features/friends/useFindMeByPhone.ts`).

## Cosa viene inviato

- **Solo hash SHA-256 in esadecimale minuscolo (64 caratteri)**, mai numeri né nomi. Il server rifiuta qualsiasi altra forma (`INVALID_HASH`) e `match_contacts` richiede `contacts_opt_in` attivo.
- L'input dell'hash è `salt + ':' + numero E.164` (esempio: `rightplace.contacts.v1:+393451234567`). Il numero è normalizzato da `toE164` (`src/features/friends/domain/phone.ts`) senza librerie esterne: IT e ES con regole proprie, altri paesi solo con prefisso internazionale esplicito.
- Le chiamate sono a blocchi da 500 hash (`CONTACTS_BATCH_SIZE`), deduplicate. Il server cancella gli hash inviati prima di rispondere e non li conserva dopo il matching.
- "Farsi trovare" invia **un solo hash**, quello del proprio numero, con `set_my_phone_hash`. Disattivare il toggle contatti nel profilo (e salvare) o toccare "Non farmi più trovare" lo cancella (`clear_my_phone_hash`).

## Cosa resta sul telefono

- Numeri e nomi della rubrica. L'app chiede a `expo-contacts` **solo i numeri** (`Fields.PhoneNumbers`) e non legge mai i nomi. Per questo i suggerimenti mostrano "Dalla tua rubrica" senza il nome del contatto: `match_contacts` non restituisce l'hash corrispondente (per progetto, nessuna colonna di output con "hash"), quindi non si può attribuire un nome a un match senza una RPC nuova.
- Il numero che l'utente digita in "Farsi trovare": viene normalizzato, hashato e subito scartato. Non finisce in zustand, AsyncStorage né nella cache di React Query.
- I suggerimenti trovati vivono solo nel risultato della mutazione in memoria.

## Il permesso

Il permesso contatti si chiede solo quando l'utente tocca "Trova amici dai contatti" (che compare solo con il toggle contatti attivo nel profilo). Nessuna lettura in background.

## Il salt

`CONTACTS_HASH_SALT = 'rightplace.contacts.v1'` (`src/features/friends/domain/hash.ts`) è **pubblico e versionato**: non è un segreto, serve solo a evitare che gli hash coincidano con una tabella SHA-256 generica. Cambiarlo invalida tutti gli hash già salvati in `phone_hashes`: servirebbe far reinserire il numero agli utenti (o una migrazione che cancelli la tabella) e rilasciare client e server insieme. Per questo il valore è una costante e non una variabile d'ambiente.

## Limite noto

Lo spazio dei numeri di telefono è piccolo: un hash SHA-256 (anche con salt pubblico) è invertibile per forza bruta da chi ottiene la tabella `phone_hashes` o intercetta una richiesta. La tabella non è leggibile dai client (RLS, test pgTAP 11) e le richieste viaggiano su TLS, ma non è una protezione crittografica forte.

Mitigazione futura: HMAC lato server con un segreto custodito in una Edge Function (secret Supabase). Il client invierebbe il numero normalizzato alla funzione, che calcola l'HMAC e interroga il database; così l'hash non è calcolabile senza il segreto. Richiede una decisione architetturale (nuova Edge Function e migrazione degli hash esistenti) e non è inclusa nel prompt 09.
