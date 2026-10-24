# 12 — Creator: profilo, crea serata, adesioni

Leggi `CLAUDE.md`. Mock-up: `CreaSerata.dc.html`, `CreatorProfilo.dc.html` (sezione "Le tue serate"), `Profilo.dc.html` ("Sono un creator"). Backend: `events`, RPC `create_event`, `get_my_creator_events`, `get_event_attendance`.

> **Ruoli e metodo**: architetto → piano/interfacce/test; `/model sonnet` → TDD; architetto → review.

## Obiettivo

Un utente creator pubblica serate (evento in un locale, con orario e pubblico target); gli utenti le trovano in mappa e ricerca, le dichiarano come un locale; il creator vede le adesioni a fasce. La sponsorizzazione (evidenza) arriva nel prompt 13.

## Istruzioni

1. **Diventare creator**: toggle "Sono un creator" nell'onboarding/profilo → `is_creator = true`; nel profilo compare "Il tuo profilo creator" → `creator/index.tsx`.
2. **`creator/index.tsx`** fedele a `CreatorProfilo.dc.html` (parte serate; la parte Piano arriva nel prompt 13 ma predisponi lo slot): header `PROFILO CREATOR` con handle; sezione **Le tue serate** con `Nuova serata`, segmented **In programma / Passate**, `EventRow` (nome, "Arena Club · Club", quando, `SI {band}` `FORSE {band}` · target "18–24 · Tutti"), nota "Le adesioni sono fasce, non singole persone."
3. **`creator/new-event.tsx`** fedele a `CreaSerata.dc.html`: label `CREATOR · NUOVA SERATA`; **Luogo** (picker sui venue della città, con ricerca), **Nome della serata**, **Descrizione** (max 500), **Orario** (inizio/fine; fine default +6 h; fine ≤ 06:00 del giorno dopo), **Per chi**: chip multi-select età (18–24, 25–34, 35+) e genere (Tutti / Donne / Uomini); `Pubblica la serata` → `create_event`. Validazione `zod`, errori inline. Limite: 10 serate attive per creator (anti-spam).
4. **Lato utente**: gli eventi compaiono in Ricerca (riga con badge data/ora) e in mappa (hot spot con bordo tratteggiato o icona "serata", ancora senza evidenza sponsorizzata); `event/[id].tsx` riusa il dettaglio locale (prompt 08) con nome serata, descrizione, orario, target, locale sotto; dichiarazione su `event_id`; chat di serata legata all'evento.
5. **Adesioni**: `get_event_attendance` restituisce fasce e, se ≥ 3, età media e % genere; **mai** l'elenco dei partecipanti (nemmeno al creator).
6. **Modifica/annulla serata**: il creator può modificare testo/orario fino all'inizio e annullare (soft delete con notifica ai dichiarati nel prompt 15).
7. **Test**: validazione form (orari, limiti, target vuoto → "Tutti"), mapping target → array, `EventRow` con fasce, limite 10 attive, dettaglio evento vs dettaglio locale.

## Definition of Done

- [ ] Un creator crea una serata; un altro utente la trova in ricerca e mappa, la dichiara, entra nella sua chat
- [ ] Il creator vede le adesioni a fasce e, con ≥ 3, età media e genere; con < 3 "pochi" e statistiche nascoste
- [ ] Il creator non può in alcun modo vedere chi ha aderito (verifica via RPC e select)
- [ ] Modifica e annullamento funzionano; l'11ª serata attiva viene rifiutata
- [ ] Test scritti prima; nessun `any`
- [ ] Tutte le stringhe nuove esistono in `it` e `en` (`npm run i18n:check` pulito) e le schermate sono state provate in entrambe le lingue
- [ ] Commit: `feat(12): creator profile and events`
