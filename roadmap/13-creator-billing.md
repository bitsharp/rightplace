# 13 — Abbonamento creator (RevenueCat) e serate sponsorizzate

Leggi `CLAUDE.md`. Mock-up: `Abbonamento.dc.html`, `CreatorProfilo.dc.html` (sezione Piano). Backend: `subscriptions`, `events.is_sponsored`, Edge Function `revenuecat-webhook`.

> **Ruoli e metodo**: l'architetto decide il flusso di pagamento e lo stato; `/model sonnet` implementa in TDD; review dell'architetto. **Questo prompt richiede un dev client**: coordinati con Luca per 1 build iOS cloud + 1 Android locale (vedi `CLAUDE.md`, Budget EAS).

## Perché RevenueCat e in-app purchase

L'abbonamento sblocca una funzione **dentro l'app** (mettere in evidenza le proprie serate). Apple (linea guida 3.1.1) e Google lo trattano come contenuto digitale: va venduto con acquisto in-app, non con Stripe nell'app. RevenueCat unifica StoreKit 2 e Play Billing, gestisce ricevute, rinnovi, annullamenti e un webhook per aggiornare il nostro DB. Costo: 0 fino a 2.500 $/mese di ricavi.

## Istruzioni

1. **Prodotti negli store** (manuale, Luca): in App Store Connect e Play Console crea l'abbonamento `creator_monthly` (e opzionale `creator_yearly`) con **prezzo [PREZZO]** da decidere; in RevenueCat: entitlement `creator_pro`, offering `default` con i due pacchetti. Nessun prezzo hardcoded nell'app: arriva da RevenueCat.
2. **Installazione**: `react-native-purchases` + `react-native-purchases-ui` (paywall opzionale, ma qui la UI è nostra). Config plugin → serve il **dev client**: `eas build --profile development` iOS (cloud, 1 build) e Android (`--local`). Da qui lo sviluppo avviene nel dev client, non più in Expo Go.
3. **`creator/billing.tsx`** fedele a `Abbonamento.dc.html`: label `CREATOR · ABBONAMENTO`, "Scegli il tuo piano", `PlanCard` per ogni pacchetto dell'offering (nome, prezzo localizzato da RevenueCat, "Descrizione dei vantaggi": serate in evidenza su mappa e ricerca, notifiche sulle adesioni), scelta, `Paga e attiva il piano` → `Purchases.purchasePackage`; nota "Dopo il pagamento compare un messaggio di conferma e puoi pubblicizzare la serata." Gestione: annullato dall'utente, pending (Ask to Buy), errore store, **Ripristina acquisti**.
4. **Stato abbonamento**: fonte di verità = entitlement `creator_pro` in `CustomerInfo` (client) **e** tabella `subscriptions` aggiornata dal webhook (server). `useSubscription()` combina i due: la UI usa il client per reattività, le RPC usano il DB per autorizzare.
5. **Edge Function `revenuecat-webhook`**: verifica `Authorization` con `REVENUECAT_WEBHOOK_SECRET`, mappa gli eventi (`INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`) su `subscriptions.status/current_period_end`; idempotente per `event.id`. `app_user_id` di RevenueCat = `auth.uid()` (chiama `Purchases.logIn(uid)` dopo il login).
6. **Profilo creator — sezione Piano** fedele a `CreatorProfilo.dc.html`: "Piano {nome}", badge **Attivo / Annullato**, "{prezzo} al mese", "Rinnovo il {data}" / "Attivo fino al {data}", **Cambia piano** (→ billing), **Annulla abbonamento** → sheet di conferma "Vuoi annullare l'abbonamento? Resta attivo fino al {data} e poi non potrai più pubblicizzare le serate." → **Mantieni / Conferma annullamento**. L'annullamento reale avviene nelle impostazioni dello store: apri `Purchases.showManageSubscriptions()` e mostra lo stato "Abbonamento annullato. Non verrà rinnovato." quando il webhook lo conferma; **Riattiva abbonamento** → di nuovo lo store.
7. **Sponsorizzazione**: nel form serata e in `EventRow`, toggle **"Metti in evidenza"** disponibile solo con entitlement attivo → RPC `sponsor_event(event_id)` che verifica `subscriptions` lato server e imposta `is_sponsored = true`, `sponsored_until = ends_at`. Effetti (già previsti nei prompt 06/07): label `SPONSORIZZATA`, prima posizione in ricerca, `SponsoredCard` in mappa. Limite: 1 serata in evidenza alla volta per creator (si può spostare).
8. **Test**: riduttore dello stato abbonamento (CustomerInfo + DB → `active|cancelled|expired|none`), mapping eventi webhook → stato (test Deno), idempotenza, `sponsor_event` rifiuta senza abbonamento (pgTAP), UI mostra i prezzi dall'offering mockato.

## Definition of Done

- [ ] Acquisto sandbox (Apple sandbox tester / Google license tester) completato: entitlement attivo nell'app e riga in `subscriptions` via webhook entro pochi secondi
- [ ] Annullamento in sandbox → stato "Annullato… attivo fino al" → dopo la scadenza (sandbox accelera) la sponsorizzazione decade
- [ ] Senza abbonamento `sponsor_event` è rifiutato server-side anche chiamandolo a mano
- [ ] "Ripristina acquisti" riattiva l'entitlement su un secondo device
- [ ] Nessun prezzo o product id hardcoded fuori dalla config RevenueCat
- [ ] Build usate: 1 iOS cloud, 0 Android cloud (`eas build:list`)
- [ ] Test scritti prima; nessun `any`
- [ ] Tutte le stringhe nuove esistono in `it` e `en` (`npm run i18n:check` pulito) e le schermate sono state provate in entrambe le lingue
- [ ] Commit: `feat(13): creator subscription via revenuecat and sponsored events`
