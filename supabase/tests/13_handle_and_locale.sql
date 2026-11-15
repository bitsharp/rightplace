begin;
\ir helpers/setup.psql
select plan(8);

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
-- during onboarding the handle is free (test 27); the 30-day limit starts at confirm_handle()
select lives_ok($$ select confirm_handle() $$, 'confermare l''handle fa partire il limite');
select ok((select handle_changed_at is not null from profiles where id = auth.uid()), 'il cambio è registrato');
-- the free change after onboarding (test 28) is already used here, so the 30-day limit is what this test checks
reset role;
update profiles set handle_free_change_used = true where id = :'a';
select tests.authenticate_as(:'a');
select throws_ok($$ select regenerate_handle() $$, 'HANDLE_CHANGE_TOO_SOON', 'l''handle si cambia al massimo una volta ogni 30 giorni');
select matches((select handle from profiles where id = auth.uid()), '^[a-z]+\.[a-z]+[0-9]*$', 'resta nel formato animale.colore');

select * from finish();
rollback;
