# 16 — Moderazione UGC, audit privacy/GDPR, QA

Leggi `CLAUDE.md` (tutti i principi). Questo prompt è **bloccante per il rilascio**: un'app con contenuti generati dagli utenti (foto, chat, commenti) viene rifiutata da Apple (linea guida 1.2) senza moderazione, e un trattamento dati di questa portata richiede documentazione GDPR seria. Produce `docs/qa-report.md`, `docs/privacy-policy.md` (it/en), `docs/terms.md` (it/en), `docs/moderation-policy.md`, `docs/dpia.md`.

> **Ruoli e metodo**: l'**architetto** conduce audit e documenti; lo **sviluppatore** implementa in TDD gli strumenti di moderazione e i fix; review finale dell'architetto. Per l'audit privacy l'architetto deve essere un modello che **non ha scritto il codice in questa sessione** (apri una sessione nuova).

## A. Moderazione (requisito store)

1. **Segnala** disponibile su: post, commento, messaggio chat, utente, serata (già predisposto nei prompt 9–12): sheet con motivi (spam, nudità, odio, molestie, minore, altro + testo) → `report`.
2. **Blocca** utente (bidirezionale, già server-side) raggiungibile da ogni contesto; lista bloccati nel profilo.
3. **Filtro automatico foto**: Edge Function `moderate-image` chiamata **prima** di rendere visibile un upload (post e chat): usa un servizio di classificazione (es. Sightengine free tier, o il modello di visione Claude con prompt "classifica nudità/violenza/minori: sì/no") → se `flagged`, il contenuto resta `hidden` e l'autore riceve un messaggio; log in `moderation_log`.
4. **Filtro testo**: liste parole/regex **IT e EN** in DB per chat/commenti/caption/nome serata; `hidden` + segnalazione automatica, non blocco silenzioso.
5. **Coda di moderazione**: pagina web minima protetta (Supabase dashboard + view `moderation_queue`, oppure una route `/admin` in una piccola app Next.js/Expo web con ruolo `moderator` nei JWT claims) che mostra report aperti con anteprima, azioni **Rimuovi / Ignora / Blocca utente / Ban**; SLA documentato: **revisione entro 24 h**.
6. **Termini d'uso** con tolleranza zero per contenuti abusivi e meccanismo di espulsione (`profiles.banned_at` → policy RLS negano tutto).
7. **Contatto** per segnalazioni dall'esterno (email dedicata) in privacy e termini.

## B. Audit privacy (bloccante)

8. **Permessi**: `npx expo prebuild --no-install` in cartella temporanea; in `Info.plist`/`AndroidManifest` solo: location when-in-use, camera, photo library, contacts, notifications, internet. **Assenti**: location always/background, microphone, bluetooth, AD_ID.
9. **Rete**: 10 minuti d'uso con logger → host contattati solo: Supabase, Google Maps tiles (Android), Expo (updates/push), Sentry, PostHog EU, RevenueCat, store. Places e Anthropic **non** compaiono (passano dal server).
10. **Payload**: 20 eventi PostHog + 3 Sentry: nessun handle, email, posizione, genere, età, foto URL; `distinct_id` = uuid. Sentry `sendDefaultPii: false`, `beforeSend` che scarta URL firmati e corpi di richiesta.
11. **Database** (come service role): `profiles` non contiene mai posizione precisa, numeri di telefono o hash dopo il matching; `contact_hashes_tmp` è vuota a riposo; verifica che `coarse_location` sia a griglia 0.005°.
12. **RLS smoke test** dal client con due account: select diretta su `profiles`, `declarations`, `posts`, `chat_messages`, `follows` altrui → solo righe permesse; insert in `invite/subscriptions/reports` fuori policy → rifiutati.
13. **k-anonimato**: ripeti i pgTAP del prompt 04 su **prod** con dati sintetici; prova a inferire un singolo utente combinando segmenti (es. "Forse" con 3 persone e "Tutti" con 4 → la differenza rivela 1 persona?): l'architetto documenta la **regola di non-differenza** e, se necessario, alza la soglia dei segmenti o nasconde "Tutti" quando un segmento è < 3.
14. **TTL**: forzando le date, chat (2 gg), post (7 gg), hash contatti (10 min), posizione (3 h), cronologia (20) vengono cancellati dai job, inclusi i file Storage.
15. **Diritti**: `delete_my_account` cancella tutto entro 24 h (verifica Storage e `auth.users`); **export dati** (`export_my_data` → JSON via Edge Function, link firmato 24 h) richiesto dal GDPR art. 20.
16. **Documenti** in italiano e inglese: privacy policy (titolare Bitsharp; dati trattati per categoria con base giuridica e conservazione; sub-processor: Supabase EU, Google Places/Maps, Expo, Sentry, PostHog EU, RevenueCat, Apple, Google, Anthropic, Resend, Cloudflare, servizio moderazione immagini; età minima 18; diritti e contatto), termini, **DPIA** (valutazione d'impatto: posizione, genere, minori, profilazione implicita da cronologia ricerca), registro trattamenti. Luca li fa rivedere a un consulente prima della pubblicazione. Il lancio è in Italia: verificare gli obblighi del Garante Privacy (informativa, tracker, eventuale consultazione preventiva sulla DPIA) oltre al GDPR.
17. **Age gate**: 18+ verificato con data di nascita; copy e store rating 17+/18+.

## C. Qualità

18. Coverage ≥ 70 % su `src/features/*`; pgTAP tutti verdi; e2e **Maestro**: `signup → profilo → ricerca → dichiara → chat → post → feed`, e `creator → serata → sponsorizza (sandbox)`.
19. Device: iPhone fisico, iPhone SE simulato, Android fisico, emulatore API 30 low-end; safe area, tastiera, notch.
20. Offline/rete lenta: nessuno spinner infinito; upload foto riprende o fallisce con retry.
21. **Lingue**: `npm run i18n:check` pulito; screenshot di tutte le schermate in IT e EN confrontati (testi inglesi più corti/lunghi non rompono i layout); date, orari, plurali corretti in entrambe.
22. Accessibilità: label su tutto, contrasto ≥ 4.5:1 (viola/ciano su dark: verificare le label piccole in Space Mono `#A3A1B8` su `#15151F`), Dynamic Type fino a Large, target ≥ 44.
23. Performance: cold start → mappa < 2.5 s su Android low-end; lista feed con 50 post fluida; bundle size riportato.
24. Crash-free 30 minuti con Sentry attivo.

## Definition of Done

- [ ] `docs/qa-report.md` con esito di A1–C24
- [ ] Sezione A completa: segnala/blocca ovunque, filtro foto e testo attivi, coda di moderazione funzionante, SLA scritto
- [ ] Sezione B tutta verde; `docs/privacy-policy.md`, `terms.md`, `moderation-policy.md`, `dpia.md` pronti per revisione legale
- [ ] `export_my_data` e `delete_my_account` verificati end-to-end
- [ ] Maestro verde su iOS e Android
- [ ] Commit: `chore(16): moderation tools, privacy audit, qa`
