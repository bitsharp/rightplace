begin;
\ir helpers/setup.psql
select plan(13);

select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola', 22, 'female') as b \gset
select tests.create_user('volpe.nera', 40, 'male') as blocked_user \gset
select tests.make_venue('Test Club') as v \gset
select tests.make_declaration(:'b', :'v', 'going');
insert into blocks (blocker_id, blocked_id) values (:'blocked_user', :'a');

select tests.authenticate_as(:'a');
select is((select count(*)::int from search_users('volpe')), 1, 'i bloccati non compaiono nella ricerca');
select results_eq($$ select handle, age_band, gender, is_creator from search_users('volpe') $$,
  $$ values ('volpe.viola'::text, '18-24'::text, 'female'::text, false) $$,
  'di un estraneo si vedono solo handle, fascia, genere e is_creator');
select is((select follow_state from search_users('volpe')), 'none', 'follow_state none per un estraneo');
select is((select tonight_venue_id from search_users('volpe')), null, 'nessun locale per un estraneo');
select is((select follows_me from search_users('volpe')), false, 'follows_me falso');

select request_follow(:'b');
select is((select follow_state from search_users('volpe')), 'pending', 'dopo request_follow lo stato è pending');
select is((select tonight_venue_id from search_users('volpe')), null, 'con la richiesta pending ancora nessun locale');

reset role;
select tests.authenticate_as(:'b');
select accept_follow(:'a');
select is((select follows_me from search_users('lince')), true, 'B vede che A lo segue (follow accettato)');
select is((select tonight_venue_id from search_users('lince')), null, 'B non segue A, quindi non vede il locale di A');

reset role;
select tests.authenticate_as(:'a');
select is((select follow_state from search_users('volpe')), 'accepted', 'dopo accept_follow lo stato è accepted');
select is((select tonight_venue_id from search_users('volpe')), :'v'::uuid, 'con follow accettato si vede il locale di stasera');
select is((select tonight_venue_name from search_users('volpe')), 'Test Club', 'e il suo nome');
select is((select count(*)::int from search_users('lince')), 0, 'la ricerca non restituisce me stesso');

select * from finish();
rollback;
