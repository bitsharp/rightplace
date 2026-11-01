begin;
\ir helpers/setup.psql
select plan(7);

-- the sign-up locale (auth metadata) seeds profiles.locale, so Auth emails use the right language
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000000e1', 'en@test.local', '{"locale": "en"}'),
       ('00000000-0000-0000-0000-0000000000e2', 'xx@test.local', '{"locale": "xx"}');
select is((select locale from profiles where id = '00000000-0000-0000-0000-0000000000e1'), 'en',
  'la lingua scelta alla registrazione finisce nel profilo');
select is((select locale from profiles where id = '00000000-0000-0000-0000-0000000000e2'), 'it',
  'una lingua non supportata ripiega su it');

select tests.create_user('lince.rosso') as a \gset
select tests.authenticate_as(:'a');
select isnt(regenerate_handle(), 'lince.rosso', 'regenerate_handle assegna un nuovo handle');
select isnt((select handle from profiles where id = auth.uid()), 'lince.rosso', 'il profilo ha il nuovo handle');
select ok((select handle_changed_at is not null from profiles where id = auth.uid()), 'il cambio è registrato');
select throws_ok($$ select regenerate_handle() $$, 'HANDLE_ALREADY_CHANGED', 'l''handle si cambia una sola volta');
select matches((select handle from profiles where id = auth.uid()), '^[a-z]+\.[a-z]+[0-9]*$', 'resta nel formato animale.colore');

select * from finish();
rollback;
