# 14 — "Chiedi all'AI": informazioni sulla serata

Leggi `CLAUDE.md`. Mock-up: sezione "Chiedi all'AI · INFO SULLA SERATA" in `Serata.dc.html`. Backend: Edge Function `ask-ai`.

> **Ruoli e metodo**: architetto → prompt di sistema, contratto I/O, limiti di costo; `/model sonnet` → TDD; architetto → review.

## Obiettivo

Tre domande rapide sul locale/serata ("Che musica fanno?", "C'è un dress code?", "A che ora conviene arrivare?") con risposte brevi generate da un modello Claude a partire **solo** da dati che possediamo (venue, orari, tipo, descrizione dell'evento, affluenza a fasce). Niente invenzioni: se non sappiamo, l'AI lo dice.

## Istruzioni

1. **Edge Function `ask-ai`** (Deno):
   - input `{ target: {kind, id}, question_id: 'music'|'dress_code'|'best_time' | custom testo ≤ 200 char }`; richiede JWT utente valido;
   - raccoglie il **contesto** dal DB con service role: nome, tipo, orari, indirizzo, descrizione evento e target (se evento), fasce di affluenza SI/FORSE e orario corrente; **nessun dato personale** di alcun utente;
   - chiama l'API Claude (modello economico, `max_tokens` 200) con system prompt: rispondi nella lingua dell'utente (`profiles.locale`: italiano o inglese), in ≤ 60 parole, basandoti solo sul contesto fornito; se l'informazione non c'è, dillo e suggerisci come scoprirla (sito del locale, Google Maps); nessun link inventato;
   - **cache** in tabella `ai_answers (target_kind, target_id, question_id, locale, answer, created_at)` per 24 h sulle domande predefinite → la maggior parte delle richieste non costa nulla;
   - **rate limit**: 10 domande/utente/giorno (tabella `ai_usage`); risposta `429` con messaggio umano;
   - log costo stimato (token in/out) in `ai_usage`; alert se il totale giornaliero supera una soglia (env).
2. **Client**: in `Serata`/dettaglio locale, i 3 chip chiamano `ask-ai`; risposta in una card con icona AI, testo e disclaimer "Risposta generata automaticamente dai dati del locale"; campo "Altra domanda" (opzionale, stesso limite); stato di caricamento a scheletro; errori umani.
3. **Sicurezza**: la chiave Anthropic esiste solo nei secrets della Edge Function; il testo utente è passato come contenuto, mai concatenato nel system prompt; output mostrato come testo, mai renderizzato come link cliccabile a meno che non provenga dal nostro DB.
4. **Test** (Deno): costruzione del contesto (nessun campo personale), cache hit/miss, rate limit, troncamento domande; client: rendering risposta e stati.

## Definition of Done

- [ ] Le tre domande rispondono in < 3 s e la seconda richiesta della stessa domanda è servita da cache (verifica nei log)
- [ ] All'11ª domanda del giorno l'utente riceve il messaggio di limite
- [ ] Con un locale senza orari, "A che ora conviene arrivare?" risponde dichiarando l'assenza del dato
- [ ] `grep` del bundle client: nessuna chiave Anthropic
- [ ] Test scritti prima; nessun `any`
- [ ] Tutte le stringhe nuove esistono in `it` e `en` (`npm run i18n:check` pulito) e le schermate sono state provate in entrambe le lingue
- [ ] Commit: `feat(14): ask-ai edge function and ui`
