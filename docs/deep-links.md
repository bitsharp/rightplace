# Deep link del profilo pubblico

Il bottone "Condividi il mio @tag" nel profilo condivide due link con il solo handle:

- `rightplace://u/<handle>`: funziona già grazie a `scheme: 'rightplace'` in `app.config.ts`. Apre la route `app/u/[handle].tsx` (`PublicProfileScreen`): handle, fascia d'età, genere e il bottone **Richiedi**. Un handle inesistente mostra lo stato vuoto.
- `https://rightplace.app/u/<handle>`: **non ancora attivo**. Per aprire l'app serve:
  1. **iOS, Associated Domains**: `ios.associatedDomains: ['applinks:rightplace.app']` in `app.config.ts` e il file `https://rightplace.app/.well-known/apple-app-site-association` che elenca il path `/u/*` per l'app (Team ID + bundle `it.bitsharp.rightplace`).
  2. **Android, App Links**: `intentFilters` con `autoVerify: true` per `https://rightplace.app/u/*` e il file `https://rightplace.app/.well-known/assetlinks.json` con il fingerprint SHA-256 del certificato di firma.
  3. Una **nuova build nativa** (cambia la config nativa: non basta `eas update`). Va concordata con Luca per il budget EAS.
  4. Una pagina web di ripiego su `rightplace.app/u/<handle>` per chi non ha l'app (store link).

Finché non sono fatti, il link web condiviso si apre nel browser, non nell'app.

Il server non rivela nulla in più al link: la route usa `search_users(handle)` con corrispondenza esatta, quindi vale la stessa privacy della ricerca (principio 6).
