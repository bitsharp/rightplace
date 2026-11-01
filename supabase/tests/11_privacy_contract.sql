begin;
\ir helpers/setup.psql
select plan(7);

-- RLS is on for every table in public
select is(
  (select array_agg(c.relname::text order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  null, 'RLS attiva su tutte le tabelle di public');

-- No RPC exposes private data in its result columns
select is(
  (select array_agg(p.proname || '.' || arg order by p.proname) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace,
     unnest(coalesce(p.proargnames, '{}')) with ordinality a(arg, i)
   where n.nspname = 'public'
     and p.proargmodes is not null and p.proargmodes[i] in ('o', 't')
     and arg ~* '(email|birth|coarse|phone|hash|contact)'),
  null, 'nessuna RPC restituisce email, birth_date, posizione, telefono o hash');

-- Every security definer function pins its search_path and documents its privacy guarantee
select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')),
  null, 'ogni RPC security definer fissa il search_path');
select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and obj_description(p.oid, 'pg_proc') is null),
  null, 'ogni RPC security definer ha COMMENT ON FUNCTION con la garanzia di privacy');
select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')),
  null, 'nessuna RPC security definer è eseguibile da anon');
select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and has_function_privilege('authenticated', p.oid, 'execute')
      and p.proname not in ('is_blocked_pair', 'is_following', 'is_room_member', 'can_see_post')),
  null, 'i job e gli helper privati non sono eseguibili dai client');

select tests.create_user('lince.rosso') as a \gset
select tests.authenticate_as(:'a');
select throws_ok($$ select * from contact_hashes_tmp $$, '42501', null, 'le tabelle degli hash non sono leggibili dai client');

select * from finish();
rollback;
