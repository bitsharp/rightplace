begin;
\ir helpers/setup.psql
select plan(60);

-- ---------------------------------------------------------------- format rule (private.is_valid_handle)
select ok(private.is_valid_handle('lince.rosso'), 'handle generato valido');
select ok(private.is_valid_handle('lince.rosso42'), 'handle generato con cifre valido');
select ok(private.is_valid_handle('luca_97'), 'underscore e cifre ammessi');
select ok(private.is_valid_handle('abc'), 'minimo 3 caratteri');
select ok(private.is_valid_handle('a2345678901234567890'), 'massimo 20 caratteri');
select ok(not private.is_valid_handle('ab'), 'sotto i 3 caratteri non vale');
select ok(not private.is_valid_handle('a23456789012345678901'), 'oltre i 20 caratteri non vale');
select ok(not private.is_valid_handle('1luca'), 'deve iniziare con una lettera');
select ok(not private.is_valid_handle('_luca'), 'non può iniziare con underscore');
select ok(not private.is_valid_handle('luca.'), 'non finisce con il punto');
select ok(not private.is_valid_handle('luca_'), 'non finisce con underscore');
select ok(not private.is_valid_handle('lu..ca'), 'niente doppio punto');
select ok(not private.is_valid_handle('Luca'), 'le maiuscole non sono ammesse nel formato salvato');
select ok(not private.is_valid_handle('lu ca'), 'niente spazi');
select ok(not private.is_valid_handle('luca-x'), 'niente trattini');
select ok(not private.is_valid_handle('lùca'), 'niente accenti');
select ok(not private.is_valid_handle(null), 'null non è valido');

-- the table check accepts the new shape and the existing generated shape
select lives_ok($$ select generate_handle() $$, 'generate_handle resta eseguibile');
select ok(private.is_valid_handle(generate_handle()), 'gli handle generati restano validi');
select is((select count(*) from generate_series(1, 300) g where not private.is_valid_handle(generate_handle())), 0::bigint,
  'ogni handle generato rispetta la regola (max 20 caratteri)');
select is((select count(*) from private.handle_animals a, private.handle_colors c
            where char_length(a.word || '.' || c.word) > 20), 0::bigint,
  'ogni coppia animale.colore sta nei 20 caratteri');
select is((select count(*) from private.handle_animals a, private.handle_colors c
            where private.handle_blocked(a.word || '.' || c.word)), 0::bigint,
  'nessuna combinazione animale.colore finisce in blocklist');

-- ---------------------------------------------------------------- blocklist
select ok(private.handle_blocked('admin'), 'riservato: uguaglianza');
select ok(private.handle_blocked('ad.min'), 'riservato: variante con punto');
select ok(private.handle_blocked('admin_1'), 'riservato: variante con underscore e cifra');
select ok(private.handle_blocked('rightplace.milano'), 'riservato: prefisso');
select ok(private.handle_blocked('support99'), 'riservato: prefisso con cifre');
select ok(private.handle_blocked('f.u.c.k'), 'vietato: sottostringa dopo aver tolto i punti');
select ok(private.handle_blocked('mr_shit_2'), 'vietato: sottostringa tra underscore e cifre');
select ok(private.handle_blocked('luca_cazzo'), 'vietato: parola italiana');
select ok(not private.handle_blocked('lince.rosso'), 'un handle normale non è bloccato');
select ok(not private.handle_blocked('adamo'), 'ad+amo non è admin');
select ok(not private.handle_blocked('grape_juice'), 'niente falsi positivi su parole comuni');
select is((select count(*) from private.handle_blocklist where kind = 'reserved'), 13::bigint, 'tredici nomi riservati');
select cmp_ok((select count(*) from private.handle_blocklist where kind = 'banned'), '>=', 8::bigint, 'seed minimo di parole vietate');

-- ---------------------------------------------------------------- set_handle / is_handle_available
select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.blu') as b \gset
select throws_ok(format('update profiles set handle = %L where id = %L', 'Bad Handle', :'a'), '23514', null,
  'il check sulla tabella rifiuta un formato invalido');
select lives_ok(format('update profiles set handle = %L where id = %L', 'fenicottero.argento999', :'a'),
  'un vecchio handle generato oltre i 20 caratteri resta accettato dal check');
select lives_ok(format('update profiles set handle = %L where id = %L', 'lince.rosso', :'a'), 'ripristino');
select tests.authenticate_as(:'a');
select lives_ok($$ update profiles set location_opt_in = false where id = auth.uid() $$,
  'un client può ancora aggiornare le sue preferenze (il check sull''handle è eseguibile)');

select is(is_handle_available('luca_97'), 'available', 'disponibile');
select is(is_handle_available('1x'), 'invalid', 'formato invalido');
select is(is_handle_available('admin'), 'not_allowed', 'riservato');
select is(is_handle_available('Volpe.Blu'), 'taken', 'occupato, anche con le maiuscole');
select is(is_handle_available('lince.rosso'), 'available', 'il proprio handle risulta disponibile');

select throws_ok($$ select set_handle('1x') $$, 'INVALID_HANDLE', 'set_handle rifiuta il formato invalido');
select throws_ok($$ select set_handle('ad.min') $$, 'HANDLE_NOT_ALLOWED', 'set_handle rifiuta i riservati');
select throws_ok($$ select set_handle('VOLPE.blu') $$, 'HANDLE_TAKEN', 'set_handle rifiuta un handle occupato (maiuscole incluse)');
select is((select handle_changed_at from profiles where id = auth.uid()), null, 'i rifiuti non consumano il limite');

select is(set_handle('  Luca_97 '), 'luca_97', 'normalizza: trim e minuscole');
select is((select handle from profiles where id = auth.uid()), 'luca_97', 'il profilo ha il nuovo handle');
select ok((select handle_changed_at is not null from profiles where id = auth.uid()), 'il cambio è registrato');
select is(set_handle('luca_97'), 'luca_97', 'stesso handle: no-op');
select throws_ok($$ select set_handle('luca_98') $$, 'HANDLE_CHANGE_TOO_SOON', 'un secondo cambio entro 30 giorni è rifiutato');
select throws_ok($$ select regenerate_handle() $$, 'HANDLE_CHANGE_TOO_SOON', 'anche regenerate_handle rispetta i 30 giorni');

reset role;
update profiles set handle_changed_at = now() - interval '29 days' where id = :'a';
select tests.authenticate_as(:'a');
select throws_ok($$ select set_handle('luca_98') $$, 'HANDLE_CHANGE_TOO_SOON', 'dopo 29 giorni è ancora presto');

reset role;
update profiles set handle_changed_at = now() - interval '31 days' where id = :'a';
select tests.authenticate_as(:'a');
select is(set_handle('luca_98'), 'luca_98', 'dopo 31 giorni si può cambiare');
reset role;
update profiles set handle_changed_at = now() - interval '31 days' where id = :'a';
select tests.authenticate_as(:'a');
select matches(regenerate_handle(), '^[a-z]+\.[a-z]+[0-9]*$', 'regenerate_handle genera ancora animale.colore');

-- ---------------------------------------------------------------- grants
reset role;
select ok(not has_function_privilege('anon', 'public.set_handle(text)', 'execute'), 'anon non esegue set_handle');
select ok(not has_function_privilege('anon', 'public.is_handle_available(text)', 'execute'), 'anon non esegue is_handle_available');
select ok(has_function_privilege('authenticated', 'public.set_handle(text)', 'execute'), 'authenticated esegue set_handle');

select * from finish();
rollback;
